import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createSession } from "@/lib/auth";

const signupSchema = z.object({
  email: z.string().email("Valid email is required"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscore, and hyphen"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0];
      return NextResponse.json(
        { error: firstError ?? "Validation failed", fields: errors },
        { status: 400 }
      );
    }

    const { email, username, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    await connectDB();

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const existingUsername = await User.findOne({
      username: username.trim(),
    });
    if (existingUsername) {
      return NextResponse.json(
        { error: "This username is already taken" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      username: username.trim(),
      hashedPassword,
      displayName: username.trim(),
    });

    await createSession({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      displayName: user.displayName ?? user.username,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        displayName: user.displayName ?? user.username,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
