import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncGoogleData } from "@/lib/google/sync";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncGoogleData(session.id);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Sync failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    coursesSynced: result.courses ?? 0,
    assignmentsSynced: result.assignments ?? 0,
  });
}
