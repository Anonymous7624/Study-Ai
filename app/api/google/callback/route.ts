import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import GoogleConnection from "@/models/GoogleConnection";
import { exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/google/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(new URL("/settings?google_error=denied", request.url));
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;
  const userId = cookieStore.get("google_oauth_user")?.value;

  cookieStore.delete("google_oauth_state");
  cookieStore.delete("google_oauth_user");

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL("/settings?google_error=invalid_state", request.url));
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const googleEmail = await getGoogleUserEmail(tokens.access_token);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/settings?google_error=no_refresh", request.url));
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await connectDB();

    await GoogleConnection.findOneAndUpdate(
      { userId },
      {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        googleEmail: googleEmail ?? undefined,
        scopes: tokens.scope?.split(" ").filter(Boolean) ?? [],
        lastSyncAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          googleConnected: true,
          googleEmail: googleEmail ?? undefined,
        },
      }
    );

    return NextResponse.redirect(new URL("/settings?google_connected=1", request.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Google connection failed";
    return NextResponse.redirect(
      new URL(`/settings?google_error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}
