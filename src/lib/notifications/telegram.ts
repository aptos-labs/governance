import type {NotificationConfig} from "~/lib/notifications/config";
import type {NotificationStore} from "~/lib/notifications/store";
import {
  addTelegramSubscription,
  removeTelegramChat,
} from "~/lib/notifications/subscriptions";
import {
  NOTIFICATION_EVENT_TYPES,
  type NotificationEventType,
  type Subscription,
} from "~/lib/notifications/types";

export interface TelegramUpdate {
  update_id?: number;
  message?: {
    text?: string;
    chat?: {id?: number | string; type?: string; title?: string};
  };
}

export interface TelegramCommandResult {
  text: string;
  parseMode?: "HTML";
}

export function parseTelegramCommand(
  text: string,
  botUsername?: string,
): {command: string; args: string} | null {
  const trimmed = text.trim();
  const match = trimmed.match(
    /^\/([A-Za-z]+)(?:@([A-Za-z0-9_]+))?(?:\s+(.*))?$/,
  );
  if (!match) return null;
  const username = match[2];
  if (
    username &&
    botUsername &&
    username.toLowerCase() !== botUsername.toLowerCase()
  ) {
    return null;
  }
  return {command: match[1].toLowerCase(), args: (match[3] ?? "").trim()};
}

function helpText(botUsername?: string): string {
  const mention = botUsername ? `@${botUsername}` : "this bot";
  return [
    "Aptos Governance alerts",
    "",
    "Commands:",
    "/subscribe — get proposal alerts in this chat",
    "/unsubscribe — stop alerts",
    "/status — show whether this chat is subscribed",
    "/help — this message",
    "",
    `Add ${mention} to a group and run /subscribe there to alert a channel.`,
  ].join("\n");
}

export async function handleTelegramCommand(input: {
  text: string;
  chatId: string;
  store: NotificationStore;
  config: NotificationConfig;
  now?: Date;
}): Promise<TelegramCommandResult> {
  const parsed = parseTelegramCommand(
    input.text,
    input.config.telegramBotUsername,
  );
  if (!parsed) {
    return {text: "Send /help for Aptos Governance alert commands."};
  }

  const events: NotificationEventType[] = [...NOTIFICATION_EVENT_TYPES];

  if (parsed.command === "help" || parsed.command === "start") {
    if (
      parsed.command === "start" &&
      parsed.args.toLowerCase() === "subscribe"
    ) {
      return subscribeChat(input.store, input.chatId, events, input.now);
    }
    return {text: helpText(input.config.telegramBotUsername)};
  }

  if (parsed.command === "subscribe") {
    return subscribeChat(input.store, input.chatId, events, input.now);
  }

  if (parsed.command === "unsubscribe") {
    const removed = await input.store.withLock(async (state) => {
      const result = removeTelegramChat(state, input.chatId);
      return {state: result.state, result: result.removed};
    });
    return {
      text: removed
        ? "Unsubscribed this chat from Aptos Governance alerts."
        : "This chat is not subscribed.",
    };
  }

  if (parsed.command === "status") {
    const subscribed = await input.store.withLock(async (state) => ({
      state,
      result: state.subscriptions.some(
        (sub) =>
          sub.channel === "telegram" && sub.telegramChatId === input.chatId,
      ),
    }));
    return {
      text: subscribed
        ? "This chat is subscribed to Aptos Governance alerts."
        : "This chat is not subscribed. Send /subscribe.",
    };
  }

  return {text: "Unknown command. Send /help."};
}

async function subscribeChat(
  store: NotificationStore,
  chatId: string,
  events: NotificationEventType[],
  now = new Date(),
): Promise<TelegramCommandResult> {
  const result = await store.withLock<
    | {ok: false; error: string}
    | {ok: true; subscription: Subscription; created: boolean}
  >(async (state) => {
    if (!store.durable) {
      return {
        state,
        result: {
          ok: false as const,
          error:
            "This deployment has no durable notification store. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
        },
      };
    }
    const added = addTelegramSubscription(state, {chatId, events, now});
    if (!added.ok) return {state, result: added};
    return {state: added.state, result: added};
  });

  if (!result.ok) {
    return {text: result.error};
  }
  return {
    text: result.created
      ? "Subscribed this chat to Aptos Governance alerts (new proposals, voting results, execution, and 3d / 2d / 1d / 6h countdown reminders)."
      : "This chat is already subscribed. Alerts will keep coming here.",
  };
}

export async function replyTelegram(
  config: NotificationConfig,
  chatId: string,
  text: string,
): Promise<void> {
  if (!config.telegramBotToken) return;
  await fetch(
    `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({chat_id: chatId, text}),
    },
  );
}

export async function ensureTelegramWebhook(
  config: NotificationConfig,
  store: NotificationStore,
): Promise<void> {
  if (!config.telegramBotToken) return;
  const url = `${config.publicAppUrl}/api/notifications/telegram`;
  await store.withLock(async (state) => {
    if (state.telegramWebhookUrl === url) {
      return {state, result: undefined};
    }
    const body: Record<string, unknown> = {
      url,
      allowed_updates: ["message"],
    };
    if (config.telegramWebhookSecret) {
      body.secret_token = config.telegramWebhookSecret;
    }
    const response = await fetch(
      `https://api.telegram.org/bot${config.telegramBotToken}/setWebhook`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      throw new Error(`Telegram setWebhook failed (${response.status})`);
    }
    return {
      state: {...state, telegramWebhookUrl: url},
      result: undefined,
    };
  });
}

export function telegramChatIdFromUpdate(
  update: TelegramUpdate,
): string | null {
  const id = update.message?.chat?.id;
  if (id === undefined || id === null) return null;
  return String(id);
}
