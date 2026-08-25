export interface TtlCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  getOrSet(key: string, compute: () => Promise<T>): Promise<T>;
  clear(): void;
}

export function createTtlCache<T>(options: {ttlMs: number}): TtlCache<T> {
  const store = new Map<string, {value: T; expiresAt: number}>();
  const inflight = new Map<string, Promise<T>>();

  function get(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key: string, value: T): void {
    store.set(key, {value, expiresAt: Date.now() + options.ttlMs});
  }

  async function getOrSet(key: string, compute: () => Promise<T>): Promise<T> {
    const hit = get(key);
    if (hit !== undefined) return hit;

    const pending = inflight.get(key);
    if (pending) return pending;

    const promise = compute()
      .then((value) => {
        set(key, value);
        return value;
      })
      .finally(() => {
        inflight.delete(key);
      });

    inflight.set(key, promise);
    return promise;
  }

  function clear(): void {
    store.clear();
    inflight.clear();
  }

  return {get, set, getOrSet, clear};
}
