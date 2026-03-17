"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  SkipForward,
  MessageCircle,
  AlertTriangle,
  Calendar,
  Lightbulb,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { markAssignmentComplete, skipAssignmentAction } from "@/app/actions/assignments";
import WorkspaceChat from "./WorkspaceChat";

const ITEM_TYPE_LABELS: Record<string, string> = {
  assignment: "Assignment",
  quiz: "Quiz",
  test: "Test",
  reading: "Reading",
  project: "Project",
  study_task: "Study Task",
  hidden_deadline: "Hidden Deadline",
};

interface AssignmentWorkspaceProps {
  assignment: {
    _id: string;
    courseId: string;
    title: string;
    itemType?: string;
    description?: string;
    officialDueDate?: string | Date | null;
    inferredDueDate?: string | Date | null;
    dueDateConflict?: boolean;
    dueDateConflictReason?: string | null;
    alternateLink?: string | null;
    teacherIntentSummary?: string | null;
    extractedRequirements?: string[];
    firstStep?: string | null;
    aiSummary?: string | null;
    relatedClassContext?: string | string[] | null;
    estimatedDifficulty?: number | string | null;
    estimatedEffort?: number | string | null;
    materials?: Array<{ title?: string; link?: string }>;
    sourceLinks?: string[];
  };
  course: {
    _id: string;
    name: string;
    section?: string;
    teacherName?: string;
  } | null;
  courseContext: {
    activeUnit?: string;
    recentTopics?: string[];
    importantTerms?: string[];
    aiClassSummary?: string;
  } | null;
}

function NoteSection({
  title,
  children,
  icon: Icon,
  highlight,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  if (!children) return null;
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="prose prose-sm dark:prose-invert max-w-none text-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

export default function AssignmentWorkspace({
  assignment,
  course,
  courseContext,
}: AssignmentWorkspaceProps) {
  const router = useRouter();
  const addToast = useToast();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const formatDate = (d: string | Date | null | undefined) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleMarkComplete = async () => {
    setIsCompleting(true);
    try {
      await markAssignmentComplete(assignment._id);
      addToast("Assignment marked complete!");
      router.push("/dashboard");
    } catch {
      addToast("Failed to mark complete", "destructive");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      const next = await skipAssignmentAction(assignment._id);
      addToast("Skipped for now");
      if (next) router.push(`/workspace/${next}`);
      else router.push("/dashboard");
    } catch {
      addToast("Something went wrong", "destructive");
    } finally {
      setIsSkipping(false);
    }
  };

  const talkingPoints = courseContext?.importantTerms?.length
    ? courseContext.importantTerms
    : courseContext?.recentTopics;

  return (
    <div className="min-h-screen bg-muted/30 font-sans">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSkip} disabled={isSkipping}>
              <SkipForward className="mr-1 h-4 w-4" />
              Skip for Now
            </Button>
            <Button size="sm" onClick={handleMarkComplete} disabled={isCompleting}>
              <Check className="mr-1 h-4 w-4" />
              Mark Complete
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* 1. Title / class / badges */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{assignment.title}</h1>
              <p className="mt-1 text-muted-foreground">
                {course?.name}
                {course?.section && ` · ${course.section}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {assignment.itemType && ITEM_TYPE_LABELS[assignment.itemType] && (
                  <Badge variant="outline">{ITEM_TYPE_LABELS[assignment.itemType]}</Badge>
                )}
                {assignment.dueDateConflict && (
                  <Badge variant="destructive">Date conflict</Badge>
                )}
              </div>
            </div>

            {/* 2. Teacher Description */}
            <NoteSection title="Teacher Description" icon={FileText}>
              {assignment.description ? (
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {assignment.description}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
            </NoteSection>

            {/* 3. AI Assignment Breakdown */}
            <NoteSection title="AI Assignment Breakdown" icon={Lightbulb}>
              {assignment.teacherIntentSummary ? (
                <p className="text-sm">{assignment.teacherIntentSummary}</p>
              ) : null}
            </NoteSection>

            {/* 4. What You Need To Do */}
            <NoteSection title="What You Need To Do" icon={Check}>
              {assignment.extractedRequirements && assignment.extractedRequirements.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {assignment.extractedRequirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : null}
            </NoteSection>

            {/* 5. Best Guess About Due Date */}
            <NoteSection title="Best Guess About Due Date" icon={Calendar}>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Official: </span>
                  {formatDate(assignment.officialDueDate) ?? "Not set"}
                </div>
                {assignment.inferredDueDate && (
                  <div>
                    <span className="text-muted-foreground">Inferred: </span>
                    {formatDate(assignment.inferredDueDate)}
                  </div>
                )}
                {assignment.dueDateConflict && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Due date conflict
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.dueDateConflictReason ??
                          "Official and inferred dates differ"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </NoteSection>

            {/* 6. Helpful Tips */}
            <NoteSection title="Helpful Tips">
              {courseContext?.aiClassSummary || courseContext?.activeUnit ? (
                <div className="space-y-2 text-sm">
                  {courseContext.aiClassSummary && <p>{courseContext.aiClassSummary}</p>}
                  {courseContext.activeUnit && (
                    <p>
                      <strong>Active unit:</strong> {courseContext.activeUnit}
                    </p>
                  )}
                </div>
              ) : null}
            </NoteSection>

            {/* 7. Talking Points / What To Mention */}
            <NoteSection title="Talking Points / What To Mention">
              {talkingPoints && talkingPoints.length > 0 ? (
                <p className="text-sm">
                  {Array.isArray(talkingPoints)
                    ? talkingPoints.join(", ")
                    : talkingPoints}
                </p>
              ) : null}
            </NoteSection>

            {/* 8. First Step */}
            <NoteSection title="First Step" highlight>
              {assignment.firstStep ? (
                <p className="text-sm font-medium">{assignment.firstStep}</p>
              ) : null}
            </NoteSection>

            {/* 9. AI Notes */}
            <NoteSection title="AI Notes">
              {assignment.aiSummary ? (
                <p className="text-sm text-muted-foreground">{assignment.aiSummary}</p>
              ) : assignment.relatedClassContext ? (
                <p className="text-sm text-muted-foreground">
                  {assignment.relatedClassContext}
                </p>
              ) : null}
            </NoteSection>

            {/* 10. Evidence Used */}
            <NoteSection title="Evidence Used" icon={FileText}>
              {(assignment.materials?.length || assignment.sourceLinks?.length) ? (
                <div className="space-y-2 text-sm">
                  {assignment.materials?.map((m, i) => (
                    <div key={i}>
                      {m.link ? (
                        <a
                          href={m.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {m.title || "Document"} <ExternalLink className="inline h-3 w-3" />
                        </a>
                      ) : (
                        <span>{m.title || "Document"}</span>
                      )}
                    </div>
                  ))}
                  {assignment.sourceLinks
                    ?.filter(
                      (link) =>
                        !assignment.materials?.some((m) => m.link === link)
                    )
                    .map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-primary hover:underline"
                      >
                        {link} <ExternalLink className="inline h-3 w-3" />
                      </a>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No linked materials.</p>
              )}
            </NoteSection>

            {assignment.alternateLink && (
              <a href={assignment.alternateLink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Original Post
                </Button>
              </a>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-4 w-4" />
                  Ask for help
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Get assignment-specific guidance from ClassPilot.
                </p>
              </CardHeader>
              <CardContent>
                <WorkspaceChat
                  assignmentId={assignment._id}
                  assignmentTitle={assignment.title}
                  courseName={course?.name ?? "Unknown"}
                  teacherIntent={assignment.teacherIntentSummary}
                  requirements={assignment.extractedRequirements}
                  firstStep={assignment.firstStep}
                  classContext={courseContext?.aiClassSummary}
                  description={assignment.description}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
