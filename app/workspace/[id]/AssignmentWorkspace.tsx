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
    aiDescription?: string | null;
    whatYouNeedToDo?: string[] | null;
    helpfulTips?: string[] | null;
    talkingPoints?: string[] | null;
    aiNotes?: string | null;
    evidenceUsed?: string[] | null;
    dueDateStatus?: string | null;
    wrongDateConclusion?: string | null;
    itemType?: string | null;
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

  const talkingPoints = assignment.talkingPoints ?? (courseContext?.importantTerms?.length ? courseContext.importantTerms : courseContext?.recentTopics);
  const bestDueDate = assignment.officialDueDate ?? assignment.inferredDueDate;

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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{assignment.title}</h1>
                {assignment.itemType && (
                  <Badge variant="outline" className="text-xs">{assignment.itemType}</Badge>
                )}
              </div>
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

            {/* 1. Teacher Description */}
            <NoteSection title="Teacher Description" icon={FileText}>
              {assignment.description ? (
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">{assignment.description}</div>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
            </NoteSection>

            {/* 2. AI Assignment Breakdown */}
            <NoteSection title="AI Assignment Breakdown" icon={Lightbulb}>
              {(assignment.aiDescription ?? assignment.teacherIntentSummary ?? assignment.aiSummary) && (
                <p className="text-sm">{assignment.aiDescription ?? assignment.teacherIntentSummary ?? assignment.aiSummary}</p>
              )}
            </NoteSection>

            {/* 3. What You Need To Do */}
            <NoteSection title="What You Need To Do" icon={Check}>
              {((assignment.whatYouNeedToDo?.length ?? assignment.extractedRequirements?.length) ?? 0) > 0 && (
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {(assignment.whatYouNeedToDo ?? assignment.extractedRequirements ?? []).map((r, i) => (
                    <li key={i}>{typeof r === "string" ? r : String(r)}</li>
                  ))}
                </ul>
              )}
            </NoteSection>

            {/* 4. Best Guess About Due Date */}
            <NoteSection title="Best Guess About Due Date" icon={Calendar}>
              <div className="space-y-2 text-sm">
                {bestDueDate ? (
                  <>
                    <div>
                      {assignment.officialDueDate && <span>Official: {formatDate(assignment.officialDueDate)}</span>}
                      {assignment.inferredDueDate && (
                        <span className={assignment.officialDueDate ? " ml-2" : ""}>
                          {assignment.officialDueDate ? "· " : ""}Inferred: {formatDate(assignment.inferredDueDate)}
                        </span>
                      )}
                    </div>
                    {(assignment.dueDateStatus === "conflict" || assignment.dueDateConflict) && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200">Due date conflict</p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.wrongDateConclusion ?? assignment.dueDateConflictReason ?? "Verify with your teacher."}
                          </p>
                        </div>
                      </div>
                    )}
                    {assignment.dueDateStatus === "hidden" && (
                      <p className="text-xs text-muted-foreground italic">
                        This date was inferred from assignment text or attachments—confirm with your teacher.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No due date found. Check with your teacher.</p>
                )}
              </div>
            </NoteSection>

            {/* 5. Helpful Tips */}
            <NoteSection title="Helpful Tips">
              {assignment.helpfulTips && assignment.helpfulTips.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {assignment.helpfulTips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              ) : (courseContext?.aiClassSummary || courseContext?.activeUnit) ? (
                <div className="space-y-2 text-sm">
                  {courseContext.aiClassSummary && <p>{courseContext.aiClassSummary}</p>}
                  {courseContext.activeUnit && (
                    <p><strong>Active unit:</strong> {courseContext.activeUnit}</p>
                  )}
                </div>
              ) : null}
            </NoteSection>

            {/* 6. Talking Points / What To Mention */}
            <NoteSection title="Talking Points / What To Mention">
              {talkingPoints && (Array.isArray(talkingPoints) ? talkingPoints.length > 0 : talkingPoints) ? (
                Array.isArray(talkingPoints) ? (
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {talkingPoints.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">{String(talkingPoints)}</p>
                )
              ) : null}
            </NoteSection>

            {/* 7. First Step */}
            <NoteSection title="First Step" highlight>
              {assignment.firstStep ? (
                <p className="text-sm font-medium">{assignment.firstStep}</p>
              ) : null}
            </NoteSection>

            {/* 8. AI Notes */}
            <NoteSection title="AI Notes">
              {(assignment.aiNotes ?? assignment.aiSummary ?? assignment.relatedClassContext) ? (
                <p className="text-sm text-muted-foreground">
                  {assignment.aiNotes ?? assignment.aiSummary ?? (Array.isArray(assignment.relatedClassContext) ? assignment.relatedClassContext.join(", ") : assignment.relatedClassContext)}
                </p>
              ) : null}
            </NoteSection>

            {/* 9. Evidence Used */}
            <NoteSection title="Evidence Used" icon={FileText}>
              {(assignment.evidenceUsed?.length || assignment.materials?.length || assignment.sourceLinks?.length) ? (
                <div className="space-y-2 text-sm">
                  {assignment.evidenceUsed?.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                  {!assignment.evidenceUsed?.length && assignment.materials?.map((m, i) => (
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
                  {!assignment.evidenceUsed?.length && assignment.sourceLinks
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

            {courseContext && (courseContext.aiClassSummary || courseContext.activeUnit || courseContext.recentTopics?.length) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Class Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {courseContext.aiClassSummary && <p>{courseContext.aiClassSummary}</p>}
                  {courseContext.activeUnit && (
                    <p><strong>Active unit:</strong> {courseContext.activeUnit}</p>
                  )}
                  {courseContext.recentTopics && courseContext.recentTopics.length > 0 && (
                    <p><strong>Recent topics:</strong> {courseContext.recentTopics.join(", ")}</p>
                  )}
                </CardContent>
              </Card>
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
                  Get evidence-driven guidance from ClassPilot. Answers prioritize synced assignment data.
                </p>
              </CardHeader>
              <CardContent>
                <WorkspaceChat
                  assignmentId={assignment._id}
                  assignmentTitle={assignment.title}
                  courseName={course?.name ?? "Unknown"}
                  aiDescription={assignment.aiDescription}
                  teacherIntent={assignment.teacherIntentSummary}
                  requirements={assignment.whatYouNeedToDo ?? assignment.extractedRequirements}
                  firstStep={assignment.firstStep}
                  classContext={courseContext?.aiClassSummary}
                  description={assignment.description}
                  evidenceUsed={assignment.evidenceUsed}
                  dueDateStatus={assignment.dueDateStatus}
                  officialDueDate={assignment.officialDueDate}
                  inferredDueDate={assignment.inferredDueDate}
                  dueDateConflictReason={assignment.dueDateConflictReason}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
