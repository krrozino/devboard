import { createSign } from "node:crypto";

const GITHUB_API_VERSION = "2022-11-28";

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createGithubAppJwt(appId: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "RS256", typ: "JWT" });
  const payload = encodeJson({ iat: now - 60, exp: now + 9 * 60, iss: appId });
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64url");
  return `${unsigned}.${signature}`;
}

function githubHeaders(token?: string) {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "DevBoard",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function convertManifestCode(code: string) {
  const response = await fetch(
    `https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`,
    {
      method: "POST",
      headers: githubHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub manifest conversion failed (${response.status})`);
  }

  return (await response.json()) as {
    id: number;
    slug: string;
    client_id: string;
    pem: string;
    webhook_secret: string;
  };
}

export async function getInstallation(params: {
  appId: string;
  privateKey: string;
  installationId: string;
}) {
  const jwt = createGithubAppJwt(params.appId, params.privateKey);
  const response = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(params.installationId)}`,
    { headers: githubHeaders(jwt), cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Unable to verify GitHub installation (${response.status})`);
  }

  return (await response.json()) as {
    id: number;
    account: { id: number; login: string; type: string };
  };
}

export async function createInstallationToken(params: {
  appId: string;
  privateKey: string;
  installationId: string;
}) {
  const jwt = createGithubAppJwt(params.appId, params.privateKey);
  const response = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(params.installationId)}/access_tokens`,
    { method: "POST", headers: githubHeaders(jwt), cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Unable to create installation token (${response.status})`);
  }

  const payload = (await response.json()) as { token: string };
  return payload.token;
}

export async function listInstallationRepositories(token: string) {
  const repositories: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    visibility?: string;
    default_branch: string;
    owner: { login: string };
  }> = [];

  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      { headers: githubHeaders(token), cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Unable to list installation repositories (${response.status})`);
    }

    const payload = (await response.json()) as {
      repositories: typeof repositories;
    };
    repositories.push(...payload.repositories);
    if (payload.repositories.length < 100) break;
  }

  return repositories;
}
