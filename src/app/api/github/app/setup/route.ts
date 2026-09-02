import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  githubAppConfigurations,
  githubInstallations,
  projects,
  repositories,
} from "@/db/schema";
import { getAppOrigin } from "@/modules/auth/config";
import { getCurrentUser } from "@/modules/auth/current-user";
import { safeEqual } from "@/modules/auth/session";
import {
  createInstallationToken,
  getInstallation,
  listInstallationRepositories,
} from "@/modules/github/app-api";
import { decryptCredential } from "@/modules/github/credentials";
import { GITHUB_APP_INSTALL_STATE_COOKIE } from "@/modules/github/manifest";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const origin = getAppOrigin(request.nextUrl.origin);
  if (!user) return NextResponse.redirect(new URL("/", origin));

  try {
    const installationId = request.nextUrl.searchParams.get("installation_id");
    const state = request.nextUrl.searchParams.get("state");
    const storedState = request.cookies.get(GITHUB_APP_INSTALL_STATE_COOKIE)?.value;
    const authSecret = process.env.AUTH_SECRET;

    if (!installationId || !state || !storedState || !authSecret || !safeEqual(state, storedState)) {
      throw new Error("Invalid GitHub App installation callback");
    }

    const [app] = await db.select().from(githubAppConfigurations).limit(1);
    if (!app) throw new Error("GitHub App configuration not found");

    const privateKey = decryptCredential(app.privateKeyEncrypted, authSecret);
    const installation = await getInstallation({
      appId: app.githubAppId,
      privateKey,
      installationId,
    });

    if (
      installation.account.type !== "User" ||
      String(installation.account.id) !== user.githubId
    ) {
      throw new Error("This MVP only accepts installations on the signed-in personal GitHub account");
    }

    const token = await createInstallationToken({
      appId: app.githubAppId,
      privateKey,
      installationId,
    });
    const githubRepositories = await listInstallationRepositories(token);
    const now = new Date();

    await db.transaction(async (tx) => {
      const [savedInstallation] = await tx
        .insert(githubInstallations)
        .values({
          userId: user.id,
          appConfigurationId: app.id,
          githubInstallationId: installationId,
          accountId: String(installation.account.id),
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          status: "ACTIVE",
          installedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: githubInstallations.githubInstallationId,
          set: {
            userId: user.id,
            accountId: String(installation.account.id),
            accountLogin: installation.account.login,
            accountType: installation.account.type,
            status: "ACTIVE",
            updatedAt: now,
          },
        })
        .returning({ id: githubInstallations.id });

      if (!savedInstallation) throw new Error("Unable to persist GitHub installation");

      for (const repository of githubRepositories) {
        const [existing] = await tx
          .select({
            id: repositories.id,
            projectId: repositories.projectId,
            userId: projects.userId,
          })
          .from(repositories)
          .innerJoin(projects, eq(projects.id, repositories.projectId))
          .where(eq(repositories.githubRepositoryId, String(repository.id)))
          .limit(1);

        if (existing && existing.userId !== user.id) {
          throw new Error("Repository already belongs to another DevBoard account");
        }

        if (existing) {
          await tx
            .update(repositories)
            .set({
              installationId: savedInstallation.id,
              owner: repository.owner.login,
              name: repository.name,
              defaultBranch: repository.default_branch,
              visibility: repository.visibility ?? (repository.private ? "private" : "public"),
            })
            .where(eq(repositories.id, existing.id));
          continue;
        }

        const [project] = await tx
          .insert(projects)
          .values({
            userId: user.id,
            name: repository.full_name,
            description: "Connected from GitHub",
            status: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: projects.id });

        if (!project) throw new Error("Unable to create project for repository");

        await tx.insert(repositories).values({
          projectId: project.id,
          installationId: savedInstallation.id,
          githubRepositoryId: String(repository.id),
          owner: repository.owner.login,
          name: repository.name,
          defaultBranch: repository.default_branch,
          visibility: repository.visibility ?? (repository.private ? "private" : "public"),
          createdAt: now,
        });
      }
    });

    const response = NextResponse.redirect(new URL("/dashboard?github_app=connected", origin));
    response.cookies.set(GITHUB_APP_INSTALL_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("github_app_setup_failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.redirect(new URL("/dashboard?github_app=setup_error", origin));
  }
}
