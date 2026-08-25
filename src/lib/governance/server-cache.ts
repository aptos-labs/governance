import {createTtlCache} from "~/lib/ttl-cache";

/** Short TTL for live on-chain data that can change while a proposal is active. */
export const proposalItemCache = createTtlCache<unknown>({ttlMs: 30_000});
export const forumCache = createTtlCache<unknown>({ttlMs: 15_000});
export const votesCache = createTtlCache<unknown>({ttlMs: 20_000});
export const proposalListCache = createTtlCache<unknown>({ttlMs: 15_000});

/** Metadata is content-addressed by on-chain hash, so a long TTL is safe. */
export const metadataCache = createTtlCache<unknown>({
  ttlMs: 24 * 60 * 60 * 1000,
});

/** Failed metadata fetches are retried after a short delay so a 429/timeout
 *  does not stampede the metadata host on every SSR request. */
export const metadataMissCache = createTtlCache<unknown>({ttlMs: 30_000});

export function resetServerCachesForTests(): void {
  proposalItemCache.clear();
  forumCache.clear();
  votesCache.clear();
  proposalListCache.clear();
  metadataCache.clear();
  metadataMissCache.clear();
}
