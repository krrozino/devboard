import { NextRequest, NextResponse } from "next/server";
import { getAuthEnv, getGithubCallbackUrl } from "@/modules/auth/config";
import { buildGithubAuthorizeUrl } from "@/modules/auth/github";
import {
  createOAuthState,
  createPkceChallenge,
  createPkceVerifier,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  OAUTH_PURPOSE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/modules/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const env = getAuthEnv();
    const state = createOAuthState();
    const verifier = createPkceVerifier();
    const callbackUrl = getGithubCallbackUrl(request.nextUrl.origin);
    const authorizeUrl = buildGithubAuthorizeUrl({
      clientId: env.GITHUB_CLIENT_ID,
      callbackUrl,
      state,
      codeChallenge: createPkceChallenge(verifier),
    });

    const response = NextResponse.redirect(authorizeUrl);
    const secure = callbackUrl.startsWith("https://");
    const cookieOptions = {
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    };

    response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
    response.cookies.set(OAUTH_VERIFIER_COOKIE, verifier, cookieOptions);
    response.cookies.set(OAUTH_PURPOSE_COOKIE, "identity", cookieOptions);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?auth_error=config", request.url));
  }
}
