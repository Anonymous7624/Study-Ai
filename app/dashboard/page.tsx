import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getAssignmentsForDashboard,
  getDashboardMeta,
  getCalendarEvents,
  getUploadedFiles,
  getCompletedAssignments,
} from "@/app/actions/assignments";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const [
    { assignments, stats, error },
    dashboardMeta,
    calendarEvents,
    uploadedFiles,
    completedAssignments,
  ] = await Promise.all([
    getAssignmentsForDashboard(),
    getDashboardMeta(),
    getCalendarEvents(),
    getUploadedFiles(),
    getCompletedAssignments(),
  ]);
  const defaultStats = { total: 0, overdue: 0, highPriority: 0, conflicts: 0 };

  return (
    <DashboardClient
      initialAssignments={assignments ?? []}
      initialStats={stats ?? defaultStats}
      initialCalendarEvents={calendarEvents ?? []}
      initialUploadedFiles={uploadedFiles ?? []}
      initialCompletedAssignments={completedAssignments?.assignments ?? []}
      googleConnected={dashboardMeta.googleConnected}
      hasUploads={dashboardMeta.hasUploads}
      showRunSync={dashboardMeta.showRunSync ?? (dashboardMeta.googleConnected || dashboardMeta.hasUploads)}
      lastCheckedAt={dashboardMeta.lastCheckedAt}
      lastSyncTriggeredAt={dashboardMeta.lastSyncTriggeredAt}
      displayName={session.displayName ?? "Student"}
      error={error}
    />
  );
}
