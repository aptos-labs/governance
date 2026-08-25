import {readEnv} from "~/lib/governance/api-config";

export interface NotificationConfig {
  cronSecret: string | undefined;
  publicAppUrl: string;
  slackWebhookUrls: string[];
  discordWebhookUrls: string[];
  telegramBotToken: string | undefined;
  telegramBotUsername: string | undefined;
  telegramChatIds: string[];
  telegramWebhookSecret: string | undefined;
  upstashUrl: string | undefined;
  upstashToken: string | undefined;
  storePath: string | undefined;
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function resolvePublicAppUrl(): string {
  const explicit =
    readEnv("NOTIFICATIONS_PUBLIC_APP_URL") || readEnv("PUBLIC_APP_URL");
  if (explicit) return explicit.replace(/\/+$/, "");

  const productionHost = readEnv("VERCEL_PROJECT_PRODUCTION_URL");
  if (productionHost) {
    return productionHost.startsWith("http")
      ? productionHost.replace(/\/+$/, "")
      : `https://${productionHost}`;
  }

  const vercelUrl = readEnv("VERCEL_URL");
  if (vercelUrl) {
    return vercelUrl.startsWith("http")
      ? vercelUrl.replace(/\/+$/, "")
      : `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

export function resolveNotificationConfig(): NotificationConfig {
  return {
    cronSecret: readEnv("CRON_SECRET") || readEnv("NOTIFICATIONS_CRON_SECRET"),
    publicAppUrl: resolvePublicAppUrl(),
    slackWebhookUrls: splitList(
      readEnv("NOTIFICATIONS_SLACK_WEBHOOK_URL") ||
        readEnv("SLACK_WEBHOOK_URL"),
    ),
    discordWebhookUrls: splitList(
      readEnv("NOTIFICATIONS_DISCORD_WEBHOOK_URL") ||
        readEnv("DISCORD_WEBHOOK_URL"),
    ),
    telegramBotToken:
      readEnv("NOTIFICATIONS_TELEGRAM_BOT_TOKEN") ||
      readEnv("TELEGRAM_BOT_TOKEN"),
    telegramBotUsername: (
      readEnv("NOTIFICATIONS_TELEGRAM_BOT_USERNAME") ||
      readEnv("TELEGRAM_BOT_USERNAME")
    )?.replace(/^@/, ""),
    telegramChatIds: splitList(
      readEnv("NOTIFICATIONS_TELEGRAM_CHAT_IDS") ||
        readEnv("TELEGRAM_CHAT_IDS") ||
        readEnv("TELEGRAM_CHAT_ID"),
    ),
    telegramWebhookSecret:
      readEnv("NOTIFICATIONS_TELEGRAM_WEBHOOK_SECRET") ||
      readEnv("TELEGRAM_WEBHOOK_SECRET"),
    upstashUrl: readEnv("UPSTASH_REDIS_REST_URL"),
    upstashToken: readEnv("UPSTASH_REDIS_REST_TOKEN"),
    storePath: readEnv("NOTIFICATIONS_STORE_PATH"),
  };
}

export function isProductionRuntime(): boolean {
  return Boolean(readEnv("VERCEL")) || readEnv("NODE_ENV") === "production";
}
