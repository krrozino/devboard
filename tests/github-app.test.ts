import { describe, expect, it } from "vitest";
import { decryptCredential, encryptCredential } from "@/modules/github/credentials";
import { buildGithubAppManifest } from "@/modules/github/manifest";

const secret = "a".repeat(32);

describe("GitHub App foundation", () => {
  it("encrypts credentials without storing plaintext", () => {
    const encrypted = encryptCredential("private-key-value", secret);

    expect(encrypted).not.toContain("private-key-value");
    expect(decryptCredential(encrypted, secret)).toBe("private-key-value");
  });

  it("builds a read-only manifest with the expected webhooks", () => {
    const manifest = buildGithubAppManifest("https://devboard.example", "krrozino");

    expect(manifest.default_permissions).toEqual({
      actions: "read",
      contents: "read",
      issues: "read",
      pull_requests: "read",
    });
    expect(manifest.default_events).toContain("pull_request");
    expect(manifest.default_events).toContain("workflow_run");
    expect(manifest.default_events).not.toContain("installation");
    expect(manifest.hook_attributes.url).toBe("https://devboard.example/api/github/webhooks");
  });
});
