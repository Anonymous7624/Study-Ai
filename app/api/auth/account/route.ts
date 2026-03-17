import { NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

const updateSchema = z.object({
  email: z.string().email().optional(),
  username: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  displayName: z.string().max(100).optional(),
});

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return NextResponse.json({ error: firstError ?? "Validation failed" }, { status: 400 });
    }
    const updates = parsed.data;

    await connectDB();
    const user = await User.findById(session.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (updates.email) {
      const normalized = updates.email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalized, _id: { $ne: session.id } });
      if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
      user.email = normalized;
    }
    if (updates.username) {
      const trimmed = updates.username.trim();
      const existing = await User.findOne({ username: trimmed, _id: { $ne: session.id } });
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }
      user.username = trimmed;
    }
    if (updates.displayName !== undefined) {
      user.displayName = updates.displayName.trim() || undefined;
    }
    await user.save();

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        username: user.username,
        displayName: user.displayName ?? user.username,
      },
    });
  } catch (err) {
    console.error("Account update error:", err);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
