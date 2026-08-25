import {useEffect, useId, useRef, useState} from "react";
import {createPortal} from "react-dom";
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
  const [coords, setCoords] = useState({top: 0, left: 0});
  const tooltipId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>(0);

  function cancelClose() {
    window.clearTimeout(closeTimer.current);
  }

  function showTooltip() {
    cancelClose();
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 24));
      setCoords({top: rect.bottom + 4, left});
    }
    setOpen(true);
  }

  function hideTooltipSoon() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    return () => window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onReposition() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 24)),
      });
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
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
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltipSoon}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onFocus={showTooltip}
        onClick={showTooltip}
        className="inline-flex items-center gap-1 rounded bg-[var(--color-chip)] py-[0.15rem] pr-2 pl-4 font-mono text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-chip-hover)]"
      >
        {label ?? truncateAddress(address)}
        <Chevron direction="right" />
      </button>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltipSoon}
            style={{top: coords.top, left: coords.left}}
            className="fixed z-50 max-w-[min(90vw,42rem)] overflow-x-auto rounded bg-[var(--color-chip)] py-[0.15rem] pr-2 pl-4 shadow-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
          </div>,
          document.body,
        )}
    </div>
  );
}
