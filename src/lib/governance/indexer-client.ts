// src/lib/governance/indexer-client.ts

/** Overridable per design spec §9 — defaults to the hosted mainnet
 *  endpoint; Task 18's e2e test points this at a local mock instead. */
const INDEXER_URL =
  process.env.APTOS_INDEXER_URL ||
  "https://api.mainnet.aptoslabs.com/v1/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{message: string}>;
}

/**
 * POSTs a GraphQL query to the hosted Aptos mainnet Indexer API and
 * returns its `data` field. Throws with the GraphQL error message(s)
 * on a GraphQL-level error, or the HTTP status on a transport error —
 * callers should catch and convert to a UI-facing "stale/unavailable"
 * state rather than letting this bubble as an unhandled rejection.
 */
export async function executeIndexerQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.APTOS_BUILD_API_KEY) {
    headers.Authorization = `Bearer ${process.env.APTOS_BUILD_API_KEY}`;
  }

  const response = await fetch(INDEXER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({query, variables}),
  });

  if (!response.ok) {
    throw new Error(`Indexer request failed with HTTP ${response.status}`);
  }

  const body = (await response.json()) as GraphQLResponse<T>;

  if (body.errors && body.errors.length > 0) {
    throw new Error(
      `Indexer GraphQL error(s): ${body.errors.map((e) => e.message).join("; ")}`,
    );
  }

  if (!body.data) {
    throw new Error("Indexer response had no data and no errors");
  }

  return body.data;
}
