import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { githubPlanningConnections } from "@/db/schema";
import { getCurrentUser } from "@/modules/auth/current-user";
import {
  decryptPlanningToken,
  getPlanningConnection,
  listUserGithubProjects,
} from "@/modules/planning/github-projects";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/", request.url), 303);

  try {
    const formData = await request.formData();
    const numberValue = formData.get("projectNumber");
    const projectNumber = typeof numberValue === "string" ? Number(numberValue) : NaN;
    if (!Number.isInteger(projectNumber) || projectNumber <= 0) {
      throw new Error("Invalid project number");
    }

    const connection = await getPlanningConnection(user.id);
    if (!connection) {
      return NextResponse.redirect(new URL("/planning?planning_error=not_connected", request.url), 303);
    }

    const token = decryptPlanningToken(connection.oauthTokenEncrypted);
    const projects = await listUserGithubProjects(token, user.username);
    const project = projects.find((candidate) => candidate.number === projectNumber);
    if (!project) throw new Error("Project is not accessible to this user");

    await db
      .update(githubPlanningConnections)
      .set({
        selectedOwnerLogin: user.username,
        selectedOwnerType: "USER",
        selectedProjectNumber: project.number,
        selectedProjectNodeId: project.node_id,
        selectedProjectTitle: project.title,
        updatedAt: new Date(),
      })
      .where(eq(githubPlanningConnections.userId, user.id));

    return NextResponse.redirect(new URL("/planning", request.url), 303);
  } catch (error) {
    console.error("github_project_select_failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.redirect(new URL("/planning?planning_error=project", request.url), 303);
  }
}
