import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import GoogleConnection from "@/models/GoogleConnection";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  await GoogleConnection.deleteOne({ userId: session.id });
  await User.updateOne(
    { _id: session.id },
    { $set: { googleConnected: false }, $unset: { googleEmail: "" } }
  );

  return NextResponse.json({ success: true });
}
