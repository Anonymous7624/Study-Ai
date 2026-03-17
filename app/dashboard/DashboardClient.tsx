"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  markAssignmentComplete,
  skipAssignment,
  getAssignmentsForDashboard,
  getDashboardMeta,
  getCalendarEvents,
} from "@/app/actions/assignments";
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  Target,
  Zap,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  SkipForward,
  CheckCircle2,
  Loader2,
  LogOut,
  Settings,
  RefreshCw,
  FileText,
  Upload,
  Link2,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

const SYNC_STAGES = [
  "Reading assignments",
  "Reading announcements",
  "Reading docs/slides/files",
  "Building class context",
  "Checking due dates",
  "Generating study notes",
  "Updating calendar",
  "Finalizing",
];

const MIN_SYNC_DURATION_MS = 120000; // 2 minutes
const SYNC_COOLDOWN_SEC = 30;

type Assignment = {
  _id: string;
  title: string;
  courseName: string;
  itemType?: string;
  officialDueDate?: Date | string;
  inferredDueDate?: Date | string;
  dueDateConflict?: boolean;
  dueDateConflictReason?: string;
  priorityReason?: string;
  alternateLink?: string;
  urgencyScore?: number;
};

type Stats = {
  total: number;
  overdue: number;
  highPriority: number;
  conflicts: number;
};

type CalendarEvent = {
  _id: string;
  title: string;
  courseName: string;
  date: Date | string;
  source: "official" | "inferred";
  itemType?: string;
};

type UploadedFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  sourceType: string;
};

type SyncSummary = {
  documentsRead: number;
  assignmentsFound: number;
  pastDueCount: number;
  futureDueCount: number;
  testsQuizzesCount: number;
  hiddenDeadlinesCount: number;
  dateConflictsCount: number;
  aiMemoryUpdated: boolean;
  lastSyncedAt: Date | string;
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  assignment: "Assignment",
  quiz: "Quiz",
  test: "Test",
  reading: "Reading",
  project: "Project",
  study_task: "Study Task",
  hidden_deadline: "Hidden Deadline",
  date_conflict: "Date Conflict",
};

export default function DashboardClient({
  initialAssignments,
  initialStats,
  initialCalendarEvents,
  initialUploadedFiles,
  displayName,
  error,
  googleConnected: initialGoogleConnected,
  hasUploadedFiles: initialHasUploadedFiles,
  lastCheckedAt: initialLastCheckedAt,
}: {
  initialAssignments: Assignment[];
  initialStats: Stats;
  initialCalendarEvents: CalendarEvent[];
  initialUploadedFiles: UploadedFile[];
  displayName: string;
  error: string | null;
  googleConnected: boolean;
  hasUploadedFiles: boolean;
  lastCheckedAt: Date | string | null;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [stats, setStats] = useState(initialStats);
  const [calendarEvents, setCalendarEvents] = useState(initialCalendarEvents);
  const [uploadedFiles, setUploadedFiles] = useState(initialUploadedFiles);
  const [googleConnected, setGoogleConnected] = useState(initialGoogleConnected);
  const [hasUploadedFiles, setHasUploadedFiles] = useState(initialHasUploadedFiles);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | string | null>(initialLastCheckedAt);
  const [sortMode, setSortMode] = useState("ai-recommended");
  const [loading, setLoading] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncStage, setSyncStage] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const router = useRouter();
  const addToast = useToast();

  const canRunSync = googleConnected || hasUploadedFiles;
  const showOnboarding = !googleConnected && !hasUploadedFiles;

  useEffect(() => {
    setAssignments(initialAssignments);
    setStats(initialStats);
    setCalendarEvents(initialCalendarEvents);
    setUploadedFiles(initialUploadedFiles);
    setGoogleConnected(initialGoogleConnected);
    setHasUploadedFiles(initialHasUploadedFiles);
    setLastCheckedAt(initialLastCheckedAt);
  }, [
    initialAssignments,
    initialStats,
    initialCalendarEvents,
    initialUploadedFiles,
    initialGoogleConnected,
    initialHasUploadedFiles,
    initialLastCheckedAt,
  ]);

  const refreshData = useCallback(async () => {
    const [assignRes, metaRes, calendarRes, filesRes] = await Promise.all([
      getAssignmentsForDashboard(sortMode),
      getDashboardMeta(),
      getCalendarEvents(calendarMonth.year, calendarMonth.month),
      fetch("/api/files").then((r) => r.json()).then((d) => d.files ?? []),
    ]);
    if (assignRes.assignments) setAssignments(assignRes.assignments);
    if (assignRes.stats) setStats(assignRes.stats);
    if (Array.isArray(calendarRes)) setCalendarEvents(calendarRes);
    if (Array.isArray(filesRes)) {
      setUploadedFiles(filesRes);
      setHasUploadedFiles(filesRes.length > 0);
    }
    if (metaRes) {
      setGoogleConnected(metaRes.googleConnected);
      setLastCheckedAt(metaRes.lastCheckedAt);
    }
  }, [sortMode, calendarMonth]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const t = setInterval(() => setCooldownRemaining((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldownRemaining]);

  const handleRunSync = async () => {
    if (!canRunSync || syncInProgress || cooldownRemaining > 0) return;
    const startTime = Date.now();
    setSyncInProgress(true);
    setSyncModalOpen(true);
    setSyncStartTime(startTime);
    setSyncStage(0);
    setSyncMessage(SYNC_STAGES[0]);
    try {
      const res = await fetch("/api/check/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Sync failed", "destructive");
        setSyncInProgress(false);
        setSyncModalOpen(false);
        return;
      }
      const jobId = data.jobId;
      if (!jobId) {
        addToast("Sync failed", "destructive");
        setSyncInProgress(false);
        setSyncModalOpen(false);
        return;
      }
      const pollInterval = 1500;
      const minElapsed = () => Date.now() - startTime;
      const poll = async () => {
        const statusRes = await fetch(`/api/check/status?jobId=${jobId}`);
        const status = await statusRes.json();
        if (status.progressStage !== undefined) setSyncStage(Math.min(status.progressStage, 7));
        if (status.progress) setSyncMessage(status.progress);
        if (status.status === "completed") {
          const elapsed = minElapsed();
          const waitRemaining = Math.max(0, MIN_SYNC_DURATION_MS - elapsed);
          if (waitRemaining > 0) {
            await new Promise((r) => setTimeout(r, waitRemaining));
          }
          const metaRes = await getDashboardMeta();
          setSyncSummary({
            documentsRead: status.documentsRead ?? 0,
            assignmentsFound: status.assignmentsFound ?? 0,
            pastDueCount: status.pastDueCount ?? 0,
            futureDueCount: status.futureDueCount ?? 0,
            testsQuizzesCount: status.testsQuizzesCount ?? 0,
            hiddenDeadlinesCount: status.hiddenDeadlinesCount ?? 0,
            dateConflictsCount: status.dateConflictsCount ?? 0,
            aiMemoryUpdated: status.aiMemoryUpdated ?? false,
            lastSyncedAt: metaRes?.lastCheckedAt ?? new Date(),
          });
          setSyncInProgress(false);
          setSyncModalOpen(false);
          setSummaryModalOpen(true);
          setCooldownRemaining(SYNC_COOLDOWN_SEC);
          await refreshData();
          router.refresh();
        } else if (status.status === "failed") {
          addToast(status.error ?? "Sync failed", "destructive");
          setSyncInProgress(false);
          setSyncModalOpen(false);
        } else {
          setTimeout(poll, pollInterval);
        }
      };
      setTimeout(poll, pollInterval);
    } catch (e) {
      addToast("Sync failed", "destructive");
      setSyncInProgress(false);
      setSyncModalOpen(false);
    }
  };

  const handleCloseSummary = () => {
    setSummaryModalOpen(false);
    setSyncSummary(null);
    refreshData();
  };

  const handleSortChange = async (value: string) => {
    setSortMode(value);
    setLoading(true);
    try {
      const res = await getAssignmentsForDashboard(value);
      if (res.assignments) {
        setAssignments(res.assignments);
        if (res.stats) setStats(res.stats);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (id: string) => {
    setActioningId(id);
    try {
      const res = await markAssignmentComplete(id);
      if (res.success) {
        setAssignments((prev) => prev.filter((a) => a._id !== id));
        setStats((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
        addToast("Marked as complete");
      } else {
        addToast(res.error ?? "Failed", "destructive");
      }
    } finally {
      setActioningId(null);
    }
  };

  const handleSkip = async (id: string) => {
    setActioningId(id);
    try {
      await skipAssignment(id);
      setAssignments((prev) => prev.filter((a) => a._id !== id));
      setStats((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
      addToast("Skipped for now");
    } finally {
      setActioningId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const formatDate = (d?: Date | string) => {
    if (!d) return null;
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const now = new Date();
  const pastDue = assignments.filter((a) => {
    const d = a.officialDueDate ?? a.inferredDueDate;
    return d && new Date(d) < now;
  });
  const upcoming = assignments.filter((a) => {
    const d = a.officialDueDate ?? a.inferredDueDate;
    return d && new Date(d) >= now;
  });
  const testsQuizzes = assignments.filter(
    (a) => a.itemType === "test" || a.itemType === "quiz"
  );
  const hiddenDeadlines = assignments.filter((a) => a.itemType === "hidden_deadline");
  const aiChoice = assignments.slice(0, 3);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">ClassPilot</h1>
            <p className="text-sm text-muted-foreground">
              Good{" "}
              {new Date().getHours() < 12
                ? "morning"
                : new Date().getHours() < 18
                  ? "afternoon"
                  : "evening"}
              , {displayName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {/* Onboarding: No Google + No files */}
        {showOnboarding && (
          <Card className="mb-8 border-2 border-dashed border-muted-foreground/30">
            <CardContent className="flex flex-col items-center gap-6 py-12">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Get Started with ClassPilot</h2>
                <p className="text-muted-foreground max-w-md">
                  Connect your Google account or upload files to sync your assignments, deadlines, and class materials.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/settings#connections">
                  <Button size="lg" className="gap-2">
                    <Link2 className="h-5 w-5" />
                    Connect Google
                  </Button>
                </Link>
                <Link href="/settings#uploads">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Files
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                Connect Classroom, Drive, Docs & Slides for full sync
              </p>
            </CardContent>
          </Card>
        )}

        {/* Run Sync: When Google OR uploaded files */}
        {canRunSync && !showOnboarding && (
          <Card className="mb-6">
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                {googleConnected && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="font-medium text-sm">
                      Google connected (Classroom · Drive · Docs · Slides)
                    </span>
                  </div>
                )}
                {lastCheckedAt && (
                  <p className="text-sm text-muted-foreground">
                    Last synced: {formatDate(lastCheckedAt)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {cooldownRemaining > 0 ? (
                  <Button size="lg" variant="outline" disabled className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Run Sync (cooldown: {cooldownRemaining}s)
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleRunSync}
                    disabled={syncInProgress}
                    className="gap-2"
                  >
                    {syncInProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Run Sync
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync progress modal */}
        <Dialog open={syncModalOpen} onOpenChange={() => {}}>
          <DialogContent onClose={() => {}} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Syncing Your Classes
              </DialogTitle>
              <DialogDescription>
                Please wait while we read your assignments, materials, and build your academic context.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${((syncStage + 1) / 8) * 100}%` }}
                />
              </div>
              <p className="text-sm font-medium">{syncMessage}</p>
              <div className="space-y-1">
                {SYNC_STAGES.map((s, i) => (
                  <div
                    key={s}
                    className={`flex items-center gap-2 text-sm ${
                      i <= syncStage ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {i < syncStage ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : i === syncStage ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <div className="h-4 w-4 shrink-0" />
                    )}
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sync completion summary modal */}
        <Dialog open={summaryModalOpen} onOpenChange={(o) => !o && handleCloseSummary()}>
          <DialogContent onClose={handleCloseSummary} className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Sync Complete
              </DialogTitle>
              <DialogDescription>Your classes and assignments are up to date.</DialogDescription>
            </DialogHeader>
            {syncSummary && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Documents read</p>
                    <p className="text-xl font-semibold">{syncSummary.documentsRead}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Assignments found</p>
                    <p className="text-xl font-semibold">{syncSummary.assignmentsFound}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Past due</p>
                    <p className="text-xl font-semibold text-destructive">{syncSummary.pastDueCount}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Future due</p>
                    <p className="text-xl font-semibold">{syncSummary.futureDueCount}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Tests & Quizzes</p>
                    <p className="text-xl font-semibold">{syncSummary.testsQuizzesCount}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Hidden deadlines</p>
                    <p className="text-xl font-semibold">{syncSummary.hiddenDeadlinesCount}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Date conflicts</p>
                    <p className="text-xl font-semibold">{syncSummary.dateConflictsCount}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">AI context updated</p>
                    <p className="text-xl font-semibold">
                      {syncSummary.aiMemoryUpdated ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last synced: {formatDate(syncSummary.lastSyncedAt)}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleCloseSummary}>View Dashboard</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Start + Sort (when we have assignments) */}
        {assignments.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            {aiChoice[0] && (
              <Link href={`/workspace/${aiChoice[0]._id}`}>
                <Button size="lg" className="gap-2">
                  <Zap className="h-4 w-4" />
                  AI&apos;s Choice: {aiChoice[0].title}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select value={sortMode} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[180px]" disabled={loading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai-recommended">AI Recommended</SelectItem>
                  <SelectItem value="due-soonest">Due Soonest</SelectItem>
                  <SelectItem value="most-important">Most Important</SelectItem>
                  <SelectItem value="easiest-first">Easiest First</SelectItem>
                  <SelectItem value="hardest-first">Hardest First</SelectItem>
                  <SelectItem value="shortest-first">Shortest First</SelectItem>
                </SelectContent>
              </Select>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
        )}

        {/* Stats (when we have assignments) */}
        {assignments.length > 0 && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Past Due</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <Zap className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.highPriority}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Date Conflicts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.conflicts}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI's Choice */}
        {aiChoice.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI&apos;s Choice
              </CardTitle>
              <p className="text-sm text-muted-foreground">Top recommended assignments to tackle first</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {aiChoice.map((a) => (
                  <AssignmentRow
                    key={a._id}
                    a={a}
                    formatDate={formatDate}
                    ITEM_TYPE_LABELS={ITEM_TYPE_LABELS}
                    onMarkComplete={handleMarkComplete}
                    onSkip={handleSkip}
                    actioningId={actioningId}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past Due */}
        {pastDue.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Past Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pastDue.map((a) => (
                  <AssignmentRow
                    key={a._id}
                    a={a}
                    formatDate={formatDate}
                    ITEM_TYPE_LABELS={ITEM_TYPE_LABELS}
                    onMarkComplete={handleMarkComplete}
                    onSkip={handleSkip}
                    actioningId={actioningId}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcoming.slice(0, 10).map((a) => (
                  <AssignmentRow
                    key={a._id}
                    a={a}
                    formatDate={formatDate}
                    ITEM_TYPE_LABELS={ITEM_TYPE_LABELS}
                    onMarkComplete={handleMarkComplete}
                    onSkip={handleSkip}
                    actioningId={actioningId}
                  />
                ))}
                {upcoming.length > 10 && (
                  <p className="text-sm text-muted-foreground pt-2">+{upcoming.length - 10} more</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tests & Quizzes */}
        {testsQuizzes.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tests & Quizzes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testsQuizzes.map((a) => (
                  <AssignmentRow
                    key={a._id}
                    a={a}
                    formatDate={formatDate}
                    ITEM_TYPE_LABELS={ITEM_TYPE_LABELS}
                    onMarkComplete={handleMarkComplete}
                    onSkip={handleSkip}
                    actioningId={actioningId}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hidden Deadlines */}
        {hiddenDeadlines.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Hidden Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hiddenDeadlines.map((a) => (
                  <AssignmentRow
                    key={a._id}
                    a={a}
                    formatDate={formatDate}
                    ITEM_TYPE_LABELS={ITEM_TYPE_LABELS}
                    onMarkComplete={handleMarkComplete}
                    onSkip={handleSkip}
                    actioningId={actioningId}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Uploaded Files
              </CardTitle>
              <p className="text-sm text-muted-foreground">Files you&apos;ve uploaded for AI help</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {uploadedFiles.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(f.size)} · {new Date(f.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link href="/settings#uploads">
                      <Button variant="ghost" size="sm">Manage</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state when no assignments but can sync */}
        {!showOnboarding && assignments.length === 0 && (
          <Card className="mb-6">
            <CardContent className="py-12 text-center">
              <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                No assignments yet. Run Sync to pull your classes and assignments.
              </p>
              <Button
                className="mt-4 gap-2"
                onClick={handleRunSync}
                disabled={syncInProgress || cooldownRemaining > 0}
              >
                {syncInProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Run Sync
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Calendar */}
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendar
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const prev =
                    calendarMonth.month === 0
                      ? { year: calendarMonth.year - 1, month: 11 }
                      : { year: calendarMonth.year, month: calendarMonth.month - 1 };
                  setCalendarMonth(prev);
                  const events = await getCalendarEvents(prev.year, prev.month);
                  setCalendarEvents(events);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] text-center text-sm font-medium">
                {new Date(calendarMonth.year, calendarMonth.month).toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const next =
                    calendarMonth.month === 11
                      ? { year: calendarMonth.year + 1, month: 0 }
                      : { year: calendarMonth.year, month: calendarMonth.month + 1 };
                  setCalendarMonth(next);
                  const events = await getCalendarEvents(next.year, next.month);
                  setCalendarEvents(events);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {calendarEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No dated items this month. Run Sync to discover deadlines.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {calendarEvents.map((ev) => (
                  <Link
                    key={ev._id}
                    href={`/workspace/${ev._id}`}
                    className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.courseName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(ev.date)} · {ev.source === "official" ? "Official" : "Inferred"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function AssignmentRow({
  a,
  formatDate,
  ITEM_TYPE_LABELS,
  onMarkComplete,
  onSkip,
  actioningId,
}: {
  a: Assignment;
  formatDate: (d?: Date | string) => string | null;
  ITEM_TYPE_LABELS: Record<string, string>;
  onMarkComplete: (id: string) => void;
  onSkip: (id: string) => void;
  actioningId: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/workspace/${a._id}`} className="font-medium hover:underline">
            {a.title}
          </Link>
          {a.itemType && ITEM_TYPE_LABELS[a.itemType] && (
            <Badge variant="outline" className="text-xs">
              {ITEM_TYPE_LABELS[a.itemType]}
            </Badge>
          )}
          {a.dueDateConflict && (
            <Badge variant="destructive" className="text-xs">
              Date conflict
            </Badge>
          )}
          {a.urgencyScore && a.urgencyScore >= 0.7 && (
            <Badge variant="secondary">High priority</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{a.courseName}</p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {a.officialDueDate && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Due: {formatDate(a.officialDueDate)}
            </span>
          )}
          {a.inferredDueDate && a.inferredDueDate !== a.officialDueDate && (
            <span>Inferred: {formatDate(a.inferredDueDate)}</span>
          )}
        </div>
        {a.priorityReason && (
          <p className="text-xs text-muted-foreground italic">{a.priorityReason}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/workspace/${a._id}`}>
          <Button size="sm">Start</Button>
        </Link>
        {a.alternateLink && (
          <a href={a.alternateLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSkip(a._id)}
          disabled={actioningId === a._id}
        >
          {actioningId === a._id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <SkipForward className="h-4 w-4" />
              Skip
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMarkComplete(a._id)}
          disabled={actioningId === a._id}
        >
          {actioningId === a._id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
