import {describe, expect, it, vi} from "vitest";
import {createTtlCache} from "~/lib/ttl-cache";

describe("createTtlCache", () => {
  it("returns undefined on a miss and the stored value on a hit", () => {
    const cache = createTtlCache<string>({ttlMs: 60_000});
    expect(cache.get("k")).toBeUndefined();
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
  });

  it("expires entries after the TTL", () => {
    vi.useFakeTimers();
    const cache = createTtlCache<number>({ttlMs: 1_000});
    cache.set("n", 42);
    expect(cache.get("n")).toBe(42);
    vi.advanceTimersByTime(1_001);
    expect(cache.get("n")).toBeUndefined();
    vi.useRealTimers();
  });

  it("coalesces concurrent getOrSet calls for the same key", async () => {
    const cache = createTtlCache<string>({ttlMs: 60_000});
    let calls = 0;
    const compute = () =>
      new Promise<string>((resolve) => {
        calls += 1;
        setTimeout(() => resolve("shared"), 10);
      });
    const [a, b] = await Promise.all([
      cache.getOrSet("x", compute),
      cache.getOrSet("x", compute),
    ]);
    expect(a).toBe("shared");
    expect(b).toBe("shared");
    expect(calls).toBe(1);
  });

  it("getOrSet only computes on a miss", async () => {
    const cache = createTtlCache<string>({ttlMs: 60_000});
    let calls = 0;
    const first = await cache.getOrSet("x", async () => {
      calls += 1;
      return "computed";
    });
    const second = await cache.getOrSet("x", async () => {
      calls += 1;
      return "other";
    });
    expect(first).toBe("computed");
    expect(second).toBe("computed");
    expect(calls).toBe(1);
  });
});
