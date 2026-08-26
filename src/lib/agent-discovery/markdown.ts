function stripSection(html: string, tag: string): string {
  const pattern = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  return html.replace(pattern, " ");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function collapseBlankLines(value: string): string {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function convertInline(html: string): string {
  return decodeEntities(
    html
      .replace(
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
        (_, href, text) => {
          const label = convertInline(text).replace(/\s+/g, " ").trim();
          return label ? `[${label}](${href})` : href;
        },
      )
      .replace(/<\/?(strong|b)>/gi, "**")
      .replace(/<\/?(em|i)>/gi, "_")
      .replace(
        /<code[^>]*>([\s\S]*?)<\/code>/gi,
        (_, code) => `\`${decodeEntities(code)}\``,
      )
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  );
}

/**
 * Lightweight HTML → Markdown for agent Accept: text/markdown.
 * Prefers <main> when present and strips scripts/styles/chrome noise.
 */
export function htmlToMarkdown(html: string): string {
  let source = html;
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch?.[1]) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? convertInline(titleMatch[1]).trim() : "";
    source = title ? `<h1>${title}</h1>${mainMatch[1]}` : mainMatch[1];
  }

  source = stripSection(source, "script");
  source = stripSection(source, "style");
  source = stripSection(source, "noscript");
  source = stripSection(source, "svg");

  source = source.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, level, inner) => {
      const hashes = "#".repeat(Number(level));
      return `\n\n${hashes} ${convertInline(inner).trim()}\n\n`;
    },
  );
  source = source.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => {
    return `\n\n${convertInline(inner).trim()}\n\n`;
  });
  source = source.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => {
    return `\n- ${convertInline(inner).trim()}`;
  });
  source = source.replace(/<\/?(ul|ol)[^>]*>/gi, "\n");
  source = source.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => {
    return `\n\n\`\`\`\n${decodeEntities(inner.replace(/<[^>]+>/g, "")).trim()}\n\`\`\`\n\n`;
  });
  source = source.replace(/<[^>]+>/g, " ");
  return collapseBlankLines(decodeEntities(source));
}

export function countMarkdownTokens(markdown: string): number {
  const tokens = markdown.trim().split(/\s+/).filter(Boolean);
  return tokens.length;
}

export async function markdownFromHtmlResponse(
  htmlResponse: Response,
): Promise<Response | null> {
  const contentType = htmlResponse.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return null;
  const html = await htmlResponse.text();
  const markdown = htmlToMarkdown(html);
  const tokens = countMarkdownTokens(markdown);
  const headers = new Headers(htmlResponse.headers);
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  headers.set("x-markdown-tokens", String(tokens));
  headers.delete("content-length");
  return new Response(markdown, {
    status: htmlResponse.status,
    statusText: htmlResponse.statusText,
    headers,
  });
}

export function markdownResponse(
  markdown: string,
  extraHeaders: Record<string, string> = {},
): Response {
  const tokens = countMarkdownTokens(markdown);
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "x-markdown-tokens": String(tokens),
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300",
    ...extraHeaders,
  });
  return new Response(markdown, {headers});
}
