import {expect, test} from "@playwright/test";

test("publishes agent discovery documents", async ({request}) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsBody = await robots.text();
  expect(robotsBody).toContain("Content-Signal:");
  expect(robotsBody).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain("<urlset");

  const catalog = await request.get("/.well-known/api-catalog");
  expect(catalog.ok()).toBeTruthy();
  expect(catalog.headers()["content-type"]).toMatch(/linkset\+json/);

  const ard = await request.get("/.well-known/ai-catalog.json");
  expect(ard.ok()).toBeTruthy();
  expect(ard.headers()["access-control-allow-origin"]).toBe("*");

  const skills = await request.get("/.well-known/agent-skills/index.json");
  expect(skills.ok()).toBeTruthy();
  const index = (await skills.json()) as {skills: unknown[]};
  expect(index.skills.length).toBeGreaterThan(0);

  const card = await request.get("/.well-known/mcp/server-card.json");
  expect(card.ok()).toBeTruthy();

  const auth = await request.get("/auth.md");
  expect(auth.ok()).toBeTruthy();
  expect(await auth.text()).toMatch(/auth\.md/i);

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
});

test("homepage advertises Link relations and markdown negotiation", async ({
  page,
  request,
}) => {
  const html = await request.get("/", {headers: {accept: "text/html"}});
  expect(html.ok()).toBeTruthy();
  const link = html.headers().link ?? "";
  expect(link).toMatch(/rel="?api-catalog"?/);

  const markdown = await request.get("/", {
    headers: {accept: "text/markdown"},
  });
  expect(markdown.ok()).toBeTruthy();
  expect(markdown.headers()["content-type"]).toMatch(/text\/markdown/);
  expect(markdown.headers()["x-markdown-tokens"]).toBeTruthy();

  await page.addInitScript(() => {
    const tools: string[] = [];
    const modelContext = {
      registerTool: async (tool: {name: string}) => {
        tools.push(tool.name);
      },
      provideContext: async (input: {tools: Array<{name: string}>}) => {
        for (const tool of input.tools) tools.push(tool.name);
      },
    };
    Object.defineProperty(navigator, "modelContext", {
      configurable: true,
      value: modelContext,
    });
    (window as unknown as {__webmcpTools: string[]}).__webmcpTools = tools;
  });

  await page.goto("/");
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (window as unknown as {__webmcpTools?: string[]}).__webmcpTools ?? [],
      ),
    )
    .toEqual(expect.arrayContaining(["list_proposals", "get_proposal"]));
});
