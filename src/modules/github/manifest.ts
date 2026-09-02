import { randomBytes } from "node:crypto";

export const GITHUB_APP_MANIFEST_STATE_COOKIE = "devboard_github_app_manifest_state";
export const GITHUB_APP_INSTALL_STATE_COOKIE = "devboard_github_app_install_state";

export function createGithubState() {
  return randomBytes(32).toString("base64url");
}

export function buildGithubAppManifest(origin: string, username: string) {
  return {
    name: `DevBoard ${username}`,
    url: origin,
    description: "Project health, attention signals and engineering intelligence for GitHub repositories.",
    hook_attributes: {
      url: `${origin}/api/github/webhooks`,
      active: true,
    },
    redirect_url: `${origin}/api/github/app/manifest/callback`,
    setup_url: `${origin}/api/github/app/setup`,
    setup_on_update: true,
    public: true,
    request_oauth_on_install: false,
    default_permissions: {
      actions: "read",
      contents: "read",
      issues: "read",
      pull_requests: "read",
    },
    default_events: [
      "issues",
      "issue_comment",
      "pull_request",
      "pull_request_review",
      "workflow_run",
      "push",
    ],
  };
}
