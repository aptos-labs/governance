export type ApiKeyKind = "server" | "client" | "unknown" | "none";

export interface ResolvedApiKey {
  key?: string;
  source?: string;
  kind: ApiKeyKind;
}

export interface ResolvedApiConfig extends ResolvedApiKey {
  apiKey?: string;
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

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
    apiKey: resolved.key,
    fullnodeUrl:
      readEnv("APTOS_FULLNODE_URL") || readEnv("VITE_GEOMI_FULLNODE_URL"),
    indexerUrl:
      readEnv("APTOS_INDEXER_URL") ||
      readEnv("VITE_GEOMI_INDEXER_URL") ||
      DEFAULT_INDEXER_URL,
  };
}
