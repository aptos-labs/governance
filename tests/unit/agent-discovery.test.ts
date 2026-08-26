import {readFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {handleAgentDiscoveryRequest} from "~/lib/agent-discovery/dispatch";
import {homepageLinkHeaderValue} from "~/lib/agent-discovery/headers";
import {wantsMarkdown} from "~/lib/agent-discovery/http";
import {
  countMarkdownTokens,
  htmlToMarkdown,
} from "~/lib/agent-discovery/markdown";
import {
  buildAuthMd,
  buildAuthorizationServerMetadata,
  buildProtectedResourceMetadata,
} from "~/lib/agent-discovery/oauth";
import {absoluteUrl, publicOrigin} from "~/lib/agent-discovery/origin";
import {buildRobotsTxt} from "~/lib/agent-discovery/robots";
import {
  buildSkillsIndex,
  GOVERNANCE_SKILLS,
  skillDigest,
  skillMarkdown,
} from "~/lib/agent-discovery/skills";

vi.mock("~/lib/governance/load-forum", () => ({
  loadProposalCount: vi.fn(async () => 2),
  loadVotingForum: vi.fn(),
}));

const ORIGIN = "https://governance.example.test";

const previousSiteOrigin = process.env.SITE_ORIGIN;

beforeEach(() => {
  delete process.env.SITE_ORIGIN;
});

afterEach(() => {
  if (previousSiteOrigin === undefined) delete process.env.SITE_ORIGIN;
  else process.env.SITE_ORIGIN = previousSiteOrigin;
});

function req(path: string, init: RequestInit = {}, origin = ORIGIN): Request {
  return new Request(`${origin}${path}`, init);
}

async function dispatch(path: string, init?: RequestInit): Promise<Response> {
  const response = await handleAgentDiscoveryRequest(req(path, init));
  if (!response) throw new Error(`No handler for ${path}`);
  return response;
}

describe("publicOrigin", () => {
  it("prefers SITE_ORIGIN over the request URL", () => {
    process.env.SITE_ORIGIN = "https://governance.aptosfoundation.org";
    expect(publicOrigin(req("/"))).toBe(
      "https://governance.aptosfoundation.org",
    );
  });

  it("uses x-forwarded-host when SITE_ORIGIN is unset", () => {
    delete process.env.SITE_ORIGIN;
    const request = new Request("http://127.0.0.1/internal", {
      headers: {
        "x-forwarded-host": "governance.aptosfoundation.org",
        "x-forwarded-proto": "https",
      },
    });
    expect(publicOrigin(request)).toBe(
      "https://governance.aptosfoundation.org",
    );
  });
});

describe("robots.txt and sitemap", () => {
  it("declares Content-Signal preferences and a Sitemap URL", async () => {
    const body = buildRobotsTxt(ORIGIN);
    expect(body).toMatch(
      /Content-Signal: ai-train=no, search=yes, ai-input=yes/,
    );
    expect(body).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(body).toContain(`Agentmap: ${ORIGIN}/.well-known/ai-catalog.json`);

    const response = await dispatch("/robots.txt");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/plain/);
    expect(await response.text()).toBe(body);
  });

  it("lists canonical proposal URLs in sitemap.xml", async () => {
    const response = await dispatch("/sitemap.xml");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/xml/);
    const xml = await response.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain(`${ORIGIN}/`);
    expect(xml).toContain(`${ORIGIN}/proposal/0`);
    expect(xml).toContain(`${ORIGIN}/proposal/1`);
    expect(xml).not.toContain(`${ORIGIN}/proposal/2`);
  });
});

describe("discovery documents", () => {
  it("serves an RFC 9727 api-catalog linkset", async () => {
    const response = await dispatch("/.well-known/api-catalog");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(
      /application\/linkset\+json/,
    );
    const body = (await response.json()) as {
      linkset: Array<{
        anchor: string;
        "service-desc": unknown;
        "service-doc": unknown;
        status: unknown;
      }>;
    };
    expect(body.linkset.length).toBeGreaterThan(0);
    for (const entry of body.linkset) {
      expect(entry.anchor).toMatch(/^https?:\/\//);
      expect(entry["service-desc"]).toBeDefined();
      expect(entry["service-doc"]).toBeDefined();
      expect(entry.status).toBeDefined();
    }
  });

  it("serves ARD ai-catalog.json with CORS", async () => {
    const response = await dispatch("/.well-known/ai-catalog.json");
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const body = (await response.json()) as {
      specVersion: string;
      host: {displayName: string; identifier: string};
      entries: Array<{
        identifier: string;
        displayName: string;
        type: string;
        url?: string;
        data?: unknown;
        representativeQueries: string[];
      }>;
    };
    expect(body.specVersion).toBeTruthy();
    expect(body.host.displayName).toBe("Aptos Governance");
    expect(body.entries.length).toBeGreaterThan(0);
    for (const entry of body.entries) {
      expect(entry.identifier).toMatch(/^urn:air:/);
      expect(entry.type).toBeTruthy();
      expect(Boolean(entry.url) !== Boolean(entry.data)).toBe(true);
      expect(entry.representativeQueries.length).toBeGreaterThanOrEqual(2);
      expect(entry.representativeQueries.length).toBeLessThanOrEqual(5);
    }
  });

  it("publishes OAuth PRM, AS metadata, and OpenID configuration", async () => {
    const prmRes = await dispatch("/.well-known/oauth-protected-resource");
    const asRes = await dispatch("/.well-known/oauth-authorization-server");
    const oidcRes = await dispatch("/.well-known/openid-configuration");
    expect(prmRes.status).toBe(200);
    expect(asRes.status).toBe(200);
    expect(oidcRes.status).toBe(200);

    const prm = (await prmRes.json()) as ReturnType<
      typeof buildProtectedResourceMetadata
    >;
    const as = (await asRes.json()) as ReturnType<
      typeof buildAuthorizationServerMetadata
    >;
    const oidc = (await oidcRes.json()) as {
      issuer: string;
      authorization_endpoint: string;
      token_endpoint: string;
      jwks_uri: string;
      grant_types_supported: string[];
      response_types_supported: string[];
    };

    expect(prm.resource).toBe(`${ORIGIN}/`);
    expect(prm.authorization_servers).toEqual([ORIGIN]);
    expect(prm.bearer_methods_supported).toContain("header");
    expect(as.issuer).toBe(ORIGIN);
    expect(as.agent_auth.register_uri).toContain("/agent/identity");
    expect(as.agent_auth.skill).toBe(`${ORIGIN}/auth.md`);
    expect(oidc.issuer).toBe(as.issuer);
    expect(oidc.authorization_endpoint).toBeTruthy();
    expect(oidc.token_endpoint).toBeTruthy();
    expect(oidc.jwks_uri).toBeTruthy();
    expect(oidc.grant_types_supported.length).toBeGreaterThan(0);
    expect(oidc.response_types_supported.length).toBeGreaterThan(0);
  });

  it("serves auth.md with the required heading", async () => {
    const response = await dispatch("/auth.md");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/markdown/);
    const body = await response.text();
    expect(body).toMatch(/^# auth\.md/m);
    expect(body).toContain("/agent/identity");
  });

  it("keeps public markdown artifacts identical to the generated documents", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    expect(readFileSync(resolve(root, "public/auth.md"), "utf8")).toBe(
      buildAuthMd(),
    );
    for (const skill of GOVERNANCE_SKILLS) {
      const file = readFileSync(
        resolve(root, `public/.well-known/agent-skills/${skill.name}/SKILL.md`),
        "utf8",
      );
      expect(file).toBe(skill.markdown);
    }
  });

  it("serves an MCP server card with serverInfo, transport, and capabilities", async () => {
    const response = await dispatch("/.well-known/mcp/server-card.json");
    expect(response.status).toBe(200);
    const card = (await response.json()) as {
      serverInfo: {name: string; version: string};
      transport: {endpoint: string};
      capabilities: unknown;
    };
    expect(card.serverInfo.name).toBe("aptos-governance");
    expect(card.serverInfo.version).toBeTruthy();
    expect(card.transport.endpoint).toBe("/mcp");
    expect(card.capabilities).toBeTruthy();
  });

  it("publishes an agent-skills index with matching sha256 digests", async () => {
    const response = await dispatch("/.well-known/agent-skills/index.json");
    expect(response.status).toBe(200);
    const index = (await response.json()) as ReturnType<
      typeof buildSkillsIndex
    >;
    expect(index.$schema).toBe(
      "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    );
    expect(index.skills).toHaveLength(GOVERNANCE_SKILLS.length);
    for (const skill of index.skills) {
      expect(skill.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(skill.type).toBe("skill-md");
      const artifact = await dispatch(
        `/.well-known/agent-skills/${skill.name}/SKILL.md`,
      );
      expect(artifact.status).toBe(200);
      const markdown = await artifact.text();
      expect(skill.digest).toBe(skillDigest(markdown));
      expect(markdown).toBe(
        skillMarkdown(
          GOVERNANCE_SKILLS.find((item) => item.name === skill.name)!,
          ORIGIN,
        ),
      );
    }
  });
});

describe("oauth registration", () => {
  it("issues an anonymous credential and exchanges it at the token endpoint", async () => {
    const register = await dispatch("/agent/identity", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({type: "anonymous"}),
    });
    expect(register.status).toBe(200);
    const issued = (await register.json()) as {
      access_token: string;
      identity_assertion: string;
    };
    expect(issued.access_token).toBeTruthy();

    const token = await dispatch("/oauth2/token", {
      method: "POST",
      headers: {"content-type": "application/x-www-form-urlencoded"},
      body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${issued.identity_assertion}`,
    });
    expect(token.status).toBe(200);
    const exchanged = (await token.json()) as {access_token: string};
    expect(exchanged.access_token).toBeTruthy();
  });
});

describe("markdown negotiation helpers", () => {
  it("prefers text/markdown when it is the Accept type", () => {
    expect(wantsMarkdown(req("/", {headers: {accept: "text/markdown"}}))).toBe(
      true,
    );
    expect(wantsMarkdown(req("/", {headers: {accept: "text/html"}}))).toBe(
      false,
    );
  });

  it("converts HTML main content to markdown", () => {
    const md = htmlToMarkdown(`
      <html><head><title>Hello</title></head>
      <body>
        <main>
          <h1>Hello</h1>
          <p>See <a href="/docs/api">the docs</a>.</p>
        </main>
      </body></html>
    `);
    expect(md).toContain("# Hello");
    expect(md).toContain("[the docs](/docs/api)");
    expect(countMarkdownTokens(md)).toBeGreaterThan(0);
  });
});

describe("link headers", () => {
  it("includes registered relation types", () => {
    const value = homepageLinkHeaderValue();
    expect(value).toContain('rel="api-catalog"');
    expect(value).toContain('rel="service-desc"');
    expect(value).toContain('rel="service-doc"');
    expect(value).toContain('rel="describedby"');
  });
});

describe("absoluteUrl", () => {
  it("joins origin and path", () => {
    expect(absoluteUrl("https://example.com/", "/x")).toBe(
      "https://example.com/x",
    );
  });
});
