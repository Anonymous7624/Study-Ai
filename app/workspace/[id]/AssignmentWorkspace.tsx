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
  MessageSquare,
  FileText,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { markAssignmentComplete, skipAssignmentAction } from "@/app/actions/assignments";
import WorkspaceChat from "./WorkspaceChat";

interface AssignmentWorkspaceProps {
  assignment: {
    _id: string;
    courseId: string;
    title: string;
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

  const bestDueDate = assignment.officialDueDate ?? assignment.inferredDueDate;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
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
          <div className="lg:col-span-2 space-y-6">
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
            </div>

            {/* 1. Teacher Description */}
            {assignment.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Teacher Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {assignment.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 2. AI Assignment Breakdown */}
            {(assignment.aiDescription || assignment.aiSummary) && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">AI Assignment Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {assignment.aiDescription ?? assignment.aiSummary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 3. What You Need To Do */}
            {(assignment.whatYouNeedToDo?.length ?? assignment.extractedRequirements?.length) ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckSquare className="h-4 w-4" />
                    What You Need To Do
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(assignment.whatYouNeedToDo ?? assignment.extractedRequirements ?? []).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {/* 4. Best Guess About Due Date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Best Guess About Due Date
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bestDueDate ? (
                  <>
                    <p className="text-sm">
                      {assignment.officialDueDate && (
                        <span>Official: {formatDate(assignment.officialDueDate)}</span>
                      )}
                      {assignment.inferredDueDate && (
                        <span className={assignment.officialDueDate ? " ml-2" : ""}>
                          {assignment.officialDueDate ? "· " : ""}Inferred: {formatDate(assignment.inferredDueDate)}
                        </span>
                      )}
                    </p>
                    {assignment.dueDateStatus === "conflict" && (
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
              </CardContent>
            </Card>

            {/* 5. Helpful Tips */}
            {assignment.helpfulTips && assignment.helpfulTips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-4 w-4" />
                    Helpful Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {assignment.helpfulTips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 6. Talking Points / What To Mention */}
            {assignment.talkingPoints && assignment.talkingPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4" />
                    Talking Points / What To Mention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {assignment.talkingPoints.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 7. First Step */}
            {assignment.firstStep && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">First Step</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{assignment.firstStep}</p>
                </CardContent>
              </Card>
            )}

            {/* 8. AI Notes */}
            {assignment.aiNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{assignment.aiNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* 9. Evidence Used */}
            {assignment.evidenceUsed && assignment.evidenceUsed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Evidence Used
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {assignment.evidenceUsed.map((e, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="shrink-0">•</span>
                        {e}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {assignment.alternateLink && (
              <a href={assignment.alternateLink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Original Post
                </Button>
              </a>
            )}

            {courseContext && (courseContext.aiClassSummary || courseContext.activeUnit) && (
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
