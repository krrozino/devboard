type GithubOAuthConfig = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

type GithubProfile = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export function buildGithubAuthorizeUrl({
  clientId,
  callbackUrl,
  state,
  codeChallenge,
  scopes = ["read:user", "user:email"],
}: {
  clientId: string;
  callbackUrl: string;
  state: string;
  codeChallenge: string;
  scopes?: string[];
}) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export async function exchangeGithubCodeWithMetadata({
  config,
  code,
  codeVerifier,
}: {
  config: GithubOAuthConfig;
  code: string;
  codeVerifier: string;
}) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    scope?: string;
    token_type?: string;
    error?: string;
  };

  if (!payload.access_token || payload.error) {
    throw new Error(payload.error ?? "GitHub did not return an access token");
  }

  return {
    accessToken: payload.access_token,
    scope: payload.scope ?? "",
    tokenType: payload.token_type ?? "bearer",
  };
}

export async function exchangeGithubCode(params: {
  config: GithubOAuthConfig;
  code: string;
  codeVerifier: string;
}) {
  const result = await exchangeGithubCodeWithMetadata(params);
  return result.accessToken;
}

async function githubApi<T>(path: string, accessToken: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchGithubIdentity(accessToken: string) {
  const profile = await githubApi<GithubProfile>("/user", accessToken);
  let email = profile.email;

  if (!email) {
    try {
      const emails = await githubApi<GithubEmail[]>("/user/emails", accessToken);
      email =
        emails.find((candidate) => candidate.primary && candidate.verified)?.email ??
        emails.find((candidate) => candidate.verified)?.email ??
        null;
    } catch {
      email = null;
    }
  }

  return {
    githubId: String(profile.id),
    username: profile.login,
    name: profile.name,
    email,
    avatarUrl: profile.avatar_url,
  };
}
