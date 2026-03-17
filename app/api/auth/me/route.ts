import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await User.findById(session.id)
      .select("email username displayName onboardingCompleted googleConnected googleEmail createdAt")
      .lean();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        displayName: user.displayName ?? user.username,
        onboardingCompleted: user.onboardingCompleted,
        googleConnected: user.googleConnected,
        googleEmail: user.googleEmail,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
