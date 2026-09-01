# DevBoard

> **GitHub tracks the work. DevBoard tells you how it's going.**

DevBoard is a software project observability product. It connects to GitHub and transforms project activity into health signals, attention items and context that can be understood quickly.

## Current status

**Foundation / pre-MVP.**

The current repository contains the application shell, initial PostgreSQL/Drizzle structure, CI, product documentation and the first domain interfaces. GitHub integration is the next implementation milestone.

## Product principles

- Do not rebuild GitHub Projects.
- GitHub is the source of truth for technical work.
- DevBoard explains how the project is going.
- Attention must be actionable, not noisy.
- Health scores must be explainable.
- Developer metrics are not employee rankings.
- AI is not required for the MVP.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Drizzle ORM
- Vitest
- GitHub Actions
- Vercel (target deployment)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Set at least `DATABASE_URL` before using database commands.

### 3. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Database

Generate migrations:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

## Repository structure

```text
src/
├── app/
├── config/
├── db/
└── modules/
    ├── activity/
    ├── attention/
    ├── github/
    ├── health/
    └── projects/

docs/
├── adr/
└── product/
```

## Roadmap

### Sprint 0 — Foundation

- [x] Next.js project structure
- [x] TypeScript and Tailwind foundation
- [x] PostgreSQL/Drizzle setup
- [x] domain-oriented structure
- [x] unit-test foundation
- [x] CI workflow
- [x] product and architecture docs
- [ ] install dependencies and generate lockfile
- [ ] connect real PostgreSQL database
- [ ] first Vercel deployment

### Sprint 1 — GitHub identity and connection

- [ ] GitHub login
- [ ] GitHub App
- [ ] repository selection
- [ ] persist project/repository mapping

### Sprint 2 — First vertical slice

- [ ] synchronize real pull requests
- [ ] normalize review state
- [ ] create `PR_WAITING_REVIEW` rule
- [ ] calculate Review Health
- [ ] show the reason on the dashboard

## Documentation

- [Product requirements](docs/product/PRD.md)
- [Technical design](docs/product/TDD.md)
- [Architecture decisions](docs/adr/)
