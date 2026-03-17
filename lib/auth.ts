import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import connectDB from "./mongodb";
import User from "@/models/User";

const SESSION_COOKIE = "classpilot_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
}

const getSecret = () => {
  const secret =
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "development"
      ? "classpilot-dev-secret-change-in-production"
      : undefined);
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
};

export async function createSession(user: {
  _id: string;
  email: string;
  username: string;
  displayName?: string;
}) {
  const secret = getSecret();
  const token = await new SignJWT({
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    displayName: user.displayName || user.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function signIn(
  emailOrUsername: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  await connectDB();

  const isEmail = emailOrUsername.includes("@");
  const user = isEmail
    ? await User.findOne({ email: emailOrUsername.trim().toLowerCase() })
    : await User.findOne({ username: emailOrUsername.trim() });

  if (!user) {
    return { success: false, error: "Invalid email/username or password" };
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    return { success: false, error: "Invalid email/username or password" };
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date() } }
  );

  await createSession({
    _id: user._id.toString(),
    email: user.email,
    username: user.username,
    displayName: user.displayName,
  });

  return { success: true };
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    const id = payload.id as string;
    const email = payload.email as string;
    const username = payload.username as string;
    if (!id || !email || !username) return null;

    return {
      id,
      email,
      username,
      displayName: (payload.displayName as string) || username,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
