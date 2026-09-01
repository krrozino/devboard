# DevBoard — TDD v0.1

## Architecture

The MVP uses a modular monolith with an event-driven GitHub integration.

```text
GitHub
  ↓
Webhook Receiver / Initial Sync
  ↓
Normalized State
  ↓
Activity + Attention Engine
  ↓
Health Engine
  ↓
PostgreSQL
  ↓
Next.js Dashboard
```

## Core decisions

- Next.js + TypeScript.
- PostgreSQL + Drizzle ORM.
- GitHub App for repository access and webhooks.
- Read-only GitHub integration for the MVP whenever possible.
- REST-first GitHub API usage.
- Webhook requests are validated and acknowledged quickly; expensive processing is asynchronous.
- Event consumers must be idempotent.
- Health and attention logic is deterministic and unit-testable.
- Health snapshots are persisted for historical trends.
- AI never participates in the critical scoring pipeline.

## Solo-development simplifications

The first version intentionally omits:

- workspace invitations;
- team roles beyond the authenticated owner;
- complex organization permissions;
- billing;
- internal Kanban;
- issue creation/editing;
- Slack/Discord/Jira/Linear integrations.

The first vertical slice is:

```text
Real GitHub PR
  ↓
DevBoard receives state/event
  ↓
PR stored
  ↓
Attention rule evaluates it
  ↓
Health changes
  ↓
Dashboard explains why
```
