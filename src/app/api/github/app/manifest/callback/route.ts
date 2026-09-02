import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { githubAppConfigurations } from "@/db/schema";
import { getAppOrigin } from "@/modules/auth/config";
import { getCurrentUser } from "@/modules/auth/current-user";
import { safeEqual } from "@/modules/auth/session";
import { convertManifestCode } from "@/modules/github/app-api";
import { encryptCredential } from "@/modules/github/credentials";
import {
  createGithubState,
  GITHUB_APP_INSTALL_STATE_COOKIE,
  GITHUB_APP_MANIFEST_STATE_COOKIE,
} from "@/modules/github/manifest";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const origin = getAppOrigin(request.nextUrl.origin);
  if (!user) return NextResponse.redirect(new URL("/", origin));

  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const storedState = request.cookies.get(GITHUB_APP_MANIFEST_STATE_COOKIE)?.value;
    const authSecret = process.env.AUTH_SECRET;

    if (!code || !state || !storedState || !authSecret || !safeEqual(state, storedState)) {
      throw new Error("Invalid GitHub App manifest callback");
    }

    const app = await convertManifestCode(code);
    const now = new Date();

    await db
      .insert(githubAppConfigurations)
      .values({
        singletonKey: "primary",
        githubAppId: String(app.id),
        slug: app.slug,
        clientId: app.client_id,
        privateKeyEncrypted: encryptCredential(app.pem, authSecret),
        webhookSecretEncrypted: encryptCredential(app.webhook_secret, authSecret),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: githubAppConfigurations.singletonKey,
        set: {
          githubAppId: String(app.id),
          slug: app.slug,
          clientId: app.client_id,
          privateKeyEncrypted: encryptCredential(app.pem, authSecret),
          webhookSecretEncrypted: encryptCredential(app.webhook_secret, authSecret),
          updatedAt: now,
        },
      });

    const installState = createGithubState();
    const response = NextResponse.redirect(
      `https://github.com/apps/${encodeURIComponent(app.slug)}/installations/new?state=${encodeURIComponent(installState)}`,
    );
    response.cookies.set(GITHUB_APP_MANIFEST_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(GITHUB_APP_INSTALL_STATE_COOKIE, installState, {
      httpOnly: true,
      secure: origin.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("github_app_manifest_callback_failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.redirect(new URL("/dashboard?github_app=manifest_error", origin));
  }
}
