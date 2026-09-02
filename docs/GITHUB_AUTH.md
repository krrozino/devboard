# GitHub Authentication

DevBoard uses GitHub OAuth only to identify the signed-in user. Repository monitoring will be handled separately by the DevBoard GitHub App.

## Production OAuth App

The production OAuth App is configured with:

- Application name: `DevBoard`
- Homepage URL: `https://devboard-phi-six.vercel.app`
- Authorization callback URL: `https://devboard-phi-six.vercel.app/api/auth/github/callback`
- Client ID: stored as non-secret application configuration in the codebase

Keep wildcard callback matching disabled.

## Vercel environment variables

Only secret values are required for GitHub login in Vercel:

```text
GITHUB_CLIENT_SECRET=<OAuth App client secret>
AUTH_SECRET=<random secret with at least 32 characters>
```

`DATABASE_URL` remains required separately for PostgreSQL and should also stay secret.

The production application URL and OAuth Client ID are public configuration and are stored in `src/modules/auth/config.ts`, so they do not need Vercel environment variables.

Generate `AUTH_SECRET` locally with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Never commit `GITHUB_CLIENT_SECRET`, `AUTH_SECRET`, or `DATABASE_URL`.

## Flow

```text
Continue with GitHub
  -> /api/auth/github
  -> GitHub authorization (state + PKCE)
  -> /api/auth/github/callback
  -> exchange authorization code
  -> fetch GitHub user identity
  -> upsert users row
  -> create signed HttpOnly session cookie
  -> /dashboard
```

The GitHub access token is not stored after identity lookup.

## Local development

Production needs no `APP_URL` or `GITHUB_CLIENT_ID` environment variables. Local development can optionally override the public defaults with:

```text
APP_URL=http://localhost:3000
GITHUB_CLIENT_ID=<development OAuth App client id>
```

For local OAuth testing, use a separate development OAuth App with a loopback callback such as:

```text
http://localhost:3000/api/auth/github/callback
```
