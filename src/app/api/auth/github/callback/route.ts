import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  getAppOrigin,
  getAuthEnv,
  getGithubCallbackUrl,
} from "@/modules/auth/config";
import { exchangeGithubCode, fetchGithubIdentity } from "@/modules/auth/github";
import {
  createSessionToken,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  safeEqual,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/modules/auth/session";

export const runtime = "nodejs";

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(OAUTH_VERIFIER_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function GET(request: NextRequest) {
  const appOrigin = getAppOrigin(request.nextUrl.origin);

  try {
    const env = getAuthEnv();
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");
    const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
    const verifier = request.cookies.get(OAUTH_VERIFIER_COOKIE)?.value;

    if (error || !code || !state || !storedState || !verifier) {
      throw new Error(error ?? "Missing OAuth callback parameters");
    }

    if (!safeEqual(state, storedState)) {
      throw new Error("OAuth state mismatch");
    }

    const callbackUrl = getGithubCallbackUrl(request.nextUrl.origin);
    const accessToken = await exchangeGithubCode({
      config: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackUrl,
      },
      code,
      codeVerifier: verifier,
    });

    const identity = await fetchGithubIdentity(accessToken);
    const now = new Date();

    const [user] = await db
      .insert(users)
      .values({
        ...identity,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.githubId,
        set: {
          username: identity.username,
          name: identity.name,
          email: identity.email,
          avatarUrl: identity.avatarUrl,
          updatedAt: now,
        },
      })
      .returning({ id: users.id });

    if (!user) throw new Error("Unable to persist GitHub user");

    const response = NextResponse.redirect(new URL("/dashboard", appOrigin));
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(user.id, env.AUTH_SECRET),
      {
        httpOnly: true,
        secure: appOrigin.startsWith("https://"),
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    );
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    console.error("github_oauth_callback_failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    const response = NextResponse.redirect(new URL("/?auth_error=github", appOrigin));
    clearOAuthCookies(response);
    return response;
  }
}
