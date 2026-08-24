import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import appCss from "~/styles/app.css?url";
import { AppWalletProvider } from "~/lib/wallet/provider";
import { WalletConnectButton } from "~/components/WalletConnectButton";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aptos Gov" },
      {
        name: "description",
        content: "Delegated governance voting for the Aptos network.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppWalletProvider>
        <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <a href="/" className="font-serif text-lg font-semibold">
            Aptos Gov
          </a>
          <WalletConnectButton />
        </header>
        <Outlet />
      </AppWalletProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}