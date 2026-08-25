#!/usr/bin/env node
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createServer} from "vite";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const server = await createServer({
  configFile: false,
  root: rootDir,
  resolve: {
    alias: {
      "~": path.join(rootDir, "src"),
    },
  },
  server: {middlewareMode: true},
  appType: "custom",
});

try {
  const mod = await server.ssrLoadModule(
    path.join(rootDir, "src/notifications-worker.ts"),
  );
  const code = await mod.main(process.argv.slice(2));
  process.exitCode = typeof code === "number" ? code : 0;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await server.close();
}
