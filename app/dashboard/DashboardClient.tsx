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
  CheckCircle,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

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

const SYNC_COOLDOWN_MS = 30_000;

export default function DashboardClient({
  initialAssignments,
  initialStats,
  initialCalendarEvents,
  displayName,
  error,
  googleConnected: initialGoogleConnected,
  showRunSync = false,
  lastCheckedAt: initialLastCheckedAt,
  lastSyncTriggeredAt: initialLastSyncTriggeredAt,
}: {
  initialAssignments: Assignment[];
  initialStats: Stats;
  initialCalendarEvents: CalendarEvent[];
  displayName: string;
  error: string | null;
  googleConnected: boolean;
  showRunSync?: boolean;
  lastCheckedAt: Date | string | null;
  lastSyncTriggeredAt?: Date | string | null;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [stats, setStats] = useState(initialStats);
  const [calendarEvents, setCalendarEvents] = useState(initialCalendarEvents);
  const [googleConnected, setGoogleConnected] = useState(initialGoogleConnected);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | string | null>(initialLastCheckedAt);
  const [lastSyncTriggeredAt, setLastSyncTriggeredAt] = useState<Date | string | null>(initialLastSyncTriggeredAt ?? null);
  const [sortMode, setSortMode] = useState("ai-recommended");
  const [loading, setLoading] = useState(false);
  const [checkInProgress, setCheckInProgress] = useState(false);
  const [checkProgress, setCheckProgress] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const router = useRouter();
  const addToast = useToast();

  const refreshData = useCallback(async () => {
    const [assignRes, metaRes, calendarRes] = await Promise.all([
      getAssignmentsForDashboard(sortMode),
      getDashboardMeta(),
      getCalendarEvents(calendarMonth.year, calendarMonth.month),
    ]);
    if (assignRes.assignments) setAssignments(assignRes.assignments);
    if (assignRes.stats) setStats(assignRes.stats);
    if (metaRes) {
      setGoogleConnected(metaRes.googleConnected);
      setLastCheckedAt(metaRes.lastCheckedAt);
      setLastSyncTriggeredAt(metaRes.lastSyncTriggeredAt ?? null);
    }
    if (Array.isArray(calendarRes)) setCalendarEvents(calendarRes);
  }, [sortMode, calendarMonth]);

  const handleRunCheck = async () => {
    setCheckInProgress(true);
    setCheckProgress("Starting sync...");
    try {
      const res = await fetch("/api/check/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Run Sync failed", "destructive");
        setCheckInProgress(false);
        return;
      }
      const jobId = data.jobId;
      if (jobId) {
        const pollStatus = async () => {
          const statusRes = await fetch(`/api/check/status?jobId=${jobId}`);
          const statusData = await statusRes.json();
          if (statusData.progress) setCheckProgress(statusData.progress);
          if (statusData.status === "running") {
            setTimeout(pollStatus, 2000);
          } else {
            await refreshData();
            addToast(statusData.status === "completed" ? "Sync complete. Your assignments and calendar are up to date." : statusData.error ?? "Sync finished.", statusData.status === "failed" ? "destructive" : "default");
            router.refresh();
            setCheckInProgress(false);
          }
        };
        pollStatus();
      } else {
        await refreshData();
        addToast("Sync complete.", "default");
        router.refresh();
        setCheckInProgress(false);
      }
    } catch (e) {
      addToast("Run Sync failed", "destructive");
      setCheckInProgress(false);
    }
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

  const topAssignment = assignments[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">ClassPilot</h1>
            <p className="text-sm text-muted-foreground">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {displayName}
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

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
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

        {/* Run Sync - when Google connected OR has uploaded files */}
        {showRunSync && (
          <Card className="mb-6">
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium">
                    {googleConnected ? "Google connected" : "Uploads ready"}
                  </span>
                </div>
                {lastCheckedAt && (
                  <p className="text-sm text-muted-foreground">
                    Last synced: {formatDate(lastCheckedAt)}
                  </p>
                )}
                {(() => {
                  const triggered = lastSyncTriggeredAt ? new Date(lastSyncTriggeredAt).getTime() : 0;
                  const cooldownRemaining = Math.ceil((SYNC_COOLDOWN_MS - (Date.now() - triggered)) / 1000);
                  return cooldownRemaining > 0 && !checkInProgress ? (
                    <p className="text-xs text-amber-600">Cooldown: {cooldownRemaining}s</p>
                  ) : null;
                })()}
              </div>
              <Button
                size="lg"
                onClick={handleRunCheck}
                disabled={
                  checkInProgress ||
                  (!!lastSyncTriggeredAt && Date.now() - new Date(lastSyncTriggeredAt).getTime() < SYNC_COOLDOWN_MS)
                }
                className="gap-2"
              >
                {checkInProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {checkProgress || "Syncing..."}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Run Sync
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Start + Sort */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {topAssignment && (
            <Link href={`/workspace/${topAssignment._id}`}>
              <Button size="lg" className="gap-2">
                <Zap className="h-4 w-4" />
                Start with: {topAssignment.title}
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

        {/* Assignment List */}
        <Card>
          <CardHeader>
            <CardTitle>Ranked Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="space-y-6 py-12 text-center">
                <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {googleConnected
                    ? "No assignments yet. Run a check to pull your classes and assignments from Google."
                    : "No assignments yet. Get started by connecting your data."}
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  {googleConnected ? (
                    <>
                      <Button
                        variant="default"
                        className="gap-2"
                        onClick={handleRunCheck}
                        disabled={checkInProgress}
                      >
                        {checkInProgress ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {checkProgress}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Run Check
                          </>
                        )}
                      </Button>
                      <Link href="/settings#uploads">
                        <Button variant="outline" className="gap-2">
                          Upload files manually
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/settings#connections">
                        <Button variant="default" className="gap-2">
                          Connect Google Classroom / Drive
                        </Button>
                      </Link>
                      <Link href="/settings#uploads">
                        <Button variant="outline" className="gap-2">
                          Upload files manually
                        </Button>
                      </Link>
                      <Button variant="ghost" onClick={() => addToast("You can always connect or upload later from Settings")}>
                        Skip for now
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((a) => (
                  <div
                    key={a._id}
                    className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{a.title}</h3>
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
                        onClick={() => handleSkip(a._id)}
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
                        onClick={() => handleMarkComplete(a._id)}
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar - monthly view */}
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
                  const prev = calendarMonth.month === 0 ? { year: calendarMonth.year - 1, month: 11 } : { year: calendarMonth.year, month: calendarMonth.month - 1 };
                  setCalendarMonth(prev);
                  const events = await getCalendarEvents(prev.year, prev.month);
                  setCalendarEvents(events);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] text-center text-sm font-medium">
                {new Date(calendarMonth.year, calendarMonth.month).toLocaleString("default", { month: "long", year: "numeric" })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const next = calendarMonth.month === 11 ? { year: calendarMonth.year + 1, month: 0 } : { year: calendarMonth.year, month: calendarMonth.month + 1 };
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
                No assignments with due dates this month. Run Check to discover deadlines.
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
