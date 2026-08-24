import { formatOctasToApt } from "~/lib/governance/format";

export function VoteBar({
  yesVotes,
  noVotes,
  minVoteThreshold,
}: {
  yesVotes: bigint;
  noVotes: bigint;
  minVoteThreshold: bigint;
}) {
  const total = yesVotes + noVotes;
  const yesPct = total > 0n ? Number((yesVotes * 1000n) / total) / 10 : 0;
  const noPct = total > 0n ? Number((noVotes * 1000n) / total) / 10 : 0;
  const thresholdMet = total >= minVoteThreshold;

  return (
    <div>
      <div
        className="flex h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-border-light)" }}
      >
        <div
          style={{ width: `${yesPct}%`, backgroundColor: "var(--color-status-passed-fill)" }}
        />
        <div
          style={{ width: `${noPct}%`, backgroundColor: "var(--color-status-failed-fill)" }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-[var(--color-text-secondary)]">
        <span>
          {formatOctasToApt(yesVotes)} APT for &middot; {formatOctasToApt(noVotes)} APT against
        </span>
        <span>{thresholdMet ? "Threshold met" : "Threshold not yet met"}</span>
      </div>
    </div>
  );
}
