const GITHUB_API_VERSION = "2022-11-28";
const MAX_PAGES = 10;

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "DevBoard",
    Authorization: `Bearer ${token}`,
  };
}

async function getJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: githubHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub resource request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

async function listPages<T>(buildUrl: (page: number) => string, token: string) {
  const items: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const current = await getJson<T[]>(buildUrl(page), token);
    items.push(...current);
    if (current.length < 100) break;
  }

  return items;
}

export type GithubIssueResource = {
  id: number;
  number: number;
  title: string;
  state: string;
  user: { id: number } | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  pull_request?: unknown;
};

export type GithubPullRequestResource = {
  id: number;
  number: number;
  title: string;
  state: string;
  draft: boolean | null;
  user: { id: number } | null;
  head: { ref: string } | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
};

export type GithubReviewResource = {
  id: number;
  user: { id: number } | null;
  state: string;
  submitted_at: string | null;
};

export type GithubWorkflowRunResource = {
  id: number;
  name: string;
  head_branch: string | null;
  status: string;
  conclusion: string | null;
  created_at: string;
  run_started_at: string | null;
  updated_at: string;
};

export async function listRepositoryIssues(token: string, owner: string, repo: string) {
  const items = await listPages<GithubIssueResource>(
    (page) =>
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=all&sort=updated&direction=desc&per_page=100&page=${page}`,
    token,
  );

  return items.filter((item) => !item.pull_request);
}

export async function listRepositoryPullRequests(token: string, owner: string, repo: string) {
  return listPages<GithubPullRequestResource>(
    (page) =>
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=all&sort=updated&direction=desc&per_page=100&page=${page}`,
    token,
  );
}

export async function listPullRequestReviews(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
) {
  return listPages<GithubReviewResource>(
    (page) =>
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/reviews?per_page=100&page=${page}`,
    token,
  );
}

export async function listRepositoryWorkflowRuns(token: string, owner: string, repo: string) {
  const runs: GithubWorkflowRunResource[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await getJson<{ workflow_runs: GithubWorkflowRunResource[] }>(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=100&page=${page}`,
      token,
    );
    runs.push(...payload.workflow_runs);
    if (payload.workflow_runs.length < 100) break;
  }

  return runs;
}
