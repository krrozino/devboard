# GitHub Authentication

DevBoard uses GitHub OAuth only to identify the signed-in user. Repository monitoring will be handled separately by the DevBoard GitHub App.

## Production OAuth App

Create a GitHub OAuth App with:

- Application name: `DevBoard`
- Homepage URL: `https://devboard-phi-six.vercel.app`
- Authorization callback URL: `https://devboard-phi-six.vercel.app/api/auth/github/callback`

Keep wildcard callback matching disabled.

## Vercel environment variables

Configure these for the DevBoard project:

```text
NEXT_PUBLIC_APP_URL=https://devboard-phi-six.vercel.app
GITHUB_CLIENT_ID=<OAuth App client id>
GITHUB_CLIENT_SECRET=<OAuth App client secret>
AUTH_SECRET=<random secret with at least 32 characters>
```

Generate `AUTH_SECRET` locally with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Do not commit any of these secret values.

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

An OAuth App has a configured callback URL. For local OAuth testing, use a separate development OAuth App with a loopback callback such as:

```text
http://127.0.0.1:3000/api/auth/github/callback
```

and set `NEXT_PUBLIC_APP_URL` accordingly for local development.
