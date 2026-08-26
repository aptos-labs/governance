import {absoluteUrl} from "~/lib/agent-discovery/origin";

export function buildRobotsTxt(origin: string): string {
  const sitemap = absoluteUrl(origin, "/sitemap.xml");
  const agentmap = absoluteUrl(origin, "/.well-known/ai-catalog.json");
  return [
    "User-agent: *",
    "Allow: /",
    "Allow: /proposal/",
    "Allow: /delegation",
    "Allow: /docs/",
    "Allow: /api/",
    "Allow: /.well-known/",
    "Allow: /sitemap.xml",
    "Allow: /auth.md",
    "Allow: /openapi.json",
    "Disallow: /_serverFn",
    "Disallow: /_tanstack",
    "Content-Signal: ai-train=no, search=yes, ai-input=yes",
    "",
    `Sitemap: ${sitemap}`,
    `Agentmap: ${agentmap}`,
    "",
  ].join("\n");
}
