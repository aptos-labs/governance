import {existsSync, readFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {expect, it} from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

type VercelConfig = {
  framework?: string;
  installCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
  rewrites?: Array<{source: string; destination: string}>;
};

it("deploys as a Vite SPA on Vercel instead of Netlify", () => {
  expect(existsSync(resolve(root, "netlify.toml"))).toBe(false);
  expect(existsSync(resolve(root, "public/_redirects"))).toBe(false);

  const vercel: VercelConfig = JSON.parse(
    readFileSync(resolve(root, "vercel.json"), "utf8"),
  );

  expect(vercel.framework).toBe("vite");
  expect(vercel.installCommand).toBe("pnpm install --frozen-lockfile");
  expect(vercel.buildCommand).toBe("pnpm run build");
  expect(vercel.outputDirectory).toBe("dist");
  expect(vercel.rewrites).toEqual([
    {source: "/(.*)", destination: "/index.html"},
  ]);

  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  expect(pkg.engines?.node).toBe("22.x");
});
