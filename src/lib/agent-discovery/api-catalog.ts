import {absoluteUrl} from "~/lib/agent-discovery/origin";

export function buildApiCatalog(origin: string) {
  return {
    linkset: [
      {
        anchor: absoluteUrl(origin, "/api/proposals"),
        "service-desc": [
          {
            href: absoluteUrl(origin, "/openapi.json"),
            type: "application/json",
          },
        ],
        "service-doc": [
          {
            href: absoluteUrl(origin, "/docs/api"),
            type: "text/markdown",
          },
        ],
        status: [
          {
            href: absoluteUrl(origin, "/api/health"),
            type: "application/json",
          },
        ],
      },
      {
        anchor: absoluteUrl(origin, "/mcp"),
        "service-desc": [
          {
            href: absoluteUrl(origin, "/.well-known/mcp/server-card.json"),
            type: "application/json",
          },
        ],
        "service-doc": [
          {
            href: absoluteUrl(origin, "/docs/api"),
            type: "text/markdown",
          },
        ],
        status: [
          {
            href: absoluteUrl(origin, "/api/health"),
            type: "application/json",
          },
        ],
      },
    ],
  };
}

export const API_CATALOG_CONTENT_TYPE =
  'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';
