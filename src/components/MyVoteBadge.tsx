// src/components/MyVoteBadge.tsx

export function MyVoteBadge({ shouldPass }: { shouldPass: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: shouldPass
          ? "var(--color-status-passed-fill)"
          : "var(--color-status-failed-fill)",
        color: shouldPass
          ? "var(--color-status-passed-text)"
          : "var(--color-status-failed-text)",
      }}
    >
      {shouldPass ? "You voted Yes" : "You voted No"}
    </span>
  );
}