import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getAssignmentsForDashboard,
  getDashboardMeta,
  getCalendarEvents,
  getUploadedFiles,
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
  ] = await Promise.all([
    getAssignmentsForDashboard(),
    getDashboardMeta(),
    getCalendarEvents(),
    getUploadedFiles(),
  ]);
  const defaultStats = { total: 0, overdue: 0, highPriority: 0, conflicts: 0 };

  return (
    <DashboardClient
      initialAssignments={assignments ?? []}
      initialStats={stats ?? defaultStats}
      initialCalendarEvents={calendarEvents ?? []}
      initialUploadedFiles={uploadedFiles ?? []}
      googleConnected={dashboardMeta.googleConnected}
      hasUploadedFiles={dashboardMeta.hasUploadedFiles}
      lastCheckedAt={dashboardMeta.lastCheckedAt}
      displayName={session.displayName ?? "Student"}
      error={error}
    />
  );
}
