export type ApiKeyKind = "server" | "client" | "unknown" | "none";

export interface ResolvedApiKey {
  key?: string;
  source?: string;
  kind: ApiKeyKind;
}

export interface ResolvedApiConfig extends ResolvedApiKey {
  apiKey?: string;
  /** Origin to send on server-side Aptos/Geomi requests. Required for
   *  client keys (`AG-…`); omitted in the browser where the runtime
   *  sets Origin itself. */
  requestOrigin?: string;
  fullnodeUrl?: string;
  indexerUrl: string;
}

const DEFAULT_INDEXER_URL = "https://api.mainnet.aptoslabs.com/v1/graphql";

/** Env names accepted for a Geomi / Aptos Labs API key. First match wins.
 *  Vercel historically used the Vite-prefixed names from the CRA app;
 *  this server-rendered app prefers APTOS_BUILD_API_KEY so the secret
 *  is not inlined into the client bundle. */
const API_KEY_ENV_NAMES = [
  "APTOS_BUILD_API_KEY",
  "GEOMI_API_KEY",
  "VITE_APTOS_BUILD_API_KEY",
  "VITE_GEOMI_API_KEY",
  "VITE_APTOS_API_KEY_MAINNET",
  "VITE_APTOS_API_KEY",
  "APTOS_API_KEY",
] as const;

/**
 * Vite only inlines `import.meta.env.VITE_*` for *static* property
 * access. Dynamic `import.meta.env[name]` is undefined in the built
 * server bundle, which is why a Vercel `VITE_APTOS_API_KEY_MAINNET`
 * set at build time would be ignored without this map.
 */
const VITE_ENV: Record<string, string | undefined> = {
  VITE_APTOS_BUILD_API_KEY: import.meta.env.VITE_APTOS_BUILD_API_KEY,
  VITE_GEOMI_API_KEY: import.meta.env.VITE_GEOMI_API_KEY,
  VITE_APTOS_API_KEY_MAINNET: import.meta.env.VITE_APTOS_API_KEY_MAINNET,
  VITE_APTOS_API_KEY: import.meta.env.VITE_APTOS_API_KEY,
  VITE_GEOMI_FULLNODE_URL: import.meta.env.VITE_GEOMI_FULLNODE_URL,
  VITE_GEOMI_INDEXER_URL: import.meta.env.VITE_GEOMI_INDEXER_URL,
};

function trimEnv(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readEnv(name: string): string | undefined {
  return trimEnv(process.env[name]) ?? trimEnv(VITE_ENV[name]);
}

export function classifyApiKey(key: string | undefined): ApiKeyKind {
  if (!key) return "none";
  if (key.startsWith("aptoslabs_")) return "server";
  if (key.startsWith("AG-")) return "client";
  return "unknown";
}

export function resolveApiKey(): ResolvedApiKey {
  for (const source of API_KEY_ENV_NAMES) {
    const key = readEnv(source);
    if (key) {
      return {key, source, kind: classifyApiKey(key)};
    }
  }
  return {kind: "none"};
}

/**
 * Origin Geomi should see on SSR requests. Client keys (`AG-…`) 401
 * with "Unauthorized: Origin header is required" when this is missing.
 * Only an explicit APTOS_API_ORIGIN is used — it must be on the key's
 * allowlist. Vercel hostnames are not guessed, because they often are
 * not allowlisted and would still 401.
 */
export function resolveRequestOrigin(): string | undefined {
  if (typeof window !== "undefined") return undefined;

  const explicit = readEnv("APTOS_API_ORIGIN");
  if (explicit) return stripTrailingSlash(explicit);

  return undefined;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/**
 * Key to put on outgoing Aptos/Geomi requests. Client keys (`AG-…`)
 * require a browser `Origin` header; Node SSR does not send one, and
 * Geomi then 401s with "Unauthorized: Origin header is required",
 * which takes down the proposals page.
 *
 * On the server, send a client key only when we can attach an Origin.
 * Otherwise skip it and use the public endpoint. The browser still
 * sends client keys so wallet follow-up calls keep the origin check.
 */
export function outgoingApiKey(resolved: ResolvedApiKey): string | undefined {
  if (!resolved.key) return undefined;
  if (resolved.kind === "client" && typeof window === "undefined") {
    return resolveRequestOrigin() ? resolved.key : undefined;
  }
  return resolved.key;
}

export function aptosRequestHeaders(
  config: ResolvedApiConfig,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  if (config.requestOrigin) {
    headers.Origin = config.requestOrigin;
  }
  return headers;
}

let loggedApiKey = false;

export function logResolvedApiKey(resolved: ResolvedApiKey): void {
  if (loggedApiKey || process.env.VITEST) return;
  loggedApiKey = true;
  if (resolved.kind === "none") {
    console.warn(
      "[aptos] No API key found. Set APTOS_BUILD_API_KEY to a Geomi/Aptos Labs server key (aptoslabs_…) on Vercel to avoid public-endpoint rate limits. Legacy names such as VITE_APTOS_API_KEY_MAINNET are also accepted.",
    );
    return;
  }
  if (resolved.kind === "client" && typeof window === "undefined") {
    if (outgoingApiKey(resolved)) {
      console.info(
        `[aptos] Using client API key from ${resolved.source} with Origin ${resolveRequestOrigin()}`,
      );
      console.warn(
        "[aptos] Prefer a server key (aptoslabs_…) as APTOS_BUILD_API_KEY. Client keys work on SSR only when Origin matches the Geomi allowlist.",
      );
      return;
    }
    console.warn(
      `[aptos] Ignoring client API key from ${resolved.source} during SSR. Geomi client keys (AG-…) require an Origin header and 401 without one, which takes down the proposals page. Using the public endpoint instead. Set APTOS_BUILD_API_KEY to a server key (aptoslabs_…) to avoid rate limits, or set APTOS_API_ORIGIN to an allowlisted origin.`,
    );
    return;
  }
  console.info(
    `[aptos] Using ${resolved.kind} API key from ${resolved.source}`,
  );
  if (resolved.kind === "client") {
    console.warn(
      "[aptos] This looks like a Geomi/Aptos client key (AG-…). Prefer a server key (aptoslabs_…) for Vercel SSR — client keys apply Origin and per-IP limits meant for browsers.",
    );
  }
}

export function resolveApiConfig(): ResolvedApiConfig {
  const resolved = resolveApiKey();
  return {
    ...resolved,
    apiKey: outgoingApiKey(resolved),
    requestOrigin: resolveRequestOrigin(),
    fullnodeUrl:
      readEnv("APTOS_FULLNODE_URL") || readEnv("VITE_GEOMI_FULLNODE_URL"),
    indexerUrl:
      readEnv("APTOS_INDEXER_URL") ||
      readEnv("VITE_GEOMI_INDEXER_URL") ||
      DEFAULT_INDEXER_URL,
  };
}
