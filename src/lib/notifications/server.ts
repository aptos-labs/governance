import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {resolveNotificationConfig} from "~/lib/notifications/config";
import {getNotificationStore} from "~/lib/notifications/store";
import {
  addWebhookSubscription,
  configuredChannelCount,
  removeSubscriptionByToken,
} from "~/lib/notifications/subscriptions";
import {
  NOTIFICATION_EVENT_TYPES,
  type NotificationEventType,
  type Subscription,
} from "~/lib/notifications/types";

const eventTypesSchema = z
  .array(z.enum(NOTIFICATION_EVENT_TYPES))
  .default([...NOTIFICATION_EVENT_TYPES]);

export interface NotificationPublicConfig {
  durable: boolean;
  storeKind: "memory" | "file" | "upstash";
  telegram: {
    configured: boolean;
    botUsername?: string;
    deepLink?: string;
  };
  envDestinations: {
    slack: boolean;
    telegram: boolean;
    discord: boolean;
  };
}

export const getNotificationPublicConfig = createServerFn({
  method: "GET",
}).handler(async (): Promise<NotificationPublicConfig> => {
  const config = resolveNotificationConfig();
  const store = getNotificationStore(config);
  const envCount = configuredChannelCount(config);
  const botUsername = config.telegramBotUsername;
  return {
    durable: store.durable,
    storeKind: store.kind,
    telegram: {
      configured: Boolean(config.telegramBotToken),
      botUsername,
      deepLink: botUsername
        ? `https://t.me/${botUsername}?start=subscribe`
        : undefined,
    },
    envDestinations: {
      slack: envCount.slack > 0,
      telegram: envCount.telegram > 0,
      discord: envCount.discord > 0,
    },
  };
});

const subscribeSchema = z.object({
  channel: z.enum(["slack", "discord"]),
  url: z.string().min(1).max(500),
  events: eventTypesSchema,
});

export const subscribeWebhook = createServerFn({method: "POST"})
  .validator(subscribeSchema)
  .handler(async ({data}) => {
    const config = resolveNotificationConfig();
    const store = getNotificationStore(config);
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
              "This deployment has no durable store for subscriptions. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or use env-configured webhooks.",
          },
        };
      }
      const added = addWebhookSubscription(state, {
        channel: data.channel,
        url: data.url,
        events: data.events as NotificationEventType[],
        now: new Date(),
      });
      if (!added.ok) return {state, result: added};
      return {state: added.state, result: added};
    });

    if (!result.ok) return {ok: false as const, error: result.error};

    const unsubscribeUrl = `${config.publicAppUrl}/notifications/unsubscribe?token=${result.subscription.unsubscribeToken}`;
    await sendSubscribeAck(data.channel, data.url, unsubscribeUrl).catch(
      (error) => {
        console.error("[notifications] subscribe ack failed", error);
      },
    );

    return {
      ok: true as const,
      created: result.created,
      unsubscribeUrl,
    };
  });

const unsubscribeSchema = z.object({token: z.string().min(1).max(200)});

export const unsubscribeNotifications = createServerFn({method: "POST"})
  .validator(unsubscribeSchema)
  .handler(async ({data}) => {
    const config = resolveNotificationConfig();
    const store = getNotificationStore(config);
    const removed = await store.withLock(async (state) => {
      const result = removeSubscriptionByToken(state, data.token);
      return {state: result.state, result: result.removed};
    });
    return {ok: true as const, removed};
  });

async function sendSubscribeAck(
  channel: "slack" | "discord",
  url: string,
  unsubscribeUrl: string,
): Promise<void> {
  const text =
    channel === "slack"
      ? `Subscribed to Aptos Governance alerts. <${unsubscribeUrl}|Unsubscribe>`
      : `Subscribed to Aptos Governance alerts.\nUnsubscribe: ${unsubscribeUrl}`;
  const body = channel === "slack" ? {text} : {content: text};
  await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
}
