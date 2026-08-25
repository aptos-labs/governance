import {readEnv} from "~/lib/governance/api-config";

/** Production origin for Aptos Governance. */
export const DEFAULT_SITE_ORIGIN = "https://governance.aptosfoundation.org";

export function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Public origin for absolute discovery URLs. Prefers SITE_ORIGIN, then
 * forwarded host headers (Vercel), then the request URL.
 */
export function publicOrigin(request: Request): string {
  const fromEnv = readEnv("SITE_ORIGIN");
  if (fromEnv) return trimTrailingSlash(fromEnv);

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) {
      const forwardedProto =
        request.headers.get("x-forwarded-proto") ?? "https";
      const proto = forwardedProto.split(",")[0]?.trim() || "https";
      return `${proto}://${host}`;
    }
  }

  return new URL(request.url).origin;
}

export function absoluteUrl(origin: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimTrailingSlash(origin)}${normalizedPath}`;
}
