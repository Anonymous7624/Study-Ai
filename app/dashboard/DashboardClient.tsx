"use client";

import { useState } from "react";
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
} from "@/app/actions/assignments";
import {
  Calendar,
  AlertTriangle,
  Target,
  Zap,
  ChevronRight,
  ExternalLink,
  SkipForward,
  CheckCircle2,
  Loader2,
  LogOut,
  Settings,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

type Assignment = {
  _id: string;
  title: string;
  courseName: string;
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

export default function DashboardClient({
  initialAssignments,
  initialStats,
  displayName,
  error,
}: {
  initialAssignments: Assignment[];
  initialStats: Stats;
  displayName: string;
  error: string | null;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [stats, setStats] = useState(initialStats);
  const [sortMode, setSortMode] = useState("ai-recommended");
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const router = useRouter();
  const addToast = useToast();

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
              <div className="py-12 text-center text-muted-foreground">
                <Target className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No active assignments. Sync from Google Classroom or add mock data.</p>
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
                            <Calendar className="h-3 w-3" />
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

        {/* Recent Class Updates - placeholder */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Class Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              New announcements and materials will appear here after syncing with Google Classroom.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
