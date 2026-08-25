import {absoluteUrl} from "~/lib/agent-discovery/origin";

export function discoveryLinkHeader(origin: string): string {
  const catalog = absoluteUrl(origin, "/.well-known/api-catalog");
  const openapi = absoluteUrl(origin, "/openapi.json");
  const docs = absoluteUrl(origin, "/docs/api");
  const ard = absoluteUrl(origin, "/.well-known/ai-catalog.json");
  return [
    `<${catalog}>; rel="api-catalog"`,
    `<${openapi}>; rel="service-desc"; type="application/json"`,
    `<${docs}>; rel="service-doc"; type="text/markdown"`,
    `<${ard}>; rel="describedby"; type="application/json"`,
  ].join(", ");
}

export function homepageLinkHeaderValue(): string {
  return [
    '</.well-known/api-catalog>; rel="api-catalog"',
    '</openapi.json>; rel="service-desc"; type="application/json"',
    '</docs/api>; rel="service-doc"; type="text/markdown"',
    '</.well-known/ai-catalog.json>; rel="describedby"; type="application/json"',
  ].join(", ");
}

export function isHomepagePath(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

export function withLinkHeader(response: Response, pathname: string): Response {
  if (!isHomepagePath(pathname)) return response;
  if (response.headers.has("Link")) return response;
  const headers = new Headers(response.headers);
  headers.append("Link", homepageLinkHeaderValue());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
