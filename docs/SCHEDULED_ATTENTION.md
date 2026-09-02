# Scheduled Attention evaluation

Some Attention rules become true only because time passes. GitHub does not emit a webhook exactly when a pull request reaches 48 hours without review or when an issue reaches the stale threshold.

DevBoard therefore runs a scheduled, deterministic evaluation of time-based rules.

## Current rules

- `PR_WAITING_REVIEW`: open, non-draft pull request without a first review after 48 hours; severity increases after 96 hours.
- `STALE_ISSUE`: open issue with no activity for 5 days; severity increases with age.

Workflow failures are intentionally not reconciled by this scheduled pass. Workflow state is handled by sync/webhook processing so the time evaluator cannot accidentally resolve a valid workflow alert for an active pull-request branch.

## Schedule

The production Vercel configuration calls:

```text
GET /api/cron/attention
```

once per day at `09:00 UTC`.

The daily frequency is deliberate because the current deployment uses the Vercel Hobby plan, which only supports daily native cron schedules. A threshold can therefore become visible on the next daily evaluation rather than at the exact minute it is crossed.

If the project later moves to a plan or scheduler that supports higher frequency, the route and engine can be reused without changing the rule model.

## Security

Set a strong production environment variable:

```text
CRON_SECRET=<random secret of at least 16 characters>
```

Vercel sends it as:

```text
Authorization: Bearer <CRON_SECRET>
```

Requests without the exact bearer secret receive `401` and do not run the evaluator.

## Execution model

For each active repository connected through an active GitHub App installation, the scheduled runner:

1. evaluates only time-based Attention rules;
2. upserts matching Attention items using the existing natural rule/resource uniqueness;
3. resolves time-based items whose conditions no longer match;
4. recalculates Project Health for affected projects;
5. emits safe structured log events with repository/project IDs and aggregate counts.

The operation is idempotent. Re-running it does not create duplicate Attention items.

## Failure behavior

Repository failures are isolated so one repository does not prevent the remaining repositories from being evaluated. Health recalculation failures are isolated per project. A partial failure returns HTTP `500` and is visible in runtime logs; successful runs return HTTP `200` with aggregate counters.
