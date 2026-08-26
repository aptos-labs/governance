import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import {SiteFooter} from "~/components/SiteFooter";
import {SiteHeader} from "~/components/SiteHeader";
import {VercelAnalytics} from "~/components/VercelAnalytics";
import {WebMcpTools} from "~/components/WebMcpTools";
import {PAGE_SHELL_WIDTH_CLASS} from "~/lib/layout";
import {AppWalletProvider} from "~/lib/wallet/provider";
import appCss from "~/styles/app.css?url";

const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("aptos-gov-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {charSet: "utf-8"},
      {name: "viewport", content: "width=device-width, initial-scale=1"},
      {title: "Aptos Governance"},
      {
        name: "description",
        content: "Aptos Governance Decentralized App.",
      },
      {property: "og:title", content: "Aptos Governance"},
      {
        property: "og:description",
        content: "Aptos Governance Decentralized App.",
      },
    ],
    links: [
      {rel: "stylesheet", href: appCss},
      {rel: "icon", type: "image/svg+xml", href: "/favicon.svg"},
      {rel: "icon", type: "image/x-icon", href: "/favicon.ico"},
      {rel: "manifest", href: "/manifest.json"},
      {rel: "api-catalog", href: "/.well-known/api-catalog"},
      {rel: "service-desc", href: "/openapi.json", type: "application/json"},
      {rel: "service-doc", href: "/docs/api", type: "text/markdown"},
      {
        rel: "describedby",
        href: "/.well-known/ai-catalog.json",
        type: "application/json",
      },
      {rel: "preconnect", href: "https://fonts.googleapis.com"},
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppWalletProvider>
        <WebMcpTools />
        <div id="app-shell">
          <SiteHeader />
          <div
            className={`mx-auto w-full ${PAGE_SHELL_WIDTH_CLASS} flex-1 px-6 pt-8`}
          >
            <Outlet />
          </div>
          <SiteFooter />
        </div>
      </AppWalletProvider>
    </RootDocument>
  );
}

function RootDocument({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{__html: THEME_BOOTSTRAP}} />
        {children}
        <VercelAnalytics />
        <Scripts />
      </body>
    </html>
  );
}
