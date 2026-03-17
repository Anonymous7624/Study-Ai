import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAssignmentsForDashboard } from "@/app/actions/assignments";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { assignments, stats, error } = await getAssignmentsForDashboard();
  const defaultStats = { total: 0, overdue: 0, highPriority: 0, conflicts: 0 };

  return (
    <DashboardClient
      initialAssignments={assignments ?? []}
      initialStats={stats ?? defaultStats}
      displayName={session.displayName}
      error={error}
    />
  );
}
