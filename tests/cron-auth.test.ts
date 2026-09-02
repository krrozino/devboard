import { describe, expect, it } from "vitest";
import { isCronRequestAuthorized } from "@/modules/attention/cron-auth";

describe("scheduled Attention cron authorization", () => {
  it("accepts the exact bearer secret", () => {
    expect(isCronRequestAuthorized("Bearer devboard-cron-secret", "devboard-cron-secret")).toBe(true);
  });

  it("rejects missing or incorrect credentials", () => {
    expect(isCronRequestAuthorized(null, "devboard-cron-secret")).toBe(false);
    expect(isCronRequestAuthorized("Bearer wrong", "devboard-cron-secret")).toBe(false);
    expect(isCronRequestAuthorized("devboard-cron-secret", "devboard-cron-secret")).toBe(false);
    expect(isCronRequestAuthorized("Bearer devboard-cron-secret", undefined)).toBe(false);
  });
});
