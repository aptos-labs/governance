# auth.md

You are an agent. Aptos Governance supports **agentic registration** for its public read API. Voting stays on-chain through a user's Aptos wallet.

Follow discover → register → (optional claim) → exchange → call API. Do not skip ahead. Do not POST here during a passive scan.

## Audience

- **Resource:** this origin (`/`)
- **Human app:** `/`
- **Read API:** `/api/proposals`
- **MCP:** `/mcp`

Most data is public. A bearer token is optional identification for `proposals:read`. There is no OAuth grant that can cast a governance vote.

## Step 1 — Discover

### 1a. Protected Resource Metadata

`GET /.well-known/oauth-protected-resource`

Fields: `resource`, `authorization_servers`, `scopes_supported` (`proposals:read`), `bearer_methods_supported` (`header`).

### 1b. Authorization Server metadata

`GET /.well-known/oauth-authorization-server`

Also published as OpenID discovery at `/.well-known/openid-configuration`.

Read `issuer`, `token_endpoint`, `jwks_uri`, `grant_types_supported`, and the `agent_auth` block (`skill`, `register_uri`, `identity_types_supported`).

## Step 2 — Pick a method

1. **Anonymous** (recommended for read-only agents): POST `{"type":"anonymous"}` to `register_uri`.
2. **Identity assertion** if you have an ID-JAG for this audience (`urn:ietf:params:oauth:token-type:id-jag`).
3. **Verified email** is advertised for claim ceremony completeness; this deployment does not send email. Use anonymous instead.

## Step 3 — Register

`POST /agent/identity`

`Content-Type: application/json`

```json
{ "type": "anonymous" }
```

Response includes `identity_assertion`, `claim_token`, and may include an `access_token` already usable as `Authorization: Bearer`.

## Step 4 — Claim (optional)

Anonymous credentials can stay unclaimed. To attach a human later, POST to `/agent/identity/claim` with the `claim_token`. The user completes the ceremony in the browser at `/delegation` by connecting an Aptos wallet.

## Step 5 — Token

`POST /oauth2/token`

- `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<identity_assertion>`
- or `grant_type=client_credentials&scope=proposals:read` (no client secret)

## Step 6 — Call the API

Send `Authorization: Bearer <access_token>` if you have one. Omitting the header is allowed for GET `/api/*`.

Revoke: `POST /oauth2/revoke` with `token=<access_token>`.
