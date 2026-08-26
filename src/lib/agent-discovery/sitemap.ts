import {absoluteUrl} from "~/lib/agent-discovery/origin";
import {loadProposalCount} from "~/lib/governance/load-forum";

const SITEMAP_URL_LIMIT = 50_000;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function urlEntry(loc: string, changefreq: string, priority: string): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

export async function buildSitemapXml(origin: string): Promise<string> {
  const entries = [
    urlEntry(absoluteUrl(origin, "/"), "hourly", "1.0"),
    urlEntry(absoluteUrl(origin, "/delegation"), "daily", "0.4"),
    urlEntry(absoluteUrl(origin, "/docs/api"), "weekly", "0.5"),
    urlEntry(absoluteUrl(origin, "/auth.md"), "weekly", "0.3"),
  ];

  let proposalCount = 0;
  try {
    proposalCount = await loadProposalCount();
  } catch {
    proposalCount = 0;
  }

  const maxId = Math.min(proposalCount, SITEMAP_URL_LIMIT - entries.length) - 1;
  for (let id = 0; id <= maxId; id++) {
    entries.push(
      urlEntry(absoluteUrl(origin, `/proposal/${id}`), "hourly", "0.8"),
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}
