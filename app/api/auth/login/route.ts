import { NextResponse } from "next/server";
import { z } from "zod";
import { signIn } from "@/lib/auth";

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return NextResponse.json(
        { error: firstError ?? "Validation failed" },
        { status: 400 }
      );
    }

    const { emailOrUsername, password } = parsed.data;
    const result = await signIn(emailOrUsername, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
