# DevBoard GitHub App

DevBoard uses one GitHub App for repository access. User login remains a separate GitHub OAuth identity flow.

## Bootstrap

The authenticated dashboard starts the GitHub App Manifest flow. The manifest preconfigures the production URLs, read-only repository permissions, and webhook events.

GitHub returns a one-time manifest code. DevBoard exchanges it for the GitHub App configuration and stores the private key and webhook secret encrypted at rest with a key derived from `AUTH_SECRET`.

No GitHub App private key or webhook secret is committed to Git.

## Repository permissions

- Actions: read
- Contents: read
- Issues: read
- Pull requests: read
- Metadata: implicit read access

## Webhook events

Configured events:

- issues
- issue_comment
- pull_request
- pull_request_review
- workflow_run
- push

`installation` and `installation_repositories` are delivered to GitHub Apps by default and are not manually subscribed.

## Installation

For the first MVP, DevBoard accepts installations on the signed-in user's personal GitHub account. Organization installation verification is intentionally deferred until the GitHub App user authorization flow is added.

After installation, DevBoard verifies the installation using an App JWT, creates a short-lived installation access token, reads `/installation/repositories`, and stores the selected repository metadata locally.

Installation access tokens are never persisted.
