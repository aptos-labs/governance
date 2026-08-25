import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";
import {withLinkHeader} from "~/lib/agent-discovery/headers";
import {wantsMarkdown} from "~/lib/agent-discovery/http";
import {markdownFromHtmlResponse} from "~/lib/agent-discovery/markdown";

/**
 * Adds homepage Link headers and converts HTML to markdown when the
 * client sends Accept: text/markdown. Discovery JSON/XML is served by
 * dedicated server routes so this file does not import Aptos loaders.
 */
const agentReadyMiddleware = createMiddleware().server(
  async ({next, request}) => {
    // Start's SSR handler 500s unless Accept includes text/html or */*.
    // Rewrite markdown-only Accept so the page still renders, then convert.
    const markdown = wantsMarkdown(request);
    if (markdown) {
      try {
        request.headers.set("Accept", "text/html");
      } catch {
        // Request headers are immutable in some runtimes.
      }
    }

    const result = await next();
    const response = result instanceof Response ? result : result.response;
    const pathname = new URL(request.url).pathname;
    let outgoing = withLinkHeader(response, pathname);
    if (markdown) {
      try {
        outgoing =
          (await markdownFromHtmlResponse(outgoing.clone())) ?? outgoing;
      } catch {
        // Keep the original HTML if conversion fails.
      }
    }
    if (result instanceof Response) return outgoing;
    return {...result, response: outgoing};
  },
);

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, agentReadyMiddleware],
}));
