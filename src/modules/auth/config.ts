import { z } from "zod";

export const PRODUCTION_APP_URL = "https://devboard-phi-six.vercel.app";
export const DEFAULT_GITHUB_CLIENT_ID = "Ov23liGf8OrPbydhXwFE";

const authEnvSchema = z.object({
  GITHUB_CLIENT_SECRET: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
});

export function getAuthEnv() {
  return {
    ...authEnvSchema.parse(process.env),
    GITHUB_CLIENT_ID:
      process.env.GITHUB_CLIENT_ID?.trim() || DEFAULT_GITHUB_CLIENT_ID,
  };
}

export function getAppOrigin(requestOrigin: string) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return new URL(configured).origin;

  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_APP_URL;
  }

  return requestOrigin;
}

export function getGithubCallbackUrl(requestOrigin: string) {
  return `${getAppOrigin(requestOrigin)}/api/auth/github/callback`;
}
