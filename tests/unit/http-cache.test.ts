import {describe, expect, it} from "vitest";
import {
  PUBLIC_PAGE_CACHE_CONTROL,
  PUBLIC_PAGE_CACHE_HEADERS,
} from "~/lib/http-cache";

describe("public page cache headers", () => {
  it("uses a short shared max-age with stale-while-revalidate", () => {
    expect(PUBLIC_PAGE_CACHE_CONTROL).toMatch(/s-maxage=15/);
    expect(PUBLIC_PAGE_CACHE_CONTROL).toMatch(/stale-while-revalidate=45/);
    expect(PUBLIC_PAGE_CACHE_HEADERS["Cache-Control"]).toBe(
      PUBLIC_PAGE_CACHE_CONTROL,
    );
    expect(PUBLIC_PAGE_CACHE_HEADERS["CDN-Cache-Control"]).toBe(
      PUBLIC_PAGE_CACHE_CONTROL,
    );
  });
});
