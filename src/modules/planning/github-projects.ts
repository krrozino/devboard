import { eq } from "drizzle-orm";
import { db } from "@/db";
import { githubPlanningConnections } from "@/db/schema";
import { decryptCredential } from "@/modules/github/credentials";

export type GithubProjectSummary = {
  id: number | string;
  node_id: string;
  number: number;
  title: string;
  short_description?: string | null;
  public: boolean;
  state?: string;
  updated_at?: string;
};

type ProjectField =
  | {
      __typename: "ProjectV2SingleSelectField";
      id: string;
      name: string;
      options: Array<{ id: string; name: string; color: string }>;
    }
  | {
      __typename: "ProjectV2IterationField";
      id: string;
      name: string;
      configuration: {
        iterations: Array<{ id: string; title: string; startDate: string; duration: number }>;
        completedIterations: Array<{
          id: string;
          title: string;
          startDate: string;
          duration: number;
        }>;
      };
    }
  | { __typename: string; id?: string; name?: string };

type ProjectContent =
  | {
      __typename: "Issue" | "PullRequest";
      id: string;
      number: number;
      title: string;
      url: string;
      state: string;
      repository: { nameWithOwner: string };
      assignees: { nodes: Array<{ login: string; avatarUrl: string }> };
      labels: { nodes: Array<{ name: string; color: string }> };
    }
  | { __typename: "DraftIssue"; id: string; title: string }
  | null;

type ProjectFieldValue =
  | {
      __typename: "ProjectV2ItemFieldSingleSelectValue";
      name: string | null;
      optionId: string | null;
      field: { id: string; name: string } | null;
    }
  | {
      __typename: "ProjectV2ItemFieldIterationValue";
      iterationId: string;
      title: string;
      startDate: string;
      duration: number;
      field: { id: string; name: string } | null;
    }
  | { __typename: string };

type ProjectItemNode = {
  id: string;
  isArchived: boolean;
  type: string;
  content: ProjectContent;
  fieldValues: { nodes: ProjectFieldValue[] };
};

type ProjectBoardResponse = {
  viewer: {
    projectV2: {
      id: string;
      number: number;
      title: string;
      url: string;
      shortDescription: string | null;
      fields: { nodes: ProjectField[] };
      items: { nodes: ProjectItemNode[] };
    } | null;
  };
};

export type PlanningCard = {
  id: string;
  type: "ISSUE" | "PULL_REQUEST" | "DRAFT_ISSUE" | "OTHER";
  title: string;
  number: number | null;
  url: string | null;
  state: string | null;
  repository: string | null;
  assignees: Array<{ login: string; avatarUrl: string }>;
  labels: Array<{ name: string; color: string }>;
  status: string | null;
  statusOptionId: string | null;
  iterationId: string | null;
  iterationTitle: string | null;
};

export type PlanningBoard = {
  project: {
    id: string;
    number: number;
    title: string;
    url: string;
    shortDescription: string | null;
  };
  statusOptions: Array<{ id: string; name: string; color: string }>;
  currentIteration: {
    id: string;
    title: string;
    startDate: string;
    duration: number;
    endDate: string;
  } | null;
  cards: PlanningCard[];
  sprintCards: PlanningCard[];
  backlogCards: PlanningCard[];
};

function githubHeaders(accessToken: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "X-GitHub-Api-Version": "2026-03-10",
  };
}

async function githubGraphql<T>(accessToken: string, query: string, variables: object) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      ...githubHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`GitHub GraphQL failed with ${response.status}`);

  const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!payload.data || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message ?? "GitHub GraphQL returned no data");
  }
  return payload.data;
}

export async function getPlanningConnection(userId: string) {
  const [connection] = await db
    .select()
    .from(githubPlanningConnections)
    .where(eq(githubPlanningConnections.userId, userId))
    .limit(1);

  return connection ?? null;
}

export function decryptPlanningToken(encryptedToken: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return decryptCredential(encryptedToken, secret);
}

export async function listUserGithubProjects(accessToken: string, username: string) {
  const response = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/projectsV2?per_page=100`,
    {
      headers: githubHeaders(accessToken),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub Projects list failed with ${response.status}`);
  }

  return (await response.json()) as GithubProjectSummary[];
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function findCurrentIteration(fields: ProjectField[], now = new Date()) {
  const iterationField = fields.find(
    (field): field is Extract<ProjectField, { __typename: "ProjectV2IterationField" }> =>
      field.__typename === "ProjectV2IterationField",
  );
  if (!iterationField) return null;

  const today = now.toISOString().slice(0, 10);
  const allIterations = [
    ...iterationField.configuration.completedIterations,
    ...iterationField.configuration.iterations,
  ];

  const current = allIterations.find((iteration) => {
    const endDate = addDays(iteration.startDate, iteration.duration);
    return today >= iteration.startDate && today < endDate;
  });

  if (!current) return null;
  return {
    ...current,
    endDate: addDays(current.startDate, current.duration),
  };
}

function normalizeCard(
  item: ProjectItemNode,
  statusFieldId: string | null,
  iterationFieldId: string | null,
): PlanningCard | null {
  if (item.isArchived || !item.content) return null;

  const statusValue = item.fieldValues.nodes.find(
    (value): value is Extract<ProjectFieldValue, { __typename: "ProjectV2ItemFieldSingleSelectValue" }> =>
      value.__typename === "ProjectV2ItemFieldSingleSelectValue" &&
      Boolean(value.field && value.field.id === statusFieldId),
  );
  const iterationValue = item.fieldValues.nodes.find(
    (value): value is Extract<ProjectFieldValue, { __typename: "ProjectV2ItemFieldIterationValue" }> =>
      value.__typename === "ProjectV2ItemFieldIterationValue" &&
      Boolean(value.field && value.field.id === iterationFieldId),
  );

  if (item.content.__typename === "DraftIssue") {
    return {
      id: item.id,
      type: "DRAFT_ISSUE",
      title: item.content.title,
      number: null,
      url: null,
      state: null,
      repository: null,
      assignees: [],
      labels: [],
      status: statusValue?.name ?? null,
      statusOptionId: statusValue?.optionId ?? null,
      iterationId: iterationValue?.iterationId ?? null,
      iterationTitle: iterationValue?.title ?? null,
    };
  }

  const content = item.content;
  return {
    id: item.id,
    type: content.__typename === "PullRequest" ? "PULL_REQUEST" : "ISSUE",
    title: content.title,
    number: content.number,
    url: content.url,
    state: content.state,
    repository: content.repository.nameWithOwner,
    assignees: content.assignees.nodes,
    labels: content.labels.nodes,
    status: statusValue?.name ?? null,
    statusOptionId: statusValue?.optionId ?? null,
    iterationId: iterationValue?.iterationId ?? null,
    iterationTitle: iterationValue?.title ?? null,
  };
}

export async function getUserPlanningBoard(
  accessToken: string,
  projectNumber: number,
): Promise<PlanningBoard> {
  const query = `
    query DevBoardPlanning($number: Int!) {
      viewer {
        projectV2(number: $number) {
          id
          number
          title
          url
          shortDescription
          fields(first: 50) {
            nodes {
              __typename
              ... on ProjectV2Field { id name }
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name color }
              }
              ... on ProjectV2IterationField {
                id
                name
                configuration {
                  iterations { id title startDate duration }
                  completedIterations { id title startDate duration }
                }
              }
            }
          }
          items(first: 100) {
            nodes {
              id
              isArchived
              type
              content {
                __typename
                ... on DraftIssue { id title }
                ... on Issue {
                  id number title url state
                  repository { nameWithOwner }
                  assignees(first: 10) { nodes { login avatarUrl } }
                  labels(first: 10) { nodes { name color } }
                }
                ... on PullRequest {
                  id number title url state
                  repository { nameWithOwner }
                  assignees(first: 10) { nodes { login avatarUrl } }
                  labels(first: 10) { nodes { name color } }
                }
              }
              fieldValues(first: 50) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    optionId
                    field { ... on ProjectV2SingleSelectField { id name } }
                  }
                  ... on ProjectV2ItemFieldIterationValue {
                    iterationId
                    title
                    startDate
                    duration
                    field { ... on ProjectV2IterationField { id name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await githubGraphql<ProjectBoardResponse>(accessToken, query, {
    number: projectNumber,
  });
  const project = data.viewer.projectV2;
  if (!project) throw new Error("Selected GitHub Project was not found");

  const statusField = project.fields.nodes.find(
    (field): field is Extract<ProjectField, { __typename: "ProjectV2SingleSelectField" }> =>
      field.__typename === "ProjectV2SingleSelectField" && field.name.toLowerCase() === "status",
  );
  const iterationField = project.fields.nodes.find(
    (field): field is Extract<ProjectField, { __typename: "ProjectV2IterationField" }> =>
      field.__typename === "ProjectV2IterationField",
  );
  const currentIteration = findCurrentIteration(project.fields.nodes);

  const cards = project.items.nodes
    .map((item) => normalizeCard(item, statusField?.id ?? null, iterationField?.id ?? null))
    .filter((card): card is PlanningCard => Boolean(card));

  const sprintCards = currentIteration
    ? cards.filter((card) => card.iterationId === currentIteration.id)
    : cards;
  const backlogCards = currentIteration
    ? cards.filter((card) => card.iterationId !== currentIteration.id)
    : [];

  return {
    project: {
      id: project.id,
      number: project.number,
      title: project.title,
      url: project.url,
      shortDescription: project.shortDescription,
    },
    statusOptions: statusField?.options ?? [],
    currentIteration,
    cards,
    sprintCards,
    backlogCards,
  };
}
