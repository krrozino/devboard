export type AttentionSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AttentionRuleResult {
  active: boolean;
  severity?: AttentionSeverity;
  message?: string;
  healthPenalty?: number;
}

export interface AttentionRule<TContext> {
  id: string;
  evaluate(context: TContext): AttentionRuleResult;
}
