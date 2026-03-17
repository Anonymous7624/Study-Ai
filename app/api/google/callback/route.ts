import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import GoogleConnection from "@/models/GoogleConnection";
import { exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/google/auth";

/**
 * Builds the public origin for redirects. Uses x-forwarded-proto and x-forwarded-host
 * when behind a proxy (Cloudflare, ngrok, etc.) so redirects go to the real domain
 * instead of localhost. Domain-agnostic and production-safe.
 */
function getRedirectBase(request: NextRequest): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const base = getRedirectBase(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(new URL("/settings?google_error=denied", base + "/"));
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;
  const userId = cookieStore.get("google_oauth_user")?.value;

  cookieStore.delete("google_oauth_state");
  cookieStore.delete("google_oauth_user");

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL("/settings?google_error=invalid_state", base + "/"));
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", base + "/"));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const googleEmail = await getGoogleUserEmail(tokens.access_token);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/settings?google_error=no_refresh", base + "/"));
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

    return NextResponse.redirect(new URL("/settings?google_connected=1", base + "/"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Google connection failed";
    return NextResponse.redirect(
      new URL(`/settings?google_error=${encodeURIComponent(msg)}`, base + "/")
    );
  }
}
