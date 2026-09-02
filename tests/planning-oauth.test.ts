import { describe, expect, it } from "vitest";
import { buildGithubAuthorizeUrl } from "@/modules/auth/github";

describe("GitHub Projects OAuth", () => {
  it("requests read-only Projects access with PKCE", () => {
    const url = buildGithubAuthorizeUrl({
      clientId: "client-id",
      callbackUrl: "https://devboard.example/api/auth/github/callback",
      state: "state-value",
      codeChallenge: "challenge-value",
      scopes: ["read:user", "read:project"],
    });

    expect(url.origin).toBe("https://github.com");
    expect(url.pathname).toBe("/login/oauth/authorize");
    expect(url.searchParams.get("scope")).toBe("read:user read:project");
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});
