# DevBoard — PRD v0.2

## Product

DevBoard is a software project observability product that connects to GitHub and turns technical activity into a clear view of project health, risks, attention items and recent movement.

> GitHub tracks the work. DevBoard tells you how it's going.

## Product questions

DevBoard should answer two questions better than an individual GitHub screen:

1. How is the project going?
2. What needs my attention?

## MVP pillars

- Project Health
- Attention Engine
- Activity Intelligence
- Multi-project overview
- Explainable signals

## Not the goal

DevBoard is not another task manager, GitHub Projects replacement, developer ranking system or code editor.

## MVP scope

1. GitHub login.
2. Connect one or more GitHub repositories.
3. Initial synchronization of issues, pull requests, reviews and workflow runs.
4. Activity timeline.
5. Deterministic Attention Engine.
6. Explainable Health Score.
7. Project overview dashboard.
8. Multi-project view after the single-project flow is validated.

## First attention rules

- Pull request waiting for review.
- Stale issue.
- Failed workflow.
- Blocked issue when reliable dependency context is available.
- Deadline risk when planning context is available.

## Health states

- 85–100: HEALTHY
- 65–84: ATTENTION
- 0–64: AT RISK

These thresholds are hypotheses and must be recalibrated using real projects.

## Product guardrails

- GitHub remains the source of truth for technical resources.
- DevBoard stores derived context and history.
- Scores must always be explainable.
- Individual activity metrics must not become employee rankings.
- AI is post-MVP; deterministic signals come first.
