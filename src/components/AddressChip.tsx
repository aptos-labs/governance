import {useEffect, useId, useRef, useState} from "react";
import {truncateAddress} from "~/lib/governance/format";

function explorerAccountUrl(address: string): string {
  return `https://explorer.aptoslabs.com/account/${address}?network=mainnet`;
}

function Chevron({direction}: {direction: "left" | "right"}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      className="opacity-75"
    >
      {direction === "right" ? (
        <path
          fill="currentColor"
          d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
        />
      ) : (
        <path
          fill="currentColor"
          d="m14 6-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"
        />
      )}
    </svg>
  );
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
        className="inline-flex items-center gap-1 rounded bg-[var(--color-chip)] py-[0.15rem] pr-2 pl-4 font-mono text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-chip-hover)]"
      >
        {label ?? truncateAddress(address)}
        <Chevron direction="right" />
      </button>
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-1/2 z-30 max-w-[min(90vw,42rem)] -translate-y-1/2 overflow-x-auto rounded bg-[var(--color-chip)] py-[0.15rem] pr-2 pl-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex items-center gap-2">
            <a
              href={explorerAccountUrl(address)}
              target="_blank"
              rel="noreferrer noopener"
              className="whitespace-nowrap font-mono text-sm text-[var(--color-text-primary)] underline"
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
            <button
              type="button"
              aria-label="Hide address"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
              }}
              className="shrink-0 text-[var(--color-text-primary)]"
            >
              <Chevron direction="left" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
