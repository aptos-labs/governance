import { useState } from "react";
import { useWallet, type WalletInfo } from "@aptos-labs/wallet-adapter-react";
import { truncateAddress } from "~/lib/governance/format";

const FEATURED_WALLETS = ["Petra", "Petra Web"];

function sortWithFeaturedFirst(wallets: readonly WalletInfo[]) {
  return [...wallets].sort((a, b) => {
    const aFeatured = FEATURED_WALLETS.indexOf(a.name);
    const bFeatured = FEATURED_WALLETS.indexOf(b.name);
    if (aFeatured === -1 && bFeatured === -1) return 0;
    if (aFeatured === -1) return 1;
    if (bFeatured === -1) return -1;
    return aFeatured - bFeatured;
  });
}

export function WalletConnectButton() {
  const { connected, account, wallets, connect, disconnect } = useWallet();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (connected && account) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">
          {truncateAddress(account.address.toString())}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPickerOpen((open) => !open)}
        className="rounded-full bg-[var(--color-text-primary)] px-4 py-1.5 text-sm font-semibold text-[var(--color-canvas)]"
      >
        Connect Wallet
      </button>
      {pickerOpen && (
        <ul
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-paper)] p-1 shadow-lg"
        >
          {sortWithFeaturedFirst(wallets).map((wallet) => (
            <li key={wallet.name} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  connect(wallet.name);
                  setPickerOpen(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-border-light)]"
              >
                {wallet.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}