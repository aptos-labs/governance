import {formatOctasToApt} from "~/lib/governance/format";

const BAR_RADIUS = "0.7em";

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
  const participationPct =
    minVoteThreshold > 0n
      ? Math.min(100, Number((total * 1000n) / minVoteThreshold) / 10)
      : 0;

  return (
    <div className="space-y-4">
      <ResultBar
        label="FOR"
        color="var(--color-vote-for)"
        amount={yesVotes}
        percentage={yesPct}
      />
      <ResultBar
        label="AGAINST"
        color="var(--color-vote-against)"
        amount={noVotes}
        percentage={noPct}
      />
      <div>
        <div className="mb-1 flex justify-between px-0.5 text-sm uppercase tracking-wide">
          <span className="text-[var(--color-text-disabled)]">
            Participation
          </span>
          <span>{participationPct.toFixed(0)}%</span>
        </div>
        <Meter
          percentage={participationPct}
          color="var(--color-text-disabled)"
        />
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {formatOctasToApt(yesVotes)} APT for · {formatOctasToApt(noVotes)} APT
          against
          {" · "}
          {thresholdMet ? "Threshold met" : "Threshold not yet met"}
          {" · min "}
          {formatOctasToApt(minVoteThreshold, 0)} APT
        </p>
      </div>
    </div>
  );
}

function ResultBar({
  label,
  color,
  amount,
  percentage,
}: {
  label: string;
  color: string;
  amount: bigint;
  percentage: number;
}) {
  return (
    <div title={`${formatOctasToApt(amount, 8)} APT`}>
      <div className="mb-1 flex justify-between px-0.5 text-sm uppercase tracking-wide">
        <span style={{color}}>{label}</span>
        <span>
          {formatOctasToApt(amount)} APT {percentage.toFixed(0)}%
        </span>
      </div>
      <Meter percentage={percentage} color={color} />
    </div>
  );
}

function Meter({percentage, color}: {percentage: number; color: string}) {
  const filled = Math.min(100, Math.max(0, percentage));
  const remainder = 100 - filled;
  return (
    <div
      className="flex"
      style={{borderRadius: BAR_RADIUS, overflow: "hidden"}}
    >
      <div
        style={{
          width: `${filled}%`,
          paddingTop: BAR_RADIUS,
          backgroundColor: color,
        }}
      />
      <div
        style={{
          width: `${remainder}%`,
          paddingTop: BAR_RADIUS,
          backgroundColor: "var(--color-chip)",
        }}
      />
    </div>
  );
}
