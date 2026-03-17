"use server";

import connectDB from "@/lib/mongodb";
import Assignment from "@/models/Assignment";
import Course from "@/models/Course";
import User from "@/models/User";
import GoogleConnection from "@/models/GoogleConnection";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getDashboardMeta() {
  const session = await getSession();
  if (!session) return { googleConnected: false, lastCheckedAt: null as Date | null };

  await connectDB();
  const [conn, user] = await Promise.all([
    GoogleConnection.findOne({ userId: session.id }).lean(),
    User.findById(session.id).lean(),
  ]);
  return {
    googleConnected: !!conn,
    lastCheckedAt: user?.lastCheckedAt ?? null,
    lastSyncAt: conn?.lastSyncAt ?? null,
  };
}

export async function getCalendarEvents(year?: number, month?: number) {
  const session = await getSession();
  if (!session) return [];

  await connectDB();
  const y = year ?? new Date().getFullYear();
  const m = month ?? new Date().getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0, 23, 59, 59);

  const assignments = await Assignment.find({
    userId: session.id,
    localCompleted: { $ne: true },
    turnedIn: { $ne: true },
    $or: [
      { officialDueDate: { $gte: start, $lte: end } },
      { inferredDueDate: { $gte: start, $lte: end } },
    ],
  })
    .populate("courseId", "name")
    .lean();

  return assignments.flatMap((a) => {
    const date = a.officialDueDate ?? a.inferredDueDate;
    if (!date) return [];
    return [
      {
        _id: a._id.toString(),
        title: a.title,
        courseName: (a.courseId as { name?: string })?.name ?? "Unknown",
        date,
        source: (a.officialDueDate ? "official" : "inferred") as "official" | "inferred",
        itemType: a.itemType ?? "assignment",
      },
    ];
  });
}

export async function getAssignmentsForDashboard(sortMode?: string) {
  const session = await getSession();
  if (!session)
    return {
      assignments: [],
      courses: [],
      stats: { total: 0, overdue: 0, highPriority: 0, conflicts: 0 },
      error: "Unauthorized",
    };

  await connectDB();

  const assignments = await Assignment.find({
    userId: session.id,
    localCompleted: { $ne: true },
    turnedIn: { $ne: true },
  })
    .sort({ finalPriorityScore: -1 })
    .lean();

  const courseIds = [...new Set(assignments.map((a) => a.courseId?.toString()).filter(Boolean))];
  const courses = await Course.find({ _id: { $in: courseIds } })
    .lean()
    .then((docs) => {
      const map: Record<string, { name: string }> = {};
      for (const c of docs) {
        map[c._id.toString()] = { name: c.name };
      }
      return map;
    });

  const withCourse = assignments.map((a) => ({
    ...a,
    _id: a._id.toString(),
    courseName: a.courseId ? courses[a.courseId.toString()]?.name ?? "Unknown" : "Unknown",
  }));

  const now = new Date();
  // Apply sort mode
  let sorted = withCourse;
  if (sortMode) {
    switch (sortMode) {
      case "due-soonest":
        sorted = [...withCourse].sort((a, b) => {
          const da = a.officialDueDate ?? a.inferredDueDate ?? new Date(0);
          const db = b.officialDueDate ?? b.inferredDueDate ?? new Date(0);
          return new Date(da).getTime() - new Date(db).getTime();
        });
        break;
      case "most-important":
        sorted = [...withCourse].sort((a, b) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0));
        break;
      case "easiest-first":
        sorted = [...withCourse].sort((a, b) => (b.easyScore ?? 0) - (a.easyScore ?? 0));
        break;
      case "hardest-first":
        sorted = [...withCourse].sort((a, b) => (a.estimatedDifficulty ?? 0) - (b.estimatedDifficulty ?? 0));
        break;
      case "shortest-first":
        sorted = [...withCourse].sort((a, b) => (a.estimatedEffort ?? 99) - (b.estimatedEffort ?? 99));
        break;
      default:
        // AI Recommended - use finalPriorityScore
        sorted = [...withCourse].sort((a, b) => (b.finalPriorityScore ?? 0) - (a.finalPriorityScore ?? 0));
    }
  }

  const stats = {
    total: sorted.length,
    overdue: sorted.filter((a) => {
      const d = a.officialDueDate ?? a.inferredDueDate;
      return d && new Date(d) < now;
    }).length,
    highPriority: sorted.filter((a) => (a.urgencyScore ?? 0) >= 0.7).length,
    conflicts: sorted.filter((a) => a.dueDateConflict).length,
  };

  return { assignments: sorted, courses, stats, error: null };
}

export async function markAssignmentComplete(assignmentId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await connectDB();
  await Assignment.updateOne(
    { _id: assignmentId, userId: session.id },
    { $set: { localCompleted: true } }
  );
  revalidatePath("/dashboard");
  revalidatePath("/workspace");
  return { success: true };
}

export async function skipAssignment(assignmentId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized", nextId: null };

  await connectDB();
  const all = await Assignment.find({
    userId: session.id,
    localCompleted: { $ne: true },
    turnedIn: { $ne: true },
    _id: { $ne: assignmentId },
  })
    .sort({ finalPriorityScore: -1 })
    .limit(1)
    .lean();

  revalidatePath("/dashboard");
  return { success: true, nextId: all[0]?._id?.toString() ?? null };
}

export async function skipAssignmentAction(assignmentId: string) {
  const result = await skipAssignment(assignmentId);
  return result.nextId;
}
