import {useEffect, useId, useRef, useState} from "react";
import {truncateAddress} from "~/lib/governance/format";

function explorerAccountUrl(address: string): string {
  return `https://explorer.aptoslabs.com/account/${address}?network=mainnet`;
}

export function AddressChip({
  address,
  label,
}: {
  address: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const tooltipId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function copyAddress(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      ref={rootRef}
      data-testid="address-chip"
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded bg-[var(--color-chip)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-chip-hover)]"
      >
        {label ?? truncateAddress(address)}
        <span aria-hidden="true" className="opacity-50">
          ›
        </span>
      </button>
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1 min-w-max max-w-[min(90vw,36rem)] rounded bg-[var(--color-chip)] px-3 py-1 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <a
              href={explorerAccountUrl(address)}
              target="_blank"
              rel="noreferrer noopener"
              className="break-all font-mono text-xs text-[var(--color-text-primary)] underline"
            >
              {address}
            </a>
            <button
              type="button"
              onClick={copyAddress}
              aria-label={copied ? "Address copied" : "Copy address"}
              className="shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-paper)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)] hover:bg-[var(--color-chip-hover)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
