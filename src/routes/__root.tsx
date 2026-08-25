import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import {SiteFooter} from "~/components/SiteFooter";
import {SiteHeader} from "~/components/SiteHeader";
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
      {rel: "icon", type: "image/x-icon", href: "/favicon.ico"},
      {rel: "manifest", href: "/manifest.json"},
      {rel: "preconnect", href: "https://fonts.googleapis.com"},
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700&family=IBM+Plex+Serif:ital,wght@0,500;0,600;0,700&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppWalletProvider>
        <div id="app-shell">
          <SiteHeader />
          <div className="mx-auto w-full max-w-7xl flex-1 px-6 pt-8">
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
        <Scripts />
      </body>
    </html>
  );
}
