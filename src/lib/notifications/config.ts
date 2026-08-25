import {readEnv} from "~/lib/governance/api-config";
import {GOVERNANCE_SLACK_CHANNEL} from "~/lib/notifications/types";
import {isSlackWebhookUrl} from "~/lib/notifications/validate-webhook";

export interface NotificationConfig {
  cronSecret: string | undefined;
  publicAppUrl: string;
  slackChannel: typeof GOVERNANCE_SLACK_CHANNEL;
  slackWebhookUrl: string | undefined;
  slackBotToken: string | undefined;
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

function firstSlackWebhook(value: string | undefined): string | undefined {
  for (const part of splitList(value)) {
    if (isSlackWebhookUrl(part)) return part;
  }
  return undefined;
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
  const botToken =
    readEnv("NOTIFICATIONS_SLACK_BOT_TOKEN") || readEnv("SLACK_BOT_TOKEN");
  return {
    cronSecret: readEnv("CRON_SECRET") || readEnv("NOTIFICATIONS_CRON_SECRET"),
    publicAppUrl: resolvePublicAppUrl(),
    slackChannel: GOVERNANCE_SLACK_CHANNEL,
    slackWebhookUrl: firstSlackWebhook(
      readEnv("NOTIFICATIONS_SLACK_WEBHOOK_URL") ||
        readEnv("SLACK_WEBHOOK_URL"),
    ),
    slackBotToken: botToken?.trim() || undefined,
    upstashUrl: readEnv("UPSTASH_REDIS_REST_URL"),
    upstashToken: readEnv("UPSTASH_REDIS_REST_TOKEN"),
    storePath: readEnv("NOTIFICATIONS_STORE_PATH"),
  };
}

export function isProductionRuntime(): boolean {
  return Boolean(readEnv("VERCEL")) || readEnv("NODE_ENV") === "production";
}
