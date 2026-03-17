import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Assignment from "@/models/Assignment";
import Course from "@/models/Course";
import CourseContext from "@/models/CourseContext";
import UserPreference from "@/models/UserPreference";
import { generateChatResponse } from "@/lib/ai/provider";

/**
 * POST /api/ai/help
 * Evidence-driven AI help for an assignment.
 * Body: { assignmentId: string, message: string }
 * Returns AI response using synced evidence. Never gives generic fallbacks when evidence exists.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { assignmentId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { assignmentId, message } = body;
  if (!assignmentId || !message || typeof message !== "string") {
    return NextResponse.json(
      { error: "assignmentId and message are required" },
      { status: 400 }
    );
  }

  await connectDB();

  const assignment = await Assignment.findOne({
    _id: assignmentId,
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

  const prefs = await UserPreference.findOne({ userId: session.id }).lean();
  const baseUrl = prefs?.localModelBaseUrl ?? "http://localhost:11434";
  const modelName = prefs?.modelName ?? "deepseek-r1:7b";

  const context = {
    assignmentTitle: assignment.title,
    courseName: course?.name ?? "Unknown",
    teacherIntent: assignment.teacherIntentSummary ?? undefined,
    requirements:
      assignment.whatYouNeedToDo ?? assignment.extractedRequirements ?? [],
    firstStep: assignment.firstStep ?? undefined,
    classContext: courseContext?.aiClassSummary ?? undefined,
    description: assignment.description ?? undefined,
    aiDescription: assignment.aiDescription ?? undefined,
    whatYouNeedToDo: assignment.whatYouNeedToDo ?? undefined,
    helpfulTips: assignment.helpfulTips ?? undefined,
    talkingPoints: assignment.talkingPoints ?? undefined,
    aiNotes: assignment.aiNotes ?? undefined,
    evidenceUsed: assignment.evidenceUsed ?? undefined,
    officialDueDate: assignment.officialDueDate?.toISOString(),
    inferredDueDate: assignment.inferredDueDate?.toISOString(),
    dueDateStatus: assignment.dueDateStatus ?? undefined,
    wrongDateConclusion: assignment.wrongDateConclusion ?? undefined,
  };

  try {
    const reply = await generateChatResponse({
      message,
      context,
      modelName,
      baseUrl,
    });
    return NextResponse.json({ reply: reply ?? "" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI help failed";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
