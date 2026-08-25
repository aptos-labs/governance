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

  it("includes Vercel Web Analytics and Speed Insights in the document shell", () => {
    const pkg = readJson("package.json") as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["@vercel/analytics"]).toBeDefined();
    expect(pkg.dependencies["@vercel/speed-insights"]).toBeDefined();

    const root = readFileSync(resolve(rootDir, "src/routes/__root.tsx"), "utf8");
    expect(root).toContain("VercelAnalytics");
  });

  it("uses patched nitro and uuid versions for known GHSA advisories", () => {
    const pkg = readJson("package.json") as {
      devDependencies: {nitro: string};
      pnpm?: {overrides?: Record<string, string>};
    };

    // GHSA-5w89-w975-hf9q / GHSA-9phm-9p8f-hw5m: nitro < 3.0.260429-beta.
    // Pin the first patched 3.x beta; later betas (260610) 500 SSR on Vite 8.2.
    expect(pkg.devDependencies.nitro).toBe("3.0.260429-beta");

    // GHSA-w5hq-g745-h8pq: uuid < 11.1.1. 11.1.1 keeps CJS require()
    // for @aptos-connect/web-transport; uuid 14 is ESM-only.
    expect(pkg.pnpm?.overrides?.uuid).toBe("11.1.1");

    const lock = readFileSync(resolve(rootDir, "pnpm-lock.yaml"), "utf8");
    expect(lock).toMatch(/^ {2}nitro@3\.0\.260429-beta:/m);
    expect(lock).toMatch(/^ {2}uuid@11\.1\.1:/m);
    expect(lock).not.toMatch(/^ {2}uuid@(?:[0-9]\.|10\.|11\.0\.|11\.1\.0)/m);
  });
});
