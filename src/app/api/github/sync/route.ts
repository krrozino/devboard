import { NextRequest, NextResponse } from "next/server";
import { getAppOrigin } from "@/modules/auth/config";
import { getCurrentUser } from "@/modules/auth/current-user";
import { syncGithubRepository } from "@/modules/sync/github-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const origin = getAppOrigin(request.nextUrl.origin);
  if (!user) return NextResponse.redirect(new URL("/", origin));

  try {
    const formData = await request.formData();
    const repositoryId = formData.get("repositoryId");
    if (typeof repositoryId !== "string" || !repositoryId) {
      throw new Error("Repository is required");
    }

    await syncGithubRepository(repositoryId, user.id);
    return NextResponse.redirect(new URL("/dashboard?sync=ok", origin));
  } catch (error) {
    console.error("github_repository_sync_failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.redirect(new URL("/dashboard?sync=error", origin));
  }
}
