// vitest.config.ts
import path from "node:path";
import {fileURLToPath} from "node:url";
import {defineConfig} from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(rootDir, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
  },
});
