import {absoluteUrl} from "~/lib/agent-discovery/origin";

export const READ_SCOPE = "proposals:read";

export function issuerUrl(origin: string): string {
  return origin;
}

export function buildProtectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}/`,
    resource_name: "Aptos Governance",
    authorization_servers: [issuerUrl(origin)],
    scopes_supported: [READ_SCOPE],
    bearer_methods_supported: ["header"],
    resource_documentation: absoluteUrl(origin, "/docs/api"),
  };
}

export function buildAgentAuthBlock(origin: string) {
  return {
    skill: absoluteUrl(origin, "/auth.md"),
    register_uri: absoluteUrl(origin, "/agent/identity"),
    identity_endpoint: absoluteUrl(origin, "/agent/identity"),
    claim_endpoint: absoluteUrl(origin, "/agent/identity/claim"),
    claim_uri: absoluteUrl(origin, "/agent/identity/claim"),
    revocation_uri: absoluteUrl(origin, "/oauth2/revoke"),
    events_endpoint: absoluteUrl(origin, "/agent/event/notify"),
    identity_types_supported: ["anonymous", "identity_assertion"],
    identity_assertion: {
      assertion_types_supported: [
        "urn:ietf:params:oauth:token-type:id-jag",
        "verified_email",
      ],
    },
    anonymous: {
      credential_types_supported: ["access_token"],
      claim_uri: absoluteUrl(origin, "/agent/identity/claim"),
    },
    events_supported: [
      "https://schemas.workos.com/events/agent/auth/identity/assertion/revoked",
    ],
  };
}

export function buildAuthorizationServerMetadata(origin: string) {
  const issuer = issuerUrl(origin);
  return {
    ...buildProtectedResourceMetadata(origin),
    issuer,
    authorization_endpoint: absoluteUrl(origin, "/oauth2/authorize"),
    token_endpoint: absoluteUrl(origin, "/oauth2/token"),
    revocation_endpoint: absoluteUrl(origin, "/oauth2/revoke"),
    jwks_uri: absoluteUrl(origin, "/.well-known/jwks.json"),
    response_types_supported: ["code", "token"],
    grant_types_supported: [
      "client_credentials",
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "urn:workos:agent-auth:grant-type:claim",
    ],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    code_challenge_methods_supported: ["S256"],
    service_documentation: absoluteUrl(origin, "/docs/api"),
    agent_auth: buildAgentAuthBlock(origin),
  };
}

export function buildOpenIdConfiguration(origin: string) {
  return {
    ...buildAuthorizationServerMetadata(origin),
    userinfo_endpoint: absoluteUrl(origin, "/oauth2/userinfo"),
    id_token_signing_alg_values_supported: ["none"],
    subject_types_supported: ["public"],
    claims_supported: ["iss", "sub", "aud", "exp", "iat", "scope"],
  };
}

export function buildJwks() {
  return {keys: [] as unknown[]};
}

export function buildAuthMd(_origin?: string): string {
  return `# auth.md

You are an agent. Aptos Governance supports **agentic registration** for its public read API. Voting stays on-chain through a user's Aptos wallet.

Follow discover → register → (optional claim) → exchange → call API. Do not skip ahead. Do not POST here during a passive scan.

## Audience

- **Resource:** this origin (\`/\`)
- **Human app:** \`/\`
- **Read API:** \`/api/proposals\`
- **MCP:** \`/mcp\`

Most data is public. A bearer token is optional identification for \`proposals:read\`. There is no OAuth grant that can cast a governance vote.

## Step 1 — Discover

### 1a. Protected Resource Metadata

\`GET /.well-known/oauth-protected-resource\`

Fields: \`resource\`, \`authorization_servers\`, \`scopes_supported\` (\`${READ_SCOPE}\`), \`bearer_methods_supported\` (\`header\`).

### 1b. Authorization Server metadata

\`GET /.well-known/oauth-authorization-server\`

Also published as OpenID discovery at \`/.well-known/openid-configuration\`.

Read \`issuer\`, \`token_endpoint\`, \`jwks_uri\`, \`grant_types_supported\`, and the \`agent_auth\` block (\`skill\`, \`register_uri\`, \`identity_types_supported\`).

## Step 2 — Pick a method

1. **Anonymous** (recommended for read-only agents): POST \`{"type":"anonymous"}\` to \`register_uri\`.
2. **Identity assertion** if you have an ID-JAG for this audience (\`urn:ietf:params:oauth:token-type:id-jag\`).
3. **Verified email** is advertised for claim ceremony completeness; this deployment does not send email. Use anonymous instead.

## Step 3 — Register

\`POST /agent/identity\`

\`Content-Type: application/json\`

\`\`\`json
{ "type": "anonymous" }
\`\`\`

Response includes \`identity_assertion\`, \`claim_token\`, and may include an \`access_token\` already usable as \`Authorization: Bearer\`.

## Step 4 — Claim (optional)

Anonymous credentials can stay unclaimed. To attach a human later, POST to \`/agent/identity/claim\` with the \`claim_token\`. The user completes the ceremony in the browser at \`/delegation\` by connecting an Aptos wallet.

## Step 5 — Token

\`POST /oauth2/token\`

- \`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<identity_assertion>\`
- or \`grant_type=client_credentials&scope=${READ_SCOPE}\` (no client secret)

## Step 6 — Call the API

Send \`Authorization: Bearer <access_token>\` if you have one. Omitting the header is allowed for GET \`/api/*\`.

Revoke: \`POST /oauth2/revoke\` with \`token=<access_token>\`.
`;
}

export function buildAuthorizeHtml(origin: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Aptos Governance authorization</title>
</head>
<body>
  <main>
    <h1>Authorization</h1>
    <p>This authorization server issues optional <code>${READ_SCOPE}</code> tokens for the public governance read API.</p>
    <p>Agents should follow <a href="/auth.md">auth.md</a> and register at <code>POST /agent/identity</code> rather than using an interactive login form.</p>
    <p>On-chain votes require an Aptos wallet at <a href="/">${origin}</a>.</p>
  </main>
</body>
</html>
`;
}
