export type HealthStatus = "HEALTHY" | "ATTENTION" | "AT_RISK";

export function getHealthStatus(score: number): HealthStatus {
  if (score >= 85) return "HEALTHY";
  if (score >= 65) return "ATTENTION";
  return "AT_RISK";
}
