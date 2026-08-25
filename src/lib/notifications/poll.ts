import type {NotificationConfig} from "~/lib/notifications/config";
import {deliverEvent} from "~/lib/notifications/deliver";
import {diffProposalEvents, idsToFetch} from "~/lib/notifications/events";
import {
  loadForumForNotifications,
  loadWatchedProposals,
} from "~/lib/notifications/load-proposals";
import type {NotificationStore} from "~/lib/notifications/store";
import {destinationsForEvent} from "~/lib/notifications/subscriptions";
import {ensureTelegramWebhook} from "~/lib/notifications/telegram";
import type {ProposalEvent, WatchedProposal} from "~/lib/notifications/types";

export interface NotificationPollResult {
  initialized: boolean;
  durable: boolean;
  fetched: number;
  events: number;
  delivered: number;
  failed: number;
  eventTypes: string[];
}

export async function runNotificationPoll(input: {
  config: NotificationConfig;
  store: NotificationStore;
  nowSecs?: bigint;
  loadForum?: () => Promise<{nextProposalId: number; handle: string}>;
  loadProposals?: (
    handle: string,
    ids: string[],
    nowSecs: bigint,
  ) => Promise<WatchedProposal[]>;
  deliver?: typeof deliverEvent;
}): Promise<NotificationPollResult> {
  const nowSecs = input.nowSecs ?? BigInt(Math.floor(Date.now() / 1000));
  const loadForum = input.loadForum ?? loadForumForNotifications;
  const loadProposals = input.loadProposals ?? loadWatchedProposals;
  const deliver = input.deliver ?? deliverEvent;

  if (input.config.telegramBotToken) {
    await ensureTelegramWebhook(input.config, input.store).catch((error) => {
      console.error("[notifications] failed to set Telegram webhook", error);
    });
  }

  const forum = await loadForum();
  const ids = await input.store.withLock(async (state) => ({
    state,
    result: idsToFetch(state.snapshot, forum.nextProposalId),
  }));
  const proposals = await loadProposals(forum.handle, ids, nowSecs);

  const events = await input.store.withLock(async (state) => {
    const diff = diffProposalEvents({
      snapshot: state.snapshot,
      nextProposalId: forum.nextProposalId,
      proposals,
      nowSecs,
    });
    return {
      state: {...state, snapshot: diff.snapshot},
      result: diff.events,
    };
  });

  let delivered = 0;
  let failed = 0;
  for (const event of events) {
    const destinations = await input.store.withLock(async (state) => ({
      state,
      result: destinationsForEvent(state, input.config, event.type),
    }));
    if (destinations.length === 0) continue;
    try {
      const result = await deliver(destinations, event, input.config);
      delivered += result.delivered;
      failed += result.failed;
    } catch (error) {
      console.error("[notifications] delivery failed", error);
      failed += destinations.length;
    }
  }

  return {
    initialized: true,
    durable: input.store.durable,
    fetched: proposals.length,
    events: events.length,
    delivered,
    failed,
    eventTypes: events.map((event: ProposalEvent) => event.type),
  };
}
