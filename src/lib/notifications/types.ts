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
  "proposal.voting_ending_soon": "Voting ending soon",
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
  reminded24h: boolean;
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

export type ReminderWindow = "24h" | "6h";

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
