import type {NotificationConfig} from "~/lib/notifications/config";
import type {Destination} from "~/lib/notifications/types";

export function slackDestinations(config: NotificationConfig): Destination[] {
  if (config.slackBotToken) {
    return [
      {
        via: "bot",
        botToken: config.slackBotToken,
        channel: config.slackChannel,
      },
    ];
  }
  if (config.slackWebhookUrl) {
    return [
      {
        via: "webhook",
        webhookUrl: config.slackWebhookUrl,
        channel: config.slackChannel,
      },
    ];
  }
  return [];
}
