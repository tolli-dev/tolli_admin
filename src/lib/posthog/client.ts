import "server-only";

const POSTHOG_HOST = process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";

function getProjectId() {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!projectId) throw new Error("POSTHOG_PROJECT_ID is not set");
  return projectId;
}

function getApiKey() {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!apiKey) throw new Error("POSTHOG_PERSONAL_API_KEY is not set");
  return apiKey;
}

/**
 * Runs a query against PostHog's Query API (HogQL / Trends / Funnels).
 * See https://posthog.com/docs/api/query
 */
export async function runPostHogQuery<T>(query: Record<string, unknown>, revalidateSeconds = 300): Promise<T> {
  const response = await fetch(`${POSTHOG_HOST}/api/projects/${getProjectId()}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    next: { revalidate: revalidateSeconds },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PostHog query failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}
