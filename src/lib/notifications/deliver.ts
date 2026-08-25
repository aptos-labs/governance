import type {NotificationConfig} from "~/lib/notifications/config";
import {formatSlackPayload, proposalPageUrl} from "~/lib/notifications/format";
import type {Destination, ProposalEvent} from "~/lib/notifications/types";

export interface DeliveryResult {
  attempted: number;
  delivered: number;
  failed: number;
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ok: boolean; status: number; json?: Record<string, unknown>}> {
  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json", ...headers},
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => undefined)) as
    | Record<string, unknown>
    | undefined;
  return {ok: response.ok, status: response.status, json};
}

export async function sendToDestination(
  destination: Destination,
  event: ProposalEvent,
  config: NotificationConfig,
): Promise<boolean> {
  const proposalUrl = proposalPageUrl(config.publicAppUrl, event.proposalId);
  const payload = formatSlackPayload(event, proposalUrl, destination.channel);

  if (destination.via === "webhook") {
    const result = await postJson(destination.webhookUrl, payload);
    return result.ok;
  }

  const result = await postJson(
    "https://slack.com/api/chat.postMessage",
    payload,
    {Authorization: `Bearer ${destination.botToken}`},
  );
  return result.ok && result.json?.ok === true;
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
        console.error("[notifications] Slack delivery failed", error);
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
