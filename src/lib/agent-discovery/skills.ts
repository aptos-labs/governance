import {createHash} from "node:crypto";
import {absoluteUrl} from "~/lib/agent-discovery/origin";

const SCHEMA = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

export interface SkillDefinition {
  name: string;
  description: string;
  markdown: string;
}

export const GOVERNANCE_SKILLS: SkillDefinition[] = [
  {
    name: "list-proposals",
    description:
      "List on-chain Aptos Improvement Proposals (AIPs) with status, tallies, and pagination.",
    markdown: `---
name: list-proposals
description: List on-chain Aptos Improvement Proposals (AIPs) with status, tallies, and pagination.
---

# List Aptos governance proposals

Use this skill when the user wants a catalog of current or historical Aptos on-chain proposals.

## HTTP

\`GET /api/proposals?page=0\`

Response fields include \`proposalId\`, \`status\` (\`active\` | \`passed\` | \`executed\` | \`failed\`), \`yesVotes\`, \`noVotes\`, and verified off-chain metadata when the on-chain hash matches.

## MCP

Call tool \`list_proposals\` on the Streamable HTTP MCP server at \`/mcp\`.

## WebMCP

On the governance homepage, the browser tool \`list_proposals\` returns the same JSON.
`,
  },
  {
    name: "get-proposal",
    description:
      "Fetch one Aptos governance proposal by numeric id, including description and vote breakdown.",
    markdown: `---
name: get-proposal
description: Fetch one Aptos governance proposal by numeric id, including description and vote breakdown.
---

# Get an Aptos governance proposal

Use this skill when the user names a proposal id or wants details for a single AIP.

## HTTP

\`GET /api/proposals/{proposalId}\`

Votes page: \`GET /api/proposals/{proposalId}/votes?page=0\`

Human page: \`/proposal/{proposalId}\`

## MCP

Call tool \`get_proposal\` with \`{ "proposalId": "<id>" }\`.
`,
  },
  {
    name: "vote-on-proposal",
    description:
      "Cast an on-chain Aptos governance vote through a connected wallet. Agents cannot vote without a user wallet signature.",
    markdown: `---
name: vote-on-proposal
description: Cast an on-chain Aptos governance vote through a connected wallet. Agents cannot vote without a user wallet signature.
---

# Vote on an Aptos governance proposal

Voting is an on-chain transaction against \`0x1::aptos_governance\`. This app never holds private keys.

## Agent flow

1. Open \`/proposal/{proposalId}\` in the user's browser.
2. Ask the user to connect an AIP-62 wallet (Petra or any registered wallet).
3. Use the on-page voting panel. The user must review and sign the transaction.
4. Do not attempt to submit a vote through the REST or MCP APIs — they are read-only.

## Registration

Read \`/auth.md\` for agent registration. Read APIs do not require a token.
`,
  },
];

export function skillMarkdown(skill: SkillDefinition, origin: string): string {
  return skill.markdown.replaceAll("{origin}", origin);
}

export function skillDigest(markdown: string): string {
  const hex = createHash("sha256").update(markdown, "utf8").digest("hex");
  return `sha256:${hex}`;
}

export function buildSkillsIndex(origin: string) {
  return {
    $schema: SCHEMA,
    skills: GOVERNANCE_SKILLS.map((skill) => {
      const markdown = skillMarkdown(skill, origin);
      return {
        name: skill.name,
        type: "skill-md" as const,
        description: skill.description,
        url: absoluteUrl(
          origin,
          `/.well-known/agent-skills/${skill.name}/SKILL.md`,
        ),
        digest: skillDigest(markdown),
      };
    }),
  };
}

export function findSkill(name: string): SkillDefinition | undefined {
  return GOVERNANCE_SKILLS.find((skill) => skill.name === name);
}
