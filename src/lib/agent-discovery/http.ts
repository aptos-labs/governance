export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Accept, Authorization, Content-Type, MCP-Protocol-Version",
  "Access-Control-Expose-Headers": "Link, x-markdown-tokens, WWW-Authenticate",
} as const;

export const DISCOVERY_CACHE_CONTROL = "public, max-age=300";

export function textResponse(
  body: string,
  contentType: string,
  extraHeaders: Record<string, string> = {},
  status = 200,
): Response {
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": DISCOVERY_CACHE_CONTROL,
    ...CORS_HEADERS,
    ...extraHeaders,
  });
  return new Response(body, {status, headers});
}

export function jsonResponse(
  body: unknown,
  contentType = "application/json; charset=utf-8",
  extraHeaders: Record<string, string> = {},
  status = 200,
): Response {
  return textResponse(
    `${JSON.stringify(body, null, 2)}\n`,
    contentType,
    extraHeaders,
    status,
  );
}

export function emptyResponse(
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": DISCOVERY_CACHE_CONTROL,
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export function methodNotAllowed(allow: string): Response {
  return textResponse(
    "Method not allowed\n",
    "text/plain; charset=utf-8",
    {
      Allow: allow,
    },
    405,
  );
}

export function notFound(message = "Not found"): Response {
  return jsonResponse(
    {error: message},
    "application/json; charset=utf-8",
    {},
    404,
  );
}

export function asHead(response: Response): Response {
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}

export function wantsMarkdown(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  if (!accept) return false;
  const markdown = qValue(accept, "text/markdown");
  if (markdown <= 0) return false;
  const html = qValue(accept, "text/html");
  const json = qValue(accept, "application/json");
  const any = qValue(accept, "*/*");
  // Prefer markdown when it is explicitly listed and not outranked.
  const bestAlternative = Math.max(html, json, any > 0 && html === 0 ? 0 : any);
  return markdown >= bestAlternative;
}

function qValue(accept: string, type: string): number {
  const parts = accept.split(",").map((part) => part.trim());
  for (const part of parts) {
    const [rawType, ...params] = part.split(";").map((item) => item.trim());
    if (!rawType) continue;
    const matches =
      rawType === type ||
      (rawType.endsWith("/*") && type.startsWith(rawType.slice(0, -1)));
    if (!matches) continue;
    const qParam = params.find((param) => param.startsWith("q="));
    const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
    if (Number.isFinite(q)) return q;
    return 1;
  }
  return 0;
}
