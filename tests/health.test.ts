import { describe, expect, it } from "vitest";
import { getHealthStatus } from "@/modules/health";
import { calculateProjectHealth } from "@/modules/health/calculator";

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

describe("calculateProjectHealth", () => {
  it("starts every engineering dimension at 100 with no active attention", () => {
    expect(calculateProjectHealth({ attention: [] })).toMatchObject({
      overallScore: 100,
      developmentScore: 100,
      reviewScore: 100,
      deliveryScore: 100,
      planningScore: null,
      status: "HEALTHY",
      reasons: [],
    });
  });

  it("maps explainable attention penalties to the correct dimensions", () => {
    const result = calculateProjectHealth({
      attention: [
        {
          id: "pr-1",
          ruleId: "PR_WAITING_REVIEW",
          severity: "HIGH",
          message: "PR #1 has been waiting for review.",
        },
        {
          id: "issue-1",
          ruleId: "STALE_ISSUE",
          severity: "MEDIUM",
          message: "Issue #2 is stale.",
        },
        {
          id: "workflow-1",
          ruleId: "WORKFLOW_FAILED",
          severity: "MEDIUM",
          message: "CI is failing.",
        },
      ],
    });

    expect(result.developmentScore).toBe(94);
    expect(result.reviewScore).toBe(85);
    expect(result.deliveryScore).toBe(92);
    expect(result.overallScore).toBe(90);
    expect(result.reasons).toEqual([
      expect.objectContaining({ dimension: "REVIEW", sourceId: "pr-1", impact: -15 }),
      expect.objectContaining({ dimension: "DEVELOPMENT", sourceId: "issue-1", impact: -6 }),
      expect.objectContaining({ dimension: "DELIVERY", sourceId: "workflow-1", impact: -8 }),
    ]);
  });

  it("clamps a dimension at zero when repeated penalties exceed 100", () => {
    const attention = Array.from({ length: 6 }, (_, index) => ({
      id: `workflow-${index}`,
      ruleId: "WORKFLOW_FAILED",
      severity: "HIGH" as const,
      message: `Workflow ${index} is failing.`,
    }));

    const result = calculateProjectHealth({ attention });
    expect(result.deliveryScore).toBe(0);
    expect(result.overallScore).toBe(65);
    expect(result.status).toBe("ATTENTION");
  });

  it("includes planning only when a planning score exists", () => {
    const withoutPlanning = calculateProjectHealth({ attention: [] });
    const withPlanning = calculateProjectHealth({
      attention: [],
      planning: { score: 50 },
    });

    expect(withoutPlanning.planningScore).toBeNull();
    expect(withPlanning.planningScore).toBe(50);
    expect(withPlanning.overallScore).toBe(90);
  });
});
