import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Assignment from "@/models/Assignment";
import Course from "@/models/Course";
import CourseContext from "@/models/CourseContext";

/**
 * GET /api/assignments/[id]
 * Returns assignment with full study notes (user-facing fields only).
 * Internal AI context is excluded.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Assignment ID required" }, { status: 400 });
  }

  await connectDB();

  const assignment = await Assignment.findOne({
    _id: id,
    userId: session.id,
  })
    .lean()
    .exec();

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const course = await Course.findOne({
    _id: assignment.courseId,
    userId: session.id,
  })
    .lean()
    .exec();

  const courseContext = await CourseContext.findOne({
    courseId: assignment.courseId,
    userId: session.id,
  })
    .lean()
    .exec();

  // User-facing fields only (no internal AI context)
  const response = {
    id: assignment._id.toString(),
    courseId: assignment.courseId?.toString(),
    courseName: course?.name ?? "Unknown",
    title: assignment.title,
    description: assignment.description,
    officialDueDate: assignment.officialDueDate?.toISOString() ?? null,
    inferredDueDate: assignment.inferredDueDate?.toISOString() ?? null,
    dueDateConflict: assignment.dueDateConflict,
    dueDateConflictReason: assignment.dueDateConflictReason,
    dueDateStatus: assignment.dueDateStatus,
    wrongDateConclusion: assignment.wrongDateConclusion,
    itemType: assignment.itemType,
    aiDescription: assignment.aiDescription,
    whatYouNeedToDo: assignment.whatYouNeedToDo,
    helpfulTips: assignment.helpfulTips,
    talkingPoints: assignment.talkingPoints,
    firstStep: assignment.firstStep,
    aiNotes: assignment.aiNotes,
    evidenceUsed: assignment.evidenceUsed,
    priorityReason: assignment.priorityReason,
    alternateLink: assignment.alternateLink,
    status: assignment.status,
    courseContext: courseContext
      ? {
          activeUnit: courseContext.activeUnit,
          recentTopics: courseContext.recentTopics,
          importantTerms: courseContext.importantTerms,
          aiClassSummary: courseContext.aiClassSummary,
          likelyTeacherRules: courseContext.likelyTeacherRules,
        }
      : null,
  };

  return NextResponse.json(response);
}
