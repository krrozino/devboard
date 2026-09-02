export type AttentionSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AttentionFinding = {
  ruleId: "PR_WAITING_REVIEW" | "STALE_ISSUE" | "WORKFLOW_FAILED";
  resourceType: "pull_request" | "issue" | "workflow";
  resourceId: string;
  severity: AttentionSeverity;
  message: string;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function evaluatePullRequest(params: {
  githubId: string;
  number: number;
  state: string;
  draft: boolean;
  createdAt: Date;
  firstReviewAt: Date | null;
  now: Date;
}): AttentionFinding | null {
  if (params.state !== "open" || params.draft || params.firstReviewAt) return null;

  const ageMs = params.now.getTime() - params.createdAt.getTime();
  if (ageMs < 48 * HOUR) return null;

  const hours = Math.floor(ageMs / HOUR);
  return {
    ruleId: "PR_WAITING_REVIEW",
    resourceType: "pull_request",
    resourceId: params.githubId,
    severity: ageMs >= 96 * HOUR ? "HIGH" : "MEDIUM",
    message: `PR #${params.number} has been waiting for its first review for ${hours}h.`,
  };
}

export function evaluateIssue(params: {
  githubId: string;
  number: number;
  state: string;
  lastActivityAt: Date;
  now: Date;
}): AttentionFinding | null {
  if (params.state !== "open") return null;

  const ageMs = params.now.getTime() - params.lastActivityAt.getTime();
  if (ageMs < 5 * DAY) return null;

  const days = Math.floor(ageMs / DAY);
  const severity: AttentionSeverity = days >= 20 ? "HIGH" : days >= 10 ? "MEDIUM" : "LOW";

  return {
    ruleId: "STALE_ISSUE",
    resourceType: "issue",
    resourceId: params.githubId,
    severity,
    message: `Issue #${params.number} has had no activity for ${days} days.`,
  };
}

export type WorkflowRunForAttention = {
  githubRunId: string;
  workflowName: string;
  branch: string | null;
  status: string;
  conclusion: string | null;
  createdAt: Date;
};

const FAILURE_CONCLUSIONS = new Set(["failure", "timed_out", "cancelled", "startup_failure"]);

export function evaluateWorkflows(params: {
  repositoryId: string;
  runs: WorkflowRunForAttention[];
}): AttentionFinding[] {
  const groups = new Map<string, WorkflowRunForAttention[]>();

  for (const run of params.runs) {
    const key = `${run.workflowName}::${run.branch ?? ""}`;
    const group = groups.get(key) ?? [];
    group.push(run);
    groups.set(key, group);
  }

  const findings: AttentionFinding[] = [];

  for (const [key, runs] of groups) {
    const ordered = [...runs].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    const latest = ordered[0];
    if (!latest || latest.status !== "completed" || !latest.conclusion || !FAILURE_CONCLUSIONS.has(latest.conclusion)) {
      continue;
    }

    let consecutiveFailures = 0;
    for (const run of ordered) {
      if (run.status === "completed" && run.conclusion && FAILURE_CONCLUSIONS.has(run.conclusion)) {
        consecutiveFailures += 1;
      } else {
        break;
      }
    }

    findings.push({
      ruleId: "WORKFLOW_FAILED",
      resourceType: "workflow",
      resourceId: `${params.repositoryId}:${key}`,
      severity: consecutiveFailures >= 3 ? "HIGH" : "MEDIUM",
      message: `${latest.workflowName}${latest.branch ? ` on ${latest.branch}` : ""} has ${consecutiveFailures} consecutive failed run${consecutiveFailures === 1 ? "" : "s"}.`,
    });
  }

  return findings;
}
