import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getAssignmentsForDashboard,
  getDashboardMeta,
  getCalendarEvents,
} from "@/app/actions/assignments";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const [{ assignments, stats, error }, dashboardMeta, calendarEvents] =
    await Promise.all([
      getAssignmentsForDashboard(),
      getDashboardMeta(),
      getCalendarEvents(),
    ]);
  const defaultStats = { total: 0, overdue: 0, highPriority: 0, conflicts: 0 };

  return (
    <DashboardClient
      initialAssignments={assignments ?? []}
      initialStats={stats ?? defaultStats}
      initialCalendarEvents={calendarEvents ?? []}
      googleConnected={dashboardMeta.googleConnected}
      showRunSync={dashboardMeta.showRunSync ?? (dashboardMeta.googleConnected || dashboardMeta.hasUploads)}
      lastCheckedAt={dashboardMeta.lastCheckedAt}
      lastSyncTriggeredAt={dashboardMeta.lastSyncTriggeredAt}
      displayName={session.displayName}
      error={error}
    />
  );
}
