import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runCheck } from "@/lib/check-runner";

export const maxDuration = 180; // 3 minutes for long-running check

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCheck(session.id);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Run Check failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    jobId: result.jobId,
  });
}
