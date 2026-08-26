import {formatDurationCompact, formatOctasToApt} from "~/lib/governance/format";
import type {ProposalEvent} from "~/lib/notifications/types";
import {
  EVENT_TYPE_LABELS,
  GOVERNANCE_SLACK_CHANNEL,
} from "~/lib/notifications/types";

export function proposalPageUrl(appUrl: string, proposalId: string): string {
  const base = appUrl.replace(/\/+$/, "");
  return `${base}/proposal/${proposalId}`;
}

export function eventHeadline(event: ProposalEvent): string {
  switch (event.type) {
    case "proposal.created":
      return "New Aptos governance proposal";
    case "proposal.voting_passed":
      return "Proposal passed voting";
    case "proposal.voting_failed":
      return "Proposal failed voting";
    case "proposal.executed":
      return "Proposal executed";
    case "proposal.voting_ending_soon":
      switch (event.reminderWindow) {
        case "3d":
          return "3 days left to vote";
        case "2d":
          return "2 days left to vote";
        case "1d":
          return "1 day left to vote";
        case "6h":
          return "6 hours left to vote";
        default:
          return "Voting ending soon";
      }
  }
}

function voteLine(event: ProposalEvent): string {
  return `Yes ${formatOctasToApt(BigInt(event.yesVotes))} APT · No ${formatOctasToApt(BigInt(event.noVotes))} APT`;
}

function remainingLine(event: ProposalEvent): string | null {
  if (event.remainingSecs === undefined) return null;
  return `Time left: ${formatDurationCompact(BigInt(event.remainingSecs))}`;
}

export function eventBodyLines(event: ProposalEvent): string[] {
  const lines = [
    `#${event.proposalId} ${event.title}`,
    `Status: ${event.status}`,
    voteLine(event),
  ];
  const remaining = remainingLine(event);
  if (remaining) lines.push(remaining);
  return lines;
}

export function formatPlainText(
  event: ProposalEvent,
  proposalUrl: string,
): string {
  return [eventHeadline(event), ...eventBodyLines(event), proposalUrl].join(
    "\n",
  );
}

export function formatSlackPayload(
  event: ProposalEvent,
  proposalUrl: string,
  channel: string = GOVERNANCE_SLACK_CHANNEL,
): {
  channel: string;
  text: string;
  blocks: Array<Record<string, unknown>>;
} {
  const body = [
    `*<${proposalUrl}|#${event.proposalId} ${event.title}>*`,
    `Status: ${event.status}`,
    voteLine(event),
    remainingLine(event),
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  return {
    channel,
    text: `${eventHeadline(event)}: #${event.proposalId} ${event.title}`,
    blocks: [
      {
        type: "header",
        text: {type: "plain_text", text: eventHeadline(event), emoji: true},
      },
      {
        type: "section",
        text: {type: "mrkdwn", text: body},
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: EVENT_TYPE_LABELS[event.type],
          },
        ],
      },
    ],
  };
}
