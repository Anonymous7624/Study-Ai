/**
 * Run Check orchestrator.
 * Pulls Google data, parses deadlines, updates memory, re-ranks assignments.
 */

import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import Course from "@/models/Course";
import Assignment from "@/models/Assignment";
import Post from "@/models/Post";
import CourseContext from "@/models/CourseContext";
import User from "@/models/User";
import UserFile from "@/models/UserFile";
import CheckJob from "@/models/CheckJob";
import GoogleConnection from "@/models/GoogleConnection";
import { refreshAccessToken } from "@/lib/google/auth";
import {
  listCourses,
  listCoursework,
  listAnnouncements,
  type ClassroomCourseWork,
  type ClassroomAnnouncement,
} from "@/lib/google/classroom";
import {
  getFileMetadata,
  downloadFileContent,
  exportGoogleDoc,
  exportGoogleSlides,
} from "@/lib/google/drive";
import { getDocumentContent } from "@/lib/google/docs";
import { extractDeadlines } from "@/lib/parsers/deadlines";
import { extractTextFromFile, inferItemTypeFromTitle } from "@/lib/parsers/files";
import { buildCourseContextFromData } from "@/lib/context-builder";
import { rankAssignments } from "@/lib/priority-engine";
import type { ItemType } from "@/models/Assignment";

const MANUAL_COURSE_ID = "__manual__";

export interface RunCheckOptions {
  jobId?: string;
  onProgress?: (progress: string) => void;
}

export async function runCheck(
  userId: string,
  options: RunCheckOptions = {}
): Promise<{ success: boolean; error?: string; jobId?: string }> {
  await connectDB();
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const conn = await GoogleConnection.findOne({ userId: userObjectId }).lean();
  if (!conn) {
    return { success: false, error: "Google not connected" };
  }

  let accessToken = conn.accessToken;
  if (new Date(conn.expiresAt) <= new Date()) {
    const refreshed = await refreshAccessToken(conn.refreshToken);
    accessToken = refreshed.access_token;
    await GoogleConnection.updateOne(
      { userId: userObjectId },
      {
        $set: {
          accessToken: refreshed.access_token,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      }
    );
  }

  const job = options.jobId
    ? await CheckJob.findById(options.jobId)
    : await CheckJob.create({
        userId: userObjectId,
        status: "running",
        startedAt: new Date(),
      });
  if (!job) return { success: false, error: "Check job not found" };

  const updateProgress = (msg: string) => {
    options.onProgress?.(msg);
    void CheckJob.updateOne(
      { _id: job._id },
      { $set: { progress: msg, updatedAt: new Date() } }
    );
  };

  try {
    await CheckJob.updateOne(
      { _id: job._id },
      { $set: { status: "running", progress: "Starting...", updatedAt: new Date() } }
    );

    const courseMap = new Map<string, mongoose.Types.ObjectId>();
    let coursesProcessed = 0;
    let assignmentsProcessed = 0;
    let filesProcessed = 0;

    // Ensure manual uploads course exists
    const manualCourse = await Course.findOneAndUpdate(
      { userId: userObjectId, classroomCourseId: MANUAL_COURSE_ID },
      {
        userId: userObjectId,
        classroomCourseId: MANUAL_COURSE_ID,
        name: "Manual Uploads",
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    courseMap.set(MANUAL_COURSE_ID, manualCourse._id);

    // 1. Pull Google Classroom data
    updateProgress("Fetching Google Classroom courses...");
    const classroomCourses = await listCourses(accessToken);
    const topicMap = new Map<string, string>();

    for (const gc of classroomCourses) {
      const course = await Course.findOneAndUpdate(
        { userId: userObjectId, classroomCourseId: gc.id },
        {
          userId: userObjectId,
          classroomCourseId: gc.id,
          name: gc.name,
          section: gc.section,
          alternateLink: gc.alternateLink,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      courseMap.set(gc.id, course._id);

      // Sync coursework
      updateProgress(`Syncing ${gc.name}...`);
      const coursework = await listCoursework(accessToken, gc.id);
      for (const cw of coursework) {
        const dueDate = cw.dueDate
          ? new Date(cw.dueDate.year, cw.dueDate.month - 1, cw.dueDate.day)
          : undefined;

        const itemType = mapWorkTypeToItemType(cw.workType) ?? inferItemTypeFromTitle(cw.title) ?? "assignment";
        const combinedText = [cw.title, cw.description].filter(Boolean).join("\n");
        const extractedFromText = extractDeadlines(combinedText);

        let inferredDue: Date | undefined;
        let inferredConfidence: "high" | "medium" | "low" | undefined;
        let dueDateConflict = false;
        let dueDateConflictReason: string | undefined;
        const extractedDeadlinesArr = extractedFromText.map((e) => ({
          date: e.date,
          source: e.source,
          confidence: e.confidence,
        }));

        if (extractedFromText.length > 0) {
          const best = extractedFromText[0];
          inferredDue = best.date;
          inferredConfidence = best.confidence;
          if (dueDate && inferredDue && Math.abs(dueDate.getTime() - inferredDue.getTime()) > 24 * 60 * 60 * 1000) {
            dueDateConflict = true;
            dueDateConflictReason = `Official due ${dueDate.toLocaleDateString()} vs inferred ${inferredDue.toLocaleDateString()} from "${best.rawText ?? "text"}"`;
          }
        }
        if (!inferredDue && extractedFromText.length > 1) {
          inferredDue = extractedFromText[0].date;
          inferredConfidence = extractedFromText[0].confidence;
        }

        // Fetch material text for more deadline extraction
        const materialsWithText: Array<{ title?: string; link?: string; driveFileId?: string; contentType?: string; extractedText?: string }> = [];
        if (cw.materials) {
          for (const m of cw.materials) {
            const driveFile = m.driveFile?.driveFile;
            if (driveFile?.id) {
              const meta = await getFileMetadata(driveFile.id, accessToken);
              if (meta) {
                let text = "";
                const mime = meta.mimeType || "";
                if (mime.includes("document") || mime.includes("application/vnd.google-apps.document")) {
                  text = (await exportGoogleDoc(driveFile.id, accessToken)) ?? (await getDocumentContent(driveFile.id, accessToken)) ?? "";
                } else if (mime.includes("presentation") || mime.includes("application/vnd.google-apps.presentation")) {
                  text = (await exportGoogleSlides(driveFile.id, accessToken)) ?? "";
                } else if (mime.includes("pdf") || mime === "application/pdf") {
                  const buf = await downloadFileContent(driveFile.id, accessToken);
                  if (buf) {
                    const pdfParse = (await import("pdf-parse")).default;
                    const data = await pdfParse(buf);
                    text = data.text || "";
                  }
                }
                if (text) {
                  const moreDeadlines = extractDeadlines(text);
                  for (const d of moreDeadlines) {
                    if (!extractedDeadlinesArr.some((e) => e.date.getTime() === d.date.getTime())) {
                      extractedDeadlinesArr.push({ date: d.date, source: `attachment:${meta.name}`, confidence: d.confidence });
                    }
                    if (!inferredDue || d.confidence === "high") {
                      inferredDue = d.date;
                      inferredConfidence = d.confidence;
                    }
                  }
                }
                materialsWithText.push({
                  title: meta.name,
                  link: meta.webViewLink,
                  driveFileId: driveFile.id,
                  contentType: mime,
                  extractedText: text || undefined,
                });
                filesProcessed++;
              }
            }
          }
        }

        const sourceLinks: string[] = [cw.alternateLink].filter(Boolean) as string[];
        for (const m of materialsWithText) {
          if (m.link) sourceLinks.push(m.link);
        }

        await Assignment.findOneAndUpdate(
          {
            userId: userObjectId,
            courseId: course._id,
            classroomAssignmentId: cw.id,
          },
          {
            userId: userObjectId,
            courseId: course._id,
            classroomAssignmentId: cw.id,
            itemType,
            title: cw.title,
            description: cw.description,
            officialDueDate: dueDate,
            inferredDueDate: inferredDue,
            inferredDueDateConfidence: inferredConfidence,
            dueDateConflict,
            dueDateConflictReason,
            extractedDeadlines: extractedDeadlinesArr.length > 0 ? extractedDeadlinesArr : undefined,
            alternateLink: cw.alternateLink,
            materials: materialsWithText.length > 0 ? materialsWithText : undefined,
            sourceLinks: sourceLinks.length > 0 ? sourceLinks : undefined,
            status: "published",
          },
          { upsert: true }
        );
        assignmentsProcessed++;
      }
      coursesProcessed++;

      // Sync announcements and extract deadlines
      const announcements = await listAnnouncements(accessToken, gc.id);
      for (const ann of announcements) {
        const annDeadlines = ann.text ? extractDeadlines(ann.text) : [];
        await Post.findOneAndUpdate(
          {
            userId: userObjectId,
            courseId: course._id,
            classroomPostId: ann.id,
          },
          {
            userId: userObjectId,
            courseId: course._id,
            classroomPostId: ann.id,
            type: "announcement",
            text: ann.text,
            alternateLink: ann.alternateLink,
            extractedDates: annDeadlines.map((d) => ({ date: d.date, source: d.source, confidence: d.confidence })),
          },
          { upsert: true }
        );
      }
    }

    // 2. Process manual uploads
    updateProgress("Processing uploaded files...");
    const userFiles = await UserFile.find({ userId: userObjectId }).lean();
    for (const uf of userFiles) {
      let text = uf.extractedText;
      if (!text) {
        text = await extractTextFromFile(uf.storagePath, uf.mimeType, uf.originalName);
        if (text) {
          await UserFile.updateOne({ _id: uf._id }, { $set: { extractedText: text } });
        }
      }
      if (text) {
        const deadlines = extractDeadlines(text);
        const itemType = inferItemTypeFromTitle(uf.originalName) ?? "assignment";
        const manualAssignmentId = `__manual__${uf._id}`;
        const inferredDue = deadlines[0]?.date;
        const extractedDeadlinesArr = deadlines.map((d) => ({
          date: d.date,
          source: `uploaded:${uf.originalName}`,
          confidence: d.confidence,
        }));
        await Assignment.findOneAndUpdate(
          {
            userId: userObjectId,
            courseId: manualCourse._id,
            classroomAssignmentId: manualAssignmentId,
          },
          {
            userId: userObjectId,
            courseId: manualCourse._id,
            classroomAssignmentId: manualAssignmentId,
            itemType,
            title: uf.originalName,
            description: `From uploaded file: ${uf.originalName}`,
            inferredDueDate: inferredDue,
            inferredDueDateConfidence: deadlines[0]?.confidence,
            dueDateConflict: false,
            extractedDeadlines: extractedDeadlinesArr.length > 0 ? extractedDeadlinesArr : undefined,
            sourceLinks: [],
            status: "published",
          },
          { upsert: true }
        );
        assignmentsProcessed++;
        filesProcessed++;
      }
    }

    // 3. Update course context (memory)
    updateProgress("Updating course context...");
    for (const [courseId, courseObjId] of courseMap) {
      if (courseId === MANUAL_COURSE_ID) continue;
      const assignments = await Assignment.find({ userId: userObjectId, courseId: courseObjId }).lean();
      const posts = await Post.find({ userId: userObjectId, courseId: courseObjId }).lean();
      const course = await Course.findById(courseObjId).lean();
      if (course) {
        const context = buildCourseContextFromData(
          course as { currentUnitSummary?: string; name?: string },
          assignments as Parameters<typeof buildCourseContextFromData>[1],
          posts as Parameters<typeof buildCourseContextFromData>[2]
        );
        await CourseContext.findOneAndUpdate(
          { userId: userObjectId, courseId: courseObjId },
          { $set: { ...context, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    }

    // 4. Compute priority scores and re-rank
    updateProgress("Computing priorities...");
    const allAssignments = await Assignment.find({
      userId: userObjectId,
      localCompleted: { $ne: true },
      turnedIn: { $ne: true },
    }).lean();

    const scored = allAssignments.map((a) => {
      const urgency = computeUrgencyScore(a);
      const importance = computeImportanceScore(a);
      const easy = computeEasyScore(a);
      const final = (urgency * 0.4 + importance * 0.4 + easy * 0.2);
      const reason = buildPriorityReason(a, urgency, importance);
      return { ...a, urgencyScore: urgency, importanceScore: importance, easyScore: easy, finalPriorityScore: final, priorityReason: reason };
    });

    const ranked = rankAssignments(scored, "ai-recommended");

    for (let i = 0; i < ranked.length; i++) {
      const a = ranked[i] as (typeof ranked[0]) & { _id: mongoose.Types.ObjectId };
      await Assignment.updateOne(
        { _id: a._id },
        {
          $set: {
            urgencyScore: a.urgencyScore,
            importanceScore: a.importanceScore,
            easyScore: a.easyScore,
            finalPriorityScore: a.finalPriorityScore,
            priorityReason: a.priorityReason,
          },
        }
      );
    }

    // 5. Mark job complete, update user lastCheckedAt
    await CheckJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          progress: "Done",
          coursesProcessed,
          assignmentsProcessed,
          filesProcessed,
          updatedAt: new Date(),
        },
      }
    );
    await User.updateOne(
      { _id: userObjectId },
      { $set: { lastCheckedAt: new Date() } }
    );
    await GoogleConnection.updateOne(
      { userId: userObjectId },
      { $set: { lastSyncAt: new Date() } }
    );

    return { success: true, jobId: job._id.toString() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Run Check failed";
    await CheckJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "failed",
          completedAt: new Date(),
          error: msg,
          updatedAt: new Date(),
        },
      }
    );
    return { success: false, error: msg, jobId: job._id.toString() };
  }
}

function mapWorkTypeToItemType(workType?: string): ItemType | null {
  if (!workType) return null;
  switch (workType) {
    case "SHORT_ANSWER_QUESTION":
    case "MULTIPLE_CHOICE_QUESTION":
      return "quiz";
    default:
      return null;
  }
}

function computeUrgencyScore(a: { officialDueDate?: Date; inferredDueDate?: Date; dueDateConflict?: boolean }): number {
  const d = a.officialDueDate ?? a.inferredDueDate;
  if (!d) return 0.3;
  const now = new Date();
  const diffDays = (new Date(d).getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (diffDays < 0) return 1;
  if (diffDays <= 1) return 0.95;
  if (diffDays <= 3) return 0.8;
  if (diffDays <= 7) return 0.6;
  return 0.4;
}

function computeImportanceScore(a: { itemType?: string; dueDateConflict?: boolean }): number {
  let s = 0.5;
  if (a.itemType === "test" || a.itemType === "quiz") s += 0.3;
  if (a.itemType === "project") s += 0.2;
  if (a.dueDateConflict) s += 0.2;
  return Math.min(1, s);
}

function computeEasyScore(a: { estimatedDifficulty?: number; estimatedEffort?: number }): number {
  const diff = a.estimatedDifficulty ?? 0.5;
  const effort = a.estimatedEffort ?? 0.5;
  return (1 - diff) * 0.6 + (1 - effort) * 0.4;
}

function buildPriorityReason(
  a: { officialDueDate?: Date; inferredDueDate?: Date; itemType?: string; dueDateConflict?: boolean },
  urgency: number,
  importance: number
): string {
  const parts: string[] = [];
  const d = a.officialDueDate ?? a.inferredDueDate;
  if (d) {
    const diffDays = Math.ceil((new Date(d).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) parts.push("Overdue");
    else if (diffDays <= 1) parts.push("Due very soon");
    else if (diffDays <= 3) parts.push("Due in a few days");
  }
  if (a.itemType === "test" || a.itemType === "quiz") parts.push("Assessment");
  if (a.dueDateConflict) parts.push("Date conflict - verify deadline");
  if (importance >= 0.8) parts.push("High importance");
  return parts.length > 0 ? parts.join(". ") : "Ready to work on";
}
