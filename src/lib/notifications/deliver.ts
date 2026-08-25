import type {NotificationConfig} from "~/lib/notifications/config";
import {
  formatDiscordPayload,
  formatSlackPayload,
  formatTelegramHtml,
  proposalPageUrl,
} from "~/lib/notifications/format";
import type {Destination, ProposalEvent} from "~/lib/notifications/types";

export interface DeliveryResult {
  attempted: number;
  delivered: number;
  failed: number;
}

async function postJson(
  url: string,
  body: unknown,
): Promise<{ok: boolean; status: number}> {
  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  return {ok: response.ok, status: response.status};
}

export async function sendToDestination(
  destination: Destination,
  event: ProposalEvent,
  config: NotificationConfig,
): Promise<boolean> {
  const proposalUrl = proposalPageUrl(config.publicAppUrl, event.proposalId);

  if (destination.channel === "slack") {
    const payload = formatSlackPayload(event, proposalUrl);
    const result = await postJson(destination.webhookUrl, payload);
    return result.ok;
  }

  if (destination.channel === "discord") {
    const payload = formatDiscordPayload(event, proposalUrl);
    const result = await postJson(destination.webhookUrl, payload);
    return result.ok;
  }

  if (!config.telegramBotToken) return false;
  const response = await fetch(
    `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        chat_id: destination.chatId,
        text: formatTelegramHtml(event, proposalUrl),
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    },
  );
  return response.ok;
}

export async function deliverEvent(
  destinations: Destination[],
  event: ProposalEvent,
  config: NotificationConfig,
): Promise<DeliveryResult> {
  const results = await Promise.all(
    destinations.map(async (destination) => {
      try {
        return await sendToDestination(destination, event, config);
      } catch (error) {
        console.error(
          `[notifications] ${destination.channel} delivery failed`,
          error,
        );
        return false;
      }
    }),
  );
  const delivered = results.filter(Boolean).length;
  return {
    attempted: results.length,
    delivered,
    failed: results.length - delivered,
  };
}
