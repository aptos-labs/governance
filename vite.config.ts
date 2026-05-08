import {defineConfig, loadEnv} from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

function normalizeBasePath(basePath?: string): string {
  if (!basePath) return "/";
  const trimmed = basePath.trim();
  if (trimmed === "" || trimmed === "/") return "/";
  const withoutEdges = trimmed.replace(/^\/+|\/+$/g, "");
  return `/${withoutEdges}/`;
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = normalizeBasePath(env.VITE_BASE_PATH);

  return {
    base,
    plugins: [
      react(),
      svgr(),
      {
        name: "html-base-url",
        transformIndexHtml(html) {
          return html.replace(/%BASE_URL%/g, base);
        },
      },
    ],
    test: {
      environment: "jsdom",
      globals: true,
    },
  };
});
