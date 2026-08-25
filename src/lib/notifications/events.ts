import type {ProposalStatus} from "~/lib/governance/types";
import type {
  PollSnapshot,
  ProposalEvent,
  ProposalWatchState,
  ReminderWindow,
  WatchedProposal,
} from "~/lib/notifications/types";
import {
  EMPTY_SNAPSHOT,
  reminderFlagsFromUnknown,
} from "~/lib/notifications/types";

const HOUR_SECS = 3600n;
const DAY_SECS = 24n * HOUR_SECS;
export const REMINDER_3D_SECS = 3n * DAY_SECS;
export const REMINDER_2D_SECS = 2n * DAY_SECS;
export const REMINDER_1D_SECS = 1n * DAY_SECS;
export const REMINDER_6H_SECS = 6n * HOUR_SECS;

const REMINDER_WINDOWS: ReadonlyArray<{
  window: ReminderWindow;
  threshold: bigint;
  flag: keyof ReturnType<typeof reminderFlagsFromUnknown>;
}> = [
  {window: "3d", threshold: REMINDER_3D_SECS, flag: "reminded3d"},
  {window: "2d", threshold: REMINDER_2D_SECS, flag: "reminded2d"},
  {window: "1d", threshold: REMINDER_1D_SECS, flag: "reminded1d"},
  {window: "6h", threshold: REMINDER_6H_SECS, flag: "reminded6h"},
];

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

function applyDueReminder(
  watch: ProposalWatchState,
  proposal: WatchedProposal,
  nowSecs: bigint,
  emitCountdown: boolean,
  events: ProposalEvent[],
): void {
  const remaining = proposal.expirationSecs - nowSecs;
  if (remaining <= 0n) return;

  let firedIndex = -1;
  for (let i = REMINDER_WINDOWS.length - 1; i >= 0; i--) {
    const step = REMINDER_WINDOWS[i];
    if (remaining <= step.threshold && !watch[step.flag]) {
      firedIndex = i;
      break;
    }
  }
  if (firedIndex < 0) return;

  const fired = REMINDER_WINDOWS[firedIndex];
  if (emitCountdown) {
    events.push(
      toEvent("proposal.voting_ending_soon", proposal, {
        remainingSecs: remaining.toString(),
        reminderWindow: fired.window,
      }),
    );
  }
  for (let i = 0; i <= firedIndex; i++) {
    watch[REMINDER_WINDOWS[i].flag] = true;
  }
}

function nextWatchState(
  proposal: WatchedProposal,
  prev: ProposalWatchState | undefined,
  nowSecs: bigint,
  allowReminders: boolean,
  emitCountdown: boolean,
  events: ProposalEvent[],
): ProposalWatchState | null {
  if (!isWatchable(proposal.status)) return null;

  const watch: ProposalWatchState = {
    status: proposal.status,
    expirationSecs: proposal.expirationSecs.toString(),
    ...reminderFlagsFromUnknown(prev),
  };

  if (allowReminders && proposal.status === "active") {
    applyDueReminder(watch, proposal, nowSecs, emitCountdown, events);
  }

  return watch;
}

function createdExtras(
  proposal: WatchedProposal,
  nowSecs: bigint,
): Partial<Pick<ProposalEvent, "remainingSecs">> {
  if (proposal.status !== "active") return {};
  const remaining = proposal.expirationSecs - nowSecs;
  if (remaining <= 0n) return {};
  return {remainingSecs: remaining.toString()};
}

function pushLifecycleEvents(
  prevStatus: ProposalStatus | undefined,
  proposal: WatchedProposal,
  isNew: boolean,
  nowSecs: bigint,
  events: ProposalEvent[],
): void {
  if (isNew) {
    events.push(
      toEvent("proposal.created", proposal, createdExtras(proposal, nowSecs)),
    );
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
      pushLifecycleEvents(prev?.status, proposal, isNew, input.nowSecs, events);
    }

    const watch = nextWatchState(
      proposal,
      prev,
      input.nowSecs,
      allowReminders,
      !isNew,
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
