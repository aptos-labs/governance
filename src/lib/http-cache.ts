/** Short CDN cache for SSR HTML. Matches the in-process proposal-list TTL
 *  so Vercel edge can reuse a render instead of hitting Aptos on every
 *  request. Wallet state is client-only, so these pages are safe to cache. */
export const PUBLIC_PAGE_CACHE_CONTROL =
  "public, s-maxage=15, stale-while-revalidate=45";

export const PUBLIC_PAGE_CACHE_HEADERS = {
  "Cache-Control": PUBLIC_PAGE_CACHE_CONTROL,
  "CDN-Cache-Control": PUBLIC_PAGE_CACHE_CONTROL,
} as const;
