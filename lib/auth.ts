import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import connectDB from "./mongodb";
import User from "@/models/User";

const SESSION_COOKIE = "classpilot_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
}

export async function signIn(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  await connectDB();

  const user = await User.findOne({ username });
  if (!user) {
    return { success: false, error: "Invalid username or password" };
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    return { success: false, error: "Invalid username or password" };
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date() } }
  );

  const sessionUser: SessionUser = {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName ?? user.username,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionUser), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return { success: true };
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie?.value) return null;

  try {
    const session = JSON.parse(sessionCookie.value) as SessionUser;
    if (session?.id && session?.username) return session;
  } catch {
    // Invalid cookie
  }
  return null;
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
