import { describe, expect, it } from "vitest";
import { getHealthStatus } from "@/modules/health";

describe("getHealthStatus", () => {
  it("classifies healthy scores", () => {
    expect(getHealthStatus(85)).toBe("HEALTHY");
  });

  it("classifies attention scores", () => {
    expect(getHealthStatus(70)).toBe("ATTENTION");
  });

  it("classifies at-risk scores", () => {
    expect(getHealthStatus(64)).toBe("AT_RISK");
  });
});
