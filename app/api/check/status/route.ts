import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import CheckJob from "@/models/CheckJob";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  await connectDB();
  const job = await CheckJob.findOne({
    _id: jobId,
    userId: session.id,
  }).lean();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job._id.toString(),
    status: job.status,
    progress: job.progress,
    progressStage: job.progressStage,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
    coursesProcessed: job.coursesProcessed,
    assignmentsProcessed: job.assignmentsProcessed,
    filesProcessed: job.filesProcessed,
    progressStage: job.progressStage,
    documentsReadCount: job.documentsReadCount,
    assignmentsFoundCount: job.assignmentsFoundCount,
    pastDueCount: job.pastDueCount,
    futureDueCount: job.futureDueCount,
    testsAndQuizzesCount: job.testsAndQuizzesCount,
    hiddenDeadlinesFoundCount: job.hiddenDeadlinesFoundCount,
    dueDateConflictsFoundCount: job.dueDateConflictsFoundCount,
    classesProcessedCount: job.classesProcessedCount,
    uploadedFilesProcessedCount: job.uploadedFilesProcessedCount,
    memoryUpdated: job.memoryUpdated,
    syncedAt: job.syncedAt,
  });
}
