import type {NotificationConfig} from "~/lib/notifications/config";
import type {
  Destination,
  NotificationChannel,
  NotificationEventType,
  NotificationStoreState,
  Subscription,
} from "~/lib/notifications/types";
import {EMPTY_STORE_STATE, wantsEvent} from "~/lib/notifications/types";
import {
  isDiscordWebhookUrl,
  isSlackWebhookUrl,
  isTelegramChatId,
} from "~/lib/notifications/validate-webhook";

export const MAX_SUBSCRIPTIONS = 100;

export function normalizeStoreState(value: unknown): NotificationStoreState {
  if (!value || typeof value !== "object") return EMPTY_STORE_STATE;
  const record = value as Partial<NotificationStoreState>;
  if (record.version !== 1) return EMPTY_STORE_STATE;
  return {
    version: 1,
    snapshot: {
      initialized: Boolean(record.snapshot?.initialized),
      nextProposalId: Number(record.snapshot?.nextProposalId) || 0,
      proposals:
        record.snapshot?.proposals &&
        typeof record.snapshot.proposals === "object"
          ? record.snapshot.proposals
          : {},
    },
    subscriptions: Array.isArray(record.subscriptions)
      ? record.subscriptions.filter(isSubscription)
      : [],
    telegramWebhookUrl:
      typeof record.telegramWebhookUrl === "string"
        ? record.telegramWebhookUrl
        : undefined,
  };
}

function isSubscription(value: unknown): value is Subscription {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<Subscription>;
  return (
    typeof record.id === "string" &&
    typeof record.channel === "string" &&
    typeof record.unsubscribeToken === "string" &&
    Array.isArray(record.events)
  );
}

export function newSubscriptionId(): string {
  return crypto.randomUUID();
}

export function newUnsubscribeToken(): string {
  return (
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "")
  );
}

function matchingWebhook(
  state: NotificationStoreState,
  channel: "slack" | "discord",
  url: string,
): Subscription | undefined {
  return state.subscriptions.find(
    (sub) =>
      sub.channel === channel &&
      (channel === "slack"
        ? sub.slackWebhookUrl === url
        : sub.discordWebhookUrl === url),
  );
}

export function addWebhookSubscription(
  state: NotificationStoreState,
  input: {
    channel: "slack" | "discord";
    url: string;
    events: NotificationEventType[];
    now: Date;
  },
):
  | {
      ok: true;
      state: NotificationStoreState;
      subscription: Subscription;
      created: boolean;
    }
  | {ok: false; error: string} {
  const url = input.url.trim();
  if (input.channel === "slack" && !isSlackWebhookUrl(url)) {
    return {
      ok: false,
      error: "Enter a Slack incoming webhook URL (hooks.slack.com).",
    };
  }
  if (input.channel === "discord" && !isDiscordWebhookUrl(url)) {
    return {
      ok: false,
      error: "Enter a Discord webhook URL (discord.com/api/webhooks/…).",
    };
  }

  const existing = matchingWebhook(state, input.channel, url);
  if (existing) {
    const updated: Subscription = {...existing, events: input.events};
    return {
      ok: true,
      created: false,
      subscription: updated,
      state: {
        ...state,
        subscriptions: state.subscriptions.map((sub) =>
          sub.id === existing.id ? updated : sub,
        ),
      },
    };
  }

  if (state.subscriptions.length >= MAX_SUBSCRIPTIONS) {
    return {
      ok: false,
      error: "Subscription limit reached for this deployment.",
    };
  }

  const subscription: Subscription = {
    id: newSubscriptionId(),
    channel: input.channel,
    events: input.events,
    createdAt: input.now.toISOString(),
    unsubscribeToken: newUnsubscribeToken(),
    ...(input.channel === "slack"
      ? {slackWebhookUrl: url}
      : {discordWebhookUrl: url}),
  };

  return {
    ok: true,
    created: true,
    subscription,
    state: {
      ...state,
      subscriptions: [...state.subscriptions, subscription],
    },
  };
}

export function addTelegramSubscription(
  state: NotificationStoreState,
  input: {chatId: string; events: NotificationEventType[]; now: Date},
):
  | {
      ok: true;
      state: NotificationStoreState;
      subscription: Subscription;
      created: boolean;
    }
  | {ok: false; error: string} {
  const chatId = input.chatId.trim();
  if (!isTelegramChatId(chatId)) {
    return {ok: false, error: "Invalid Telegram chat id."};
  }

  const existing = state.subscriptions.find(
    (sub) => sub.channel === "telegram" && sub.telegramChatId === chatId,
  );
  if (existing) {
    const updated: Subscription = {...existing, events: input.events};
    return {
      ok: true,
      created: false,
      subscription: updated,
      state: {
        ...state,
        subscriptions: state.subscriptions.map((sub) =>
          sub.id === existing.id ? updated : sub,
        ),
      },
    };
  }

  if (state.subscriptions.length >= MAX_SUBSCRIPTIONS) {
    return {
      ok: false,
      error: "Subscription limit reached for this deployment.",
    };
  }

  const subscription: Subscription = {
    id: newSubscriptionId(),
    channel: "telegram",
    events: input.events,
    createdAt: input.now.toISOString(),
    unsubscribeToken: newUnsubscribeToken(),
    telegramChatId: chatId,
  };

  return {
    ok: true,
    created: true,
    subscription,
    state: {
      ...state,
      subscriptions: [...state.subscriptions, subscription],
    },
  };
}

export function removeSubscriptionByToken(
  state: NotificationStoreState,
  token: string,
): {state: NotificationStoreState; removed: boolean} {
  const next = state.subscriptions.filter(
    (sub) => sub.unsubscribeToken !== token,
  );
  return {
    state: {...state, subscriptions: next},
    removed: next.length !== state.subscriptions.length,
  };
}

export function removeTelegramChat(
  state: NotificationStoreState,
  chatId: string,
): {state: NotificationStoreState; removed: boolean} {
  const next = state.subscriptions.filter(
    (sub) => !(sub.channel === "telegram" && sub.telegramChatId === chatId),
  );
  return {
    state: {...state, subscriptions: next},
    removed: next.length !== state.subscriptions.length,
  };
}

export function envDestinations(config: NotificationConfig): Destination[] {
  const destinations: Destination[] = [];
  for (const webhookUrl of config.slackWebhookUrls) {
    destinations.push({
      channel: "slack",
      source: "env",
      webhookUrl,
      events: "all",
    });
  }
  for (const webhookUrl of config.discordWebhookUrls) {
    destinations.push({
      channel: "discord",
      source: "env",
      webhookUrl,
      events: "all",
    });
  }
  for (const chatId of config.telegramChatIds) {
    destinations.push({
      channel: "telegram",
      source: "env",
      chatId,
      events: "all",
    });
  }
  return destinations;
}

export function subscriptionDestinations(
  state: NotificationStoreState,
): Destination[] {
  const destinations: Destination[] = [];
  for (const sub of state.subscriptions) {
    const events = sub.events.length === 0 ? "all" : sub.events;
    if (sub.channel === "slack" && sub.slackWebhookUrl) {
      destinations.push({
        channel: "slack",
        source: "subscription",
        webhookUrl: sub.slackWebhookUrl,
        events,
      });
    }
    if (sub.channel === "discord" && sub.discordWebhookUrl) {
      destinations.push({
        channel: "discord",
        source: "subscription",
        webhookUrl: sub.discordWebhookUrl,
        events,
      });
    }
    if (sub.channel === "telegram" && sub.telegramChatId) {
      destinations.push({
        channel: "telegram",
        source: "subscription",
        chatId: sub.telegramChatId,
        events,
      });
    }
  }
  return destinations;
}

export function destinationsForEvent(
  state: NotificationStoreState,
  config: NotificationConfig,
  type: NotificationEventType,
): Destination[] {
  return [
    ...envDestinations(config),
    ...subscriptionDestinations(state),
  ].filter((destination) => wantsEvent(destination.events, type));
}

export function configuredChannelCount(
  config: NotificationConfig,
): Record<NotificationChannel, number> {
  return {
    slack: config.slackWebhookUrls.length,
    telegram: config.telegramChatIds.length,
    discord: config.discordWebhookUrls.length,
  };
}
