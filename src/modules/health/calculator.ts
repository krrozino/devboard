import { getHealthStatus, type HealthStatus } from "./index";

export type HealthDimension = "DEVELOPMENT" | "REVIEW" | "DELIVERY" | "PLANNING";
export type HealthSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type HealthAttentionInput = {
  id: string;
  ruleId: string;
  severity: HealthSeverity;
  message: string;
};

export type HealthReasonDraft = {
  dimension: HealthDimension;
  sourceType: "ATTENTION_ITEM" | "PLANNING";
  sourceId: string;
  impact: number;
  message: string;
};

export type HealthCalculation = {
  overallScore: number;
  developmentScore: number;
  reviewScore: number;
  deliveryScore: number;
  planningScore: number | null;
  status: HealthStatus;
  reasons: HealthReasonDraft[];
};

type RulePolicy = {
  dimension: Exclude<HealthDimension, "PLANNING">;
  penalties: Partial<Record<HealthSeverity, number>>;
};

const RULE_POLICIES: Record<string, RulePolicy> = {
  PR_WAITING_REVIEW: {
    dimension: "REVIEW",
    penalties: { MEDIUM: 5, HIGH: 15, CRITICAL: 25 },
  },
  STALE_ISSUE: {
    dimension: "DEVELOPMENT",
    penalties: { LOW: 3, MEDIUM: 6, HIGH: 10, CRITICAL: 15 },
  },
  WORKFLOW_FAILED: {
    dimension: "DELIVERY",
    penalties: { LOW: 4, MEDIUM: 8, HIGH: 20, CRITICAL: 30 },
  },
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function weightedAverage(entries: Array<{ score: number; weight: number }>) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return 100;
  return clampScore(
    entries.reduce((sum, entry) => sum + entry.score * entry.weight, 0) / totalWeight,
  );
}

export function calculateProjectHealth(params: {
  attention: HealthAttentionInput[];
  planning?: {
    score: number;
    reasons?: HealthReasonDraft[];
  } | null;
}): HealthCalculation {
  const penalties: Record<Exclude<HealthDimension, "PLANNING">, number> = {
    DEVELOPMENT: 0,
    REVIEW: 0,
    DELIVERY: 0,
  };
  const reasons: HealthReasonDraft[] = [];

  for (const item of params.attention) {
    const policy = RULE_POLICIES[item.ruleId];
    if (!policy) continue;

    const penalty = policy.penalties[item.severity] ?? 0;
    if (penalty <= 0) continue;

    penalties[policy.dimension] += penalty;
    reasons.push({
      dimension: policy.dimension,
      sourceType: "ATTENTION_ITEM",
      sourceId: item.id,
      impact: -penalty,
      message: item.message,
    });
  }

  const developmentScore = clampScore(100 - penalties.DEVELOPMENT);
  const reviewScore = clampScore(100 - penalties.REVIEW);
  const deliveryScore = clampScore(100 - penalties.DELIVERY);
  const planningScore = params.planning ? clampScore(params.planning.score) : null;

  if (params.planning?.reasons?.length) reasons.push(...params.planning.reasons);

  const overallScore = planningScore === null
    ? weightedAverage([
        { score: developmentScore, weight: 0.3 },
        { score: reviewScore, weight: 0.35 },
        { score: deliveryScore, weight: 0.35 },
      ])
    : weightedAverage([
        { score: developmentScore, weight: 0.25 },
        { score: reviewScore, weight: 0.25 },
        { score: deliveryScore, weight: 0.3 },
        { score: planningScore, weight: 0.2 },
      ]);

  return {
    overallScore,
    developmentScore,
    reviewScore,
    deliveryScore,
    planningScore,
    status: getHealthStatus(overallScore),
    reasons,
  };
}
