import {useWallet, type WalletInfo} from "@aptos-labs/wallet-adapter-react";
import {useState} from "react";
import {AddressChip} from "~/components/AddressChip";
import {aip62WalletIconSrc} from "~/lib/wallet/aip62-icon";

const FEATURED_WALLETS = ["Petra", "Petra Web"];

function WalletIcon({icon}: {icon: unknown}) {
  const src = aip62WalletIconSrc(icon);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={20}
      height={20}
      className="h-5 w-5 shrink-0 rounded object-contain"
      aria-hidden="true"
    />
  );
}

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
  const {connected, account, wallets, connect, disconnect} = useWallet();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (connected && account) {
    return (
      <div className="flex items-center gap-2">
        <AddressChip address={account.address.toString()} />
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded border border-[var(--color-border)] px-3 py-1 text-sm"
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
        className="rounded-lg bg-[var(--color-accent)] px-[25px] py-[10px] text-[1.1rem] font-normal text-[#121615] hover:brightness-[0.98]"
      >
        Connect Wallet
      </button>
      {pickerOpen && (
        <ul
          role="menu"
          className="absolute right-0 z-30 mt-2 min-w-56 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-paper)] p-1 shadow-lg"
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
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-border-light)]"
              >
                <WalletIcon icon={wallet.icon} />
                <span>{wallet.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
