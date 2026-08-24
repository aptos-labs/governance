import type { ProposalStatus } from "~/lib/governance/types";

const STATUS_LABEL: Record<ProposalStatus, string> = {
  active: "Active",
  passed: "Passed",
  executed: "Executed",
  failed: "Failed",
};

const STATUS_FILL_VAR: Record<ProposalStatus, string> = {
  active: "var(--color-status-active-fill)",
  passed: "var(--color-status-passed-fill)",
  executed: "var(--color-status-executed-fill)",
  failed: "var(--color-status-failed-fill)",
};

const STATUS_TEXT_VAR: Record<ProposalStatus, string> = {
  active: "var(--color-status-active-text)",
  passed: "var(--color-status-passed-text)",
  executed: "var(--color-status-executed-text)",
  failed: "var(--color-status-failed-text)",
};

export function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: STATUS_FILL_VAR[status],
        color: STATUS_TEXT_VAR[status],
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}