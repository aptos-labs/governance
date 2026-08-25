import type {ProposalStatus} from "~/lib/governance/types";

export const NOTIFICATION_EVENT_TYPES = [
  "proposal.created",
  "proposal.voting_passed",
  "proposal.voting_failed",
  "proposal.executed",
  "proposal.voting_ending_soon",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<NotificationEventType, string> = {
  "proposal.created": "New proposal",
  "proposal.voting_passed": "Voting passed",
  "proposal.voting_failed": "Voting failed",
  "proposal.executed": "Proposal executed",
  "proposal.voting_ending_soon": "Countdown (3d / 2d / 1d / 6h left)",
};

export type NotificationChannel = "slack" | "telegram" | "discord";

export interface WatchedProposal {
  proposalId: string;
  status: ProposalStatus;
  title: string;
  yesVotes: bigint;
  noVotes: bigint;
  expirationSecs: bigint;
  creationTimeSecs: bigint;
}

export interface ProposalWatchState {
  status: "active" | "passed";
  expirationSecs: string;
  reminded3d: boolean;
  reminded2d: boolean;
  reminded1d: boolean;
  reminded6h: boolean;
}

export interface PollSnapshot {
  initialized: boolean;
  nextProposalId: number;
  proposals: Record<string, ProposalWatchState>;
}

export const EMPTY_SNAPSHOT: PollSnapshot = {
  initialized: false,
  nextProposalId: 0,
  proposals: {},
};

export type ReminderWindow = "3d" | "2d" | "1d" | "6h";

export interface ProposalEvent {
  type: NotificationEventType;
  proposalId: string;
  status: ProposalStatus;
  title: string;
  yesVotes: string;
  noVotes: string;
  expirationSecs: string;
  remainingSecs?: string;
  reminderWindow?: ReminderWindow;
}

export interface Subscription {
  id: string;
  channel: NotificationChannel;
  events: NotificationEventType[];
  createdAt: string;
  unsubscribeToken: string;
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  telegramChatId?: string;
}

export interface NotificationStoreState {
  version: 1;
  snapshot: PollSnapshot;
  subscriptions: Subscription[];
  telegramWebhookUrl?: string;
}

export const EMPTY_STORE_STATE: NotificationStoreState = {
  version: 1,
  snapshot: EMPTY_SNAPSHOT,
  subscriptions: [],
};

export type Destination =
  | {
      channel: "slack";
      source: "env" | "subscription";
      webhookUrl: string;
      events: NotificationEventType[] | "all";
    }
  | {
      channel: "discord";
      source: "env" | "subscription";
      webhookUrl: string;
      events: NotificationEventType[] | "all";
    }
  | {
      channel: "telegram";
      source: "env" | "subscription";
      chatId: string;
      events: NotificationEventType[] | "all";
    };

export type ReminderFlags = Pick<
  ProposalWatchState,
  "reminded3d" | "reminded2d" | "reminded1d" | "reminded6h"
>;

export function emptyReminderFlags(): ReminderFlags {
  return {
    reminded3d: false,
    reminded2d: false,
    reminded1d: false,
    reminded6h: false,
  };
}

export function reminderFlagsFromUnknown(value: unknown): ReminderFlags {
  if (!value || typeof value !== "object") return emptyReminderFlags();
  const record = value as Record<string, unknown>;
  const hasNewKeys =
    typeof record.reminded3d === "boolean" ||
    typeof record.reminded2d === "boolean" ||
    typeof record.reminded1d === "boolean";

  if (hasNewKeys) {
    return {
      reminded3d: Boolean(record.reminded3d),
      reminded2d: Boolean(record.reminded2d),
      reminded1d: Boolean(record.reminded1d),
      reminded6h: Boolean(record.reminded6h),
    };
  }

  const reminded6h = Boolean(record.reminded6h);
  const reminded24h = Boolean(record.reminded24h);
  return {
    reminded3d: reminded6h || reminded24h,
    reminded2d: reminded6h || reminded24h,
    reminded1d: reminded6h || reminded24h,
    reminded6h,
  };
}

export function normalizeWatchState(value: unknown): ProposalWatchState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.status !== "active" && record.status !== "passed") return null;
  const expirationSecs =
    typeof record.expirationSecs === "string"
      ? record.expirationSecs
      : typeof record.expirationSecs === "number"
        ? String(record.expirationSecs)
        : "";
  if (!expirationSecs) return null;
  return {
    status: record.status,
    expirationSecs,
    ...reminderFlagsFromUnknown(record),
  };
}

export function wantsEvent(
  filter: NotificationEventType[] | "all",
  type: NotificationEventType,
): boolean {
  return filter === "all" || filter.length === 0 || filter.includes(type);
}

export function proposalTitle(proposal: {
  proposalId: string;
  metadataResult: {
    verified: boolean;
    metadata?: {title: string};
  };
}): string {
  if (proposal.metadataResult.verified && proposal.metadataResult.metadata) {
    return proposal.metadataResult.metadata.title;
  }
  return `Proposal #${proposal.proposalId}`;
}
