import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import GoogleConnection from "@/models/GoogleConnection";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const conn = await GoogleConnection.findOne({ userId: session.id }).lean();

  if (!conn) {
    return NextResponse.json({
      connected: false,
      googleEmail: null,
    });
  }

  return NextResponse.json({
    connected: true,
    googleEmail: conn.googleEmail ?? null,
    lastSyncAt: conn.lastSyncAt ?? null,
  });
}
