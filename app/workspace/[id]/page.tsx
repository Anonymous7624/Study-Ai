import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import Assignment from "@/models/Assignment";
import Course from "@/models/Course";
import CourseContext from "@/models/CourseContext";
import AssignmentWorkspace from "./AssignmentWorkspace";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  await connectDB();

  const assignment = await Assignment.findOne({
    _id: id,
    userId: session.id,
  })
    .lean()
    .exec();

  if (!assignment) redirect("/dashboard");

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

  const assignmentForClient = {
    _id: assignment._id.toString(),
    courseId: assignment.courseId.toString(),
    title: assignment.title,
    description: assignment.description,
    officialDueDate: assignment.officialDueDate?.toISOString() ?? null,
    inferredDueDate: assignment.inferredDueDate?.toISOString() ?? null,
    dueDateConflict: assignment.dueDateConflict,
    dueDateConflictReason: assignment.dueDateConflictReason,
    alternateLink: assignment.alternateLink,
    teacherIntentSummary: assignment.teacherIntentSummary,
    extractedRequirements: assignment.extractedRequirements,
    firstStep: assignment.firstStep,
    aiSummary: assignment.aiSummary,
    relatedClassContext: Array.isArray(assignment.relatedClassContext)
      ? assignment.relatedClassContext.join(", ")
      : assignment.relatedClassContext ?? null,
    estimatedDifficulty: assignment.estimatedDifficulty,
    estimatedEffort: assignment.estimatedEffort,
  };

  return (
    <AssignmentWorkspace
      assignment={assignmentForClient}
      course={course ? { ...course, _id: course._id.toString() } : null}
      courseContext={
        courseContext
          ? {
              activeUnit: courseContext.activeUnit,
              recentTopics: courseContext.recentTopics,
              importantTerms: courseContext.importantTerms,
              aiClassSummary: courseContext.aiClassSummary,
            }
          : null
      }
    />
  );
}
