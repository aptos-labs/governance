// tests/unit/deployment-config.test.ts
import {existsSync, readFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {PUBLIC_PAGE_CACHE_CONTROL} from "~/lib/http-cache";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
}

describe("deployment config", () => {
  it("tells Vercel to build the app rather than serve the repo root", () => {
    const vercel = readJson("vercel.json");

    // Without an explicit preset Vercel fell back to "Other", skipped the
    // build, and served repo files as static assets.
    expect(vercel.framework).toBe("tanstack-start");
    expect(vercel.buildCommand).toBe("pnpm build");
    expect(vercel.installCommand).toBe("pnpm install --frozen-lockfile");
    // Nitro emits Vercel's Build Output API layout, which is only detected
    // when no output directory is pinned.
    expect(vercel.outputDirectory).toBeNull();
  });

  it("keeps no static-host config that would shadow the server-rendered app", () => {
    // A leftover CRA shell here is served ahead of the app and asks the
    // browser for a `/src/index.tsx` module that no longer exists.
    for (const stale of ["index.html", "netlify.toml", "public/_redirects"]) {
      expect(existsSync(resolve(rootDir, stale))).toBe(false);
    }
  });

  it("keeps the backend key unprefixed and the frontend key Vite-prefixed", () => {
    const example = readFileSync(resolve(rootDir, ".env.example"), "utf8");
    expect(example).toMatch(/^APTOS_BUILD_API_KEY=/m);
    expect(example).toMatch(/^VITE_APTOS_API_KEY=/m);
    // A VITE_ backend key would inline the secret into the public bundle.
    expect(example).not.toMatch(/^VITE_APTOS_BUILD_API_KEY=/m);
  });

  it("asks Vercel to cache SSR HTML briefly so Aptos is not hit on every request", () => {
    const vercel = readJson("vercel.json");
    const headers = vercel.headers as Array<{
      source: string;
      headers: Array<{key: string; value: string}>;
    }>;
    expect(headers.length).toBeGreaterThan(0);
    for (const entry of headers) {
      const cacheControl = entry.headers.find(
        (header) => header.key === "Cache-Control",
      );
      expect(cacheControl?.value).toBe(PUBLIC_PAGE_CACHE_CONTROL);
    }
  });
});
