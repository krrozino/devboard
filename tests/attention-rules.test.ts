import { describe, expect, it } from "vitest";
import {
  evaluateIssue,
  evaluatePullRequest,
  evaluateWorkflows,
} from "@/modules/attention/rules";

const now = new Date("2026-09-02T20:00:00.000Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("Attention rules", () => {
  it("does not flag a PR before 48 hours", () => {
    expect(
      evaluatePullRequest({
        githubId: "pr-1",
        number: 1,
        state: "open",
        draft: false,
        createdAt: hoursAgo(47),
        firstReviewAt: null,
        now,
      }),
    ).toBeNull();
  });

  it("flags an unreviewed PR at 48h and escalates at 96h", () => {
    expect(
      evaluatePullRequest({
        githubId: "pr-1",
        number: 1,
        state: "open",
        draft: false,
        createdAt: hoursAgo(48),
        firstReviewAt: null,
        now,
      })?.severity,
    ).toBe("MEDIUM");

    expect(
      evaluatePullRequest({
        githubId: "pr-1",
        number: 1,
        state: "open",
        draft: false,
        createdAt: hoursAgo(96),
        firstReviewAt: null,
        now,
      })?.severity,
    ).toBe("HIGH");
  });

  it("does not flag reviewed, draft or closed PRs", () => {
    expect(
      evaluatePullRequest({
        githubId: "pr-1",
        number: 1,
        state: "open",
        draft: false,
        createdAt: hoursAgo(120),
        firstReviewAt: hoursAgo(2),
        now,
      }),
    ).toBeNull();

    expect(
      evaluatePullRequest({
        githubId: "pr-2",
        number: 2,
        state: "open",
        draft: true,
        createdAt: hoursAgo(120),
        firstReviewAt: null,
        now,
      }),
    ).toBeNull();

    expect(
      evaluatePullRequest({
        githubId: "pr-3",
        number: 3,
        state: "closed",
        draft: false,
        createdAt: hoursAgo(120),
        firstReviewAt: null,
        now,
      }),
    ).toBeNull();
  });

  it("flags stale issues at 5 days and escalates with age", () => {
    expect(
      evaluateIssue({
        githubId: "issue-1",
        number: 1,
        state: "open",
        lastActivityAt: daysAgo(5),
        now,
      })?.severity,
    ).toBe("LOW");

    expect(
      evaluateIssue({
        githubId: "issue-1",
        number: 1,
        state: "open",
        lastActivityAt: daysAgo(10),
        now,
      })?.severity,
    ).toBe("MEDIUM");

    expect(
      evaluateIssue({
        githubId: "issue-1",
        number: 1,
        state: "open",
        lastActivityAt: daysAgo(20),
        now,
      })?.severity,
    ).toBe("HIGH");
  });

  it("only evaluates the latest workflow state and escalates consecutive failures", () => {
    const findings = evaluateWorkflows({
      repositoryId: "repo-1",
      runs: [
        {
          githubRunId: "3",
          workflowName: "CI",
          branch: "main",
          status: "completed",
          conclusion: "failure",
          createdAt: hoursAgo(1),
        },
        {
          githubRunId: "2",
          workflowName: "CI",
          branch: "main",
          status: "completed",
          conclusion: "failure",
          createdAt: hoursAgo(2),
        },
        {
          githubRunId: "1",
          workflowName: "CI",
          branch: "main",
          status: "completed",
          conclusion: "failure",
          createdAt: hoursAgo(3),
        },
      ],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("HIGH");
    expect(findings[0]?.message).toContain("3 consecutive failed runs");
  });

  it("does not flag a workflow when the latest run recovered", () => {
    expect(
      evaluateWorkflows({
        repositoryId: "repo-1",
        runs: [
          {
            githubRunId: "2",
            workflowName: "CI",
            branch: "main",
            status: "completed",
            conclusion: "success",
            createdAt: hoursAgo(1),
          },
          {
            githubRunId: "1",
            workflowName: "CI",
            branch: "main",
            status: "completed",
            conclusion: "failure",
            createdAt: hoursAgo(2),
          },
        ],
      }),
    ).toEqual([]);
  });
});
