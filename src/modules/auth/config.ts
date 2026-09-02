import { z } from "zod";

const authEnvSchema = z.object({
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export function getAuthEnv() {
  return authEnvSchema.parse(process.env);
}

export function getAppOrigin(requestOrigin: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return requestOrigin;
  return new URL(configured).origin;
}

export function getGithubCallbackUrl(requestOrigin: string) {
  return `${getAppOrigin(requestOrigin)}/api/auth/github/callback`;
}
