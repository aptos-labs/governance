// tests/unit/deployment-config.test.ts
import {existsSync, readFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

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

  it("exposes no client-side env vars, since config is server-only", () => {
    const example = readFileSync(resolve(rootDir, ".env.example"), "utf8");
    expect(example).not.toMatch(/^\s*VITE_/m);
  });
});
