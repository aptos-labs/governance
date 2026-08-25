import {STATUS_DISPLAY} from "~/lib/governance/status";
import type {ProposalStatus} from "~/lib/governance/types";

const STATUS_COLOR: Record<ProposalStatus, string> = {
  active: "var(--color-text-disabled)",
  passed: "var(--color-warning)",
  executed: "var(--color-accent)",
  failed: "var(--color-vote-against)",
};

export function statusColor(status: ProposalStatus): string {
  return STATUS_COLOR[status];
}

export function StatusIcon({status}: {status: ProposalStatus}) {
  const color = STATUS_COLOR[status];

  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="currentColor"
      style={{color, flexShrink: 0}}
    >
      {status === "active" && (
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
      )}
      {status === "passed" && (
        <path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 4.42-3.58 8-8 8s-8-3.58-8-8c0-4.08 3.05-7.44 7-7.93V2.05C5.06 2.55 2 6.81 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.19-3.06-9.45-7-9.95zM12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" />
      )}
      {status === "executed" && (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      )}
      {status === "failed" && (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      )}
    </svg>
  );
}

export function StatusLabel({status}: {status: ProposalStatus}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusIcon status={status} />
      <span style={{color: STATUS_COLOR[status]}}>
        {STATUS_DISPLAY[status]}
      </span>
    </span>
  );
}
