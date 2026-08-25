import {
  API_CATALOG_CONTENT_TYPE,
  buildApiCatalog,
} from "~/lib/agent-discovery/api-catalog";
import {buildArdCatalog} from "~/lib/agent-discovery/ard";
import {homepageLinkHeaderValue} from "~/lib/agent-discovery/headers";
import {
  asHead,
  emptyResponse,
  jsonResponse,
  methodNotAllowed,
  notFound,
  textResponse,
  wantsMarkdown,
} from "~/lib/agent-discovery/http";
import {markdownResponse} from "~/lib/agent-discovery/markdown";
import {handleMcp} from "~/lib/agent-discovery/mcp";
import {buildMcpJson, buildMcpServerCard} from "~/lib/agent-discovery/mcp-card";
import {
  buildAuthMd,
  buildAuthorizationServerMetadata,
  buildAuthorizeHtml,
  buildJwks,
  buildOpenIdConfiguration,
  buildProtectedResourceMetadata,
} from "~/lib/agent-discovery/oauth";
import {
  handleClaim,
  handleEventNotify,
  handleIdentity,
  handleRevoke,
  handleToken,
  handleUserinfo,
} from "~/lib/agent-discovery/oauth-handlers";
import {
  buildApiDocsHtml,
  buildApiDocsMarkdown,
  buildOpenApiDocument,
} from "~/lib/agent-discovery/openapi";
import {publicOrigin} from "~/lib/agent-discovery/origin";
import {
  handleGetProposal,
  handleHealth,
  handleListProposals,
  handleListVotes,
} from "~/lib/agent-discovery/rest";
import {buildRobotsTxt} from "~/lib/agent-discovery/robots";
import {buildSitemapXml} from "~/lib/agent-discovery/sitemap";
import {
  buildSkillsIndex,
  findSkill,
  skillMarkdown,
} from "~/lib/agent-discovery/skills";

const GET_HEAD = new Set(["GET", "HEAD"]);
const GET_HEAD_POST = new Set(["GET", "HEAD", "POST"]);
const GET_HEAD_POST_OPTIONS = new Set(["GET", "HEAD", "POST", "OPTIONS"]);

function maybeHead(request: Request, response: Response): Response {
  return request.method === "HEAD" ? asHead(response) : response;
}

function allow(
  request: Request,
  methods: Set<string>,
  allowHeader: string,
): Response | null {
  if (request.method === "OPTIONS") {
    return emptyResponse(204, {Allow: allowHeader});
  }
  if (!methods.has(request.method)) {
    return methodNotAllowed(allowHeader);
  }
  return null;
}

export function isAgentDiscoveryPath(pathname: string): boolean {
  if (
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/auth.md" ||
    pathname === "/openapi.json" ||
    pathname === "/docs/api" ||
    pathname === "/mcp" ||
    pathname === "/oauth2/authorize" ||
    pathname === "/oauth2/token" ||
    pathname === "/oauth2/revoke" ||
    pathname === "/oauth2/userinfo" ||
    pathname === "/agent/identity" ||
    pathname === "/agent/identity/claim" ||
    pathname === "/agent/event/notify"
  ) {
    return true;
  }
  if (pathname.startsWith("/.well-known/")) return true;
  if (pathname === "/api/health" || pathname === "/api/proposals") return true;
  if (/^\/api\/proposals\/[^/]+(?:\/votes)?$/.test(pathname)) return true;
  return false;
}

export async function handleAgentDiscoveryRequest(
  request: Request,
): Promise<Response | null> {
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  if (!isAgentDiscoveryPath(path)) return null;

  const origin = publicOrigin(request);

  if (path === "/robots.txt") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(
      request,
      textResponse(buildRobotsTxt(origin), "text/plain; charset=utf-8"),
    );
  }

  if (path === "/sitemap.xml") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    const xml = await buildSitemapXml(origin);
    return maybeHead(
      request,
      textResponse(xml, "application/xml; charset=utf-8"),
    );
  }

  if (path === "/auth.md") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, markdownResponse(buildAuthMd(origin)));
  }

  if (path === "/openapi.json") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, jsonResponse(buildOpenApiDocument(origin)));
  }

  if (path === "/docs/api") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    if (wantsMarkdown(request)) {
      return maybeHead(request, markdownResponse(buildApiDocsMarkdown(origin)));
    }
    return maybeHead(
      request,
      textResponse(buildApiDocsHtml(origin), "text/html; charset=utf-8"),
    );
  }

  if (path === "/api/health") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, handleHealth(request));
  }

  if (path === "/api/proposals") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, await handleListProposals(request));
  }

  const proposalVotes = path.match(/^\/api\/proposals\/([^/]+)\/votes$/);
  if (proposalVotes) {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(
      request,
      await handleListVotes(request, proposalVotes[1]!),
    );
  }

  const proposal = path.match(/^\/api\/proposals\/([^/]+)$/);
  if (proposal) {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, await handleGetProposal(request, proposal[1]!));
  }

  if (path === "/mcp") {
    const blocked = allow(request, GET_HEAD_POST, "GET, HEAD, POST, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, await handleMcp(request));
  }

  if (path === "/oauth2/authorize") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(
      request,
      textResponse(buildAuthorizeHtml(origin), "text/html; charset=utf-8"),
    );
  }

  if (path === "/oauth2/token") {
    const blocked = allow(
      request,
      new Set(["POST", "OPTIONS"]),
      "POST, OPTIONS",
    );
    if (blocked) return blocked;
    return handleToken(request);
  }

  if (path === "/oauth2/revoke") {
    const blocked = allow(
      request,
      new Set(["POST", "OPTIONS"]),
      "POST, OPTIONS",
    );
    if (blocked) return blocked;
    return handleRevoke(request);
  }

  if (path === "/oauth2/userinfo") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, handleUserinfo());
  }

  if (path === "/agent/identity") {
    const blocked = allow(request, GET_HEAD_POST, "GET, HEAD, POST, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, await handleIdentity(request));
  }

  if (path === "/agent/identity/claim") {
    const blocked = allow(
      request,
      GET_HEAD_POST_OPTIONS,
      "GET, HEAD, POST, OPTIONS",
    );
    if (blocked) return blocked;
    return maybeHead(request, await handleClaim(request));
  }

  if (path === "/agent/event/notify") {
    const blocked = allow(
      request,
      new Set(["POST", "OPTIONS"]),
      "POST, OPTIONS",
    );
    if (blocked) return blocked;
    return handleEventNotify();
  }

  if (path === "/.well-known/api-catalog") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    const headers = {
      Link: `</.well-known/api-catalog>; rel="api-catalog", ${homepageLinkHeaderValue()}`,
    };
    return maybeHead(
      request,
      jsonResponse(buildApiCatalog(origin), API_CATALOG_CONTENT_TYPE, headers),
    );
  }

  if (path === "/.well-known/ai-catalog.json") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(
      request,
      jsonResponse(buildArdCatalog(origin), "application/json; charset=utf-8", {
        "Access-Control-Allow-Origin": "*",
      }),
    );
  }

  if (path === "/.well-known/oauth-protected-resource") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(
      request,
      jsonResponse(buildProtectedResourceMetadata(origin)),
    );
  }

  if (path === "/.well-known/oauth-authorization-server") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(
      request,
      jsonResponse(buildAuthorizationServerMetadata(origin)),
    );
  }

  if (path === "/.well-known/openid-configuration") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, jsonResponse(buildOpenIdConfiguration(origin)));
  }

  if (path === "/.well-known/jwks.json") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, jsonResponse(buildJwks()));
  }

  if (
    path === "/.well-known/mcp/server-card.json" ||
    path === "/.well-known/mcp.json"
  ) {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    const body =
      path === "/.well-known/mcp.json"
        ? buildMcpJson(origin)
        : buildMcpServerCard(origin);
    return maybeHead(request, jsonResponse(body));
  }

  if (path === "/.well-known/agent-skills/index.json") {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    return maybeHead(request, jsonResponse(buildSkillsIndex(origin)));
  }

  const skillMatch = path.match(
    /^\/\.well-known\/agent-skills\/([^/]+)\/SKILL\.md$/,
  );
  if (skillMatch) {
    const blocked = allow(request, GET_HEAD, "GET, HEAD, OPTIONS");
    if (blocked) return blocked;
    const skill = findSkill(skillMatch[1]!);
    if (!skill) return notFound("Unknown skill");
    return maybeHead(request, markdownResponse(skillMarkdown(skill, origin)));
  }

  if (path.startsWith("/.well-known/")) {
    return notFound(`No well-known resource at ${path}`);
  }

  return notFound();
}
