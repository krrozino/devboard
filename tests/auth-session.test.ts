import { describe, expect, it } from "vitest";
import {
  createPkceChallenge,
  createSessionToken,
  verifySessionToken,
} from "@/modules/auth/session";

describe("auth session", () => {
  const secret = "this-is-a-test-secret-that-is-long-enough-123456";

  it("creates and verifies a signed session", () => {
    const token = createSessionToken("user-123", secret, 1_000);
    expect(verifySessionToken(token, secret, 1_001)).toEqual({
      sub: "user-123",
      exp: 605_800,
    });
  });

  it("rejects tampered sessions", () => {
    const token = createSessionToken("user-123", secret, 1_000);
    const tampered = `${token.slice(0, -1)}x`;
    expect(verifySessionToken(tampered, secret, 1_001)).toBeNull();
  });

  it("rejects expired sessions", () => {
    const token = createSessionToken("user-123", secret, 1_000);
    expect(verifySessionToken(token, secret, 605_800)).toBeNull();
  });

  it("creates a deterministic S256 PKCE challenge", () => {
    expect(createPkceChallenge("devboard-verifier")).toBe(
      "lI2gsjjNWGF9XimD4h5l2-bOIfnE7YE8Yl8n7vEWu4Y",
    );
  });
});
