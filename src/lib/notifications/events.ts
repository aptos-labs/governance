import type {ProposalStatus} from "~/lib/governance/types";
import type {
  PollSnapshot,
  ProposalEvent,
  ProposalWatchState,
  ReminderWindow,
  WatchedProposal,
} from "~/lib/notifications/types";
import {EMPTY_SNAPSHOT} from "~/lib/notifications/types";

const HOUR_SECS = 3600n;
export const REMINDER_24H_SECS = 24n * HOUR_SECS;
export const REMINDER_6H_SECS = 6n * HOUR_SECS;

export function idsToFetch(
  snapshot: PollSnapshot,
  nextProposalId: number,
): string[] {
  const ids = new Set<string>();
  if (!snapshot.initialized) {
    for (let id = 0; id < nextProposalId; id++) {
      ids.add(String(id));
    }
    return [...ids];
  }

  for (let id = snapshot.nextProposalId; id < nextProposalId; id++) {
    ids.add(String(id));
  }
  for (const id of Object.keys(snapshot.proposals)) {
    ids.add(id);
  }
  return [...ids];
}

function toEvent(
  type: ProposalEvent["type"],
  proposal: WatchedProposal,
  extra: Partial<Pick<ProposalEvent, "remainingSecs" | "reminderWindow">> = {},
): ProposalEvent {
  return {
    type,
    proposalId: proposal.proposalId,
    status: proposal.status,
    title: proposal.title,
    yesVotes: proposal.yesVotes.toString(),
    noVotes: proposal.noVotes.toString(),
    expirationSecs: proposal.expirationSecs.toString(),
    ...extra,
  };
}

function isWatchable(
  status: ProposalStatus,
): status is ProposalWatchState["status"] {
  return status === "active" || status === "passed";
}

function nextWatchState(
  proposal: WatchedProposal,
  prev: ProposalWatchState | undefined,
  nowSecs: bigint,
  allowReminders: boolean,
  events: ProposalEvent[],
): ProposalWatchState | null {
  if (!isWatchable(proposal.status)) return null;

  const watch: ProposalWatchState = {
    status: proposal.status,
    expirationSecs: proposal.expirationSecs.toString(),
    reminded24h: prev?.reminded24h ?? false,
    reminded6h: prev?.reminded6h ?? false,
  };

  if (allowReminders && proposal.status === "active") {
    const remaining = proposal.expirationSecs - nowSecs;
    if (remaining > 0n && remaining <= REMINDER_6H_SECS && !watch.reminded6h) {
      const window: ReminderWindow = "6h";
      events.push(
        toEvent("proposal.voting_ending_soon", proposal, {
          remainingSecs: remaining.toString(),
          reminderWindow: window,
        }),
      );
      watch.reminded6h = true;
      watch.reminded24h = true;
    } else if (
      remaining > 0n &&
      remaining <= REMINDER_24H_SECS &&
      !watch.reminded24h
    ) {
      const window: ReminderWindow = "24h";
      events.push(
        toEvent("proposal.voting_ending_soon", proposal, {
          remainingSecs: remaining.toString(),
          reminderWindow: window,
        }),
      );
      watch.reminded24h = true;
    }
  }

  return watch;
}

function pushLifecycleEvents(
  prevStatus: ProposalStatus | undefined,
  proposal: WatchedProposal,
  isNew: boolean,
  events: ProposalEvent[],
): void {
  if (isNew) {
    events.push(toEvent("proposal.created", proposal));
  }

  const from = prevStatus ?? (isNew ? "active" : undefined);

  if (from === "active" && proposal.status === "passed") {
    events.push(toEvent("proposal.voting_passed", proposal));
  }
  if (from === "active" && proposal.status === "failed") {
    events.push(toEvent("proposal.voting_failed", proposal));
  }
  if (from === "active" && proposal.status === "executed") {
    events.push(toEvent("proposal.voting_passed", proposal));
    events.push(toEvent("proposal.executed", proposal));
  }
  if (from === "passed" && proposal.status === "executed") {
    events.push(toEvent("proposal.executed", proposal));
  }
  if (from === "passed" && proposal.status === "failed") {
    events.push(toEvent("proposal.voting_failed", proposal));
  }
}

export function diffProposalEvents(input: {
  snapshot: PollSnapshot;
  nextProposalId: number;
  proposals: WatchedProposal[];
  nowSecs: bigint;
}): {events: ProposalEvent[]; snapshot: PollSnapshot} {
  const snapshot = input.snapshot ?? EMPTY_SNAPSHOT;
  const byId = new Map(
    input.proposals.map((proposal) => [proposal.proposalId, proposal]),
  );
  const events: ProposalEvent[] = [];
  const allowLifecycle = snapshot.initialized;
  const allowReminders = snapshot.initialized;
  const nextWatches: Record<string, ProposalWatchState> = {};

  const consideredIds = new Set<string>([
    ...Object.keys(snapshot.proposals),
    ...byId.keys(),
  ]);

  for (const id of consideredIds) {
    const proposal = byId.get(id);
    const prev = snapshot.proposals[id];

    if (!proposal) {
      if (prev) nextWatches[id] = prev;
      continue;
    }

    const numericId = Number(proposal.proposalId);
    const isNew =
      allowLifecycle &&
      Number.isFinite(numericId) &&
      numericId >= snapshot.nextProposalId;

    if (allowLifecycle) {
      pushLifecycleEvents(prev?.status, proposal, isNew, events);
    }

    const watch = nextWatchState(
      proposal,
      prev,
      input.nowSecs,
      allowReminders,
      events,
    );
    if (watch) nextWatches[id] = watch;
  }

  return {
    events,
    snapshot: {
      initialized: true,
      nextProposalId: input.nextProposalId,
      proposals: nextWatches,
    },
  };
}
