import {logResolvedApiKey, resolveApiConfig} from "~/lib/governance/api-config";

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
  const config = resolveApiConfig();
  logResolvedApiKey(config);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(config.indexerUrl, {
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
