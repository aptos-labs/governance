import {Link} from "@tanstack/react-router";
import logoIcon from "~/assets/svg/aptos_logo_icon.svg";
import {BrandMark} from "~/components/BrandMark";
import {ThemeToggle} from "~/components/ThemeToggle";
import {WalletConnectButton} from "~/components/WalletConnectButton";
import {PAGE_SHELL_WIDTH_CLASS} from "~/lib/layout";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-transparent bg-[var(--color-canvas)]/80 backdrop-blur-[10px]">
      <div
        className={`mx-auto flex h-20 ${PAGE_SHELL_WIDTH_CLASS} items-center gap-4 px-6`}
      >
        <Link
          to="/"
          search={{page: 0, status: "all"}}
          className="mr-auto block"
        >
          <BrandMark
            src={logoIcon}
            label="Aptos Governance"
            className="h-[30px] w-[30px] md:h-10 md:w-10"
          />
        </Link>
        <span
          className="rounded border border-[var(--color-border)] px-3 py-1 text-sm capitalize text-[var(--color-text-primary)]"
          title="This app reads mainnet governance state"
        >
          mainnet
        </span>
        <Link
          to="/delegation"
          className="hidden text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] sm:inline"
        >
          My Delegation
        </Link>
        <ThemeToggle />
        <div className="sm:hidden">
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
