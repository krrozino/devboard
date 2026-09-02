import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { githubPlanningConnections, users } from "@/db/schema";
import {
  getAppOrigin,
  getAuthEnv,
  getGithubCallbackUrl,
} from "@/modules/auth/config";
import {
  exchangeGithubCodeWithMetadata,
  fetchGithubIdentity,
} from "@/modules/auth/github";
import {
  createSessionToken,
  OAUTH_PURPOSE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  safeEqual,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "@/modules/auth/session";
import { encryptCredential } from "@/modules/github/credentials";

export const runtime = "nodejs";

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(OAUTH_VERIFIER_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(OAUTH_PURPOSE_COOKIE, "", { path: "/", maxAge: 0 });
}

function hasScope(scopeValue: string, required: string) {
  return scopeValue
    .split(/[\s,]+/)
    .filter(Boolean)
    .includes(required);
}

export async function GET(request: NextRequest) {
  const appOrigin = getAppOrigin(request.nextUrl.origin);
  const purpose = request.cookies.get(OAUTH_PURPOSE_COOKIE)?.value ?? "identity";

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
    const tokenResult = await exchangeGithubCodeWithMetadata({
      config: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackUrl,
      },
      code,
      codeVerifier: verifier,
    });

    if (purpose === "planning") {
      const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
      const session = sessionToken
        ? verifySessionToken(sessionToken, env.AUTH_SECRET)
        : null;

      if (!session) throw new Error("Planning OAuth requires an active DevBoard session");
      if (!hasScope(tokenResult.scope, "read:project")) {
        throw new Error("GitHub did not grant read:project");
      }

      const now = new Date();
      const encryptedToken = encryptCredential(tokenResult.accessToken, env.AUTH_SECRET);

      await db
        .insert(githubPlanningConnections)
        .values({
          userId: session.sub,
          oauthTokenEncrypted: encryptedToken,
          grantedScopes: tokenResult.scope,
          connectedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: githubPlanningConnections.userId,
          set: {
            oauthTokenEncrypted: encryptedToken,
            grantedScopes: tokenResult.scope,
            connectedAt: now,
            updatedAt: now,
          },
        });

      const response = NextResponse.redirect(new URL("/planning?connected=1", appOrigin));
      clearOAuthCookies(response);
      return response;
    }

    const identity = await fetchGithubIdentity(tokenResult.accessToken);
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
      purpose,
      message: error instanceof Error ? error.message : "unknown error",
    });
    const target = purpose === "planning" ? "/planning?planning_error=github" : "/?auth_error=github";
    const response = NextResponse.redirect(new URL(target, appOrigin));
    clearOAuthCookies(response);
    return response;
  }
}
