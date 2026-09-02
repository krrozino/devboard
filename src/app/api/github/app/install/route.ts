import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { githubAppConfigurations } from "@/db/schema";
import { getAppOrigin } from "@/modules/auth/config";
import { getCurrentUser } from "@/modules/auth/current-user";
import {
  createGithubState,
  GITHUB_APP_INSTALL_STATE_COOKIE,
} from "@/modules/github/manifest";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const origin = getAppOrigin(request.nextUrl.origin);
  if (!user) return NextResponse.redirect(new URL("/", origin));

  const [app] = await db.select().from(githubAppConfigurations).limit(1);
  if (!app) {
    return NextResponse.redirect(new URL("/dashboard?github_app=missing", origin));
  }

  const state = createGithubState();
  const response = NextResponse.redirect(
    `https://github.com/apps/${encodeURIComponent(app.slug)}/installations/new?state=${encodeURIComponent(state)}`,
  );
  response.cookies.set(GITHUB_APP_INSTALL_STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
