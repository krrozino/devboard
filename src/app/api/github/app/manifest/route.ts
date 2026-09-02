import { NextRequest, NextResponse } from "next/server";
import { getAppOrigin } from "@/modules/auth/config";
import { getCurrentUser } from "@/modules/auth/current-user";
import {
  buildGithubAppManifest,
  createGithubState,
  GITHUB_APP_MANIFEST_STATE_COOKIE,
} from "@/modules/github/manifest";

export const runtime = "nodejs";

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/", request.url));

  const origin = getAppOrigin(request.nextUrl.origin);
  const state = createGithubState();
  const manifest = JSON.stringify(buildGithubAppManifest(origin, user.username));
  const githubUrl = `https://github.com/settings/apps/new?state=${encodeURIComponent(state)}`;

  const response = new NextResponse(
    `<!doctype html><html><body><form id="manifest" action="${githubUrl}" method="post"><input type="hidden" name="manifest" value="${escapeAttribute(manifest)}"></form><script>document.getElementById('manifest').submit()</script></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );

  response.cookies.set(GITHUB_APP_MANIFEST_STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  return response;
}
