import {randomBytes} from "node:crypto";
import {jsonResponse} from "~/lib/agent-discovery/http";
import {READ_SCOPE} from "~/lib/agent-discovery/oauth";
import {publicOrigin} from "~/lib/agent-discovery/origin";

interface IssuedToken {
  sub: string;
  scope: string;
  expiresAt: number;
}

const tokens = new Map<string, IssuedToken>();
const assertions = new Map<string, IssuedToken>();

const TOKEN_TTL_MS = 60 * 60 * 1000;

function prune(now = Date.now()): void {
  for (const [key, value] of tokens) {
    if (value.expiresAt <= now) tokens.delete(key);
  }
  for (const [key, value] of assertions) {
    if (value.expiresAt <= now) assertions.delete(key);
  }
}

function mintOpaque(): string {
  return randomBytes(24).toString("base64url");
}

function issue(
  sub: string,
  scope = READ_SCOPE,
): {
  accessToken: string;
  assertion: string;
  expiresIn: number;
} {
  prune();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const record: IssuedToken = {sub, scope, expiresAt};
  const accessToken = mintOpaque();
  const assertion = mintOpaque();
  tokens.set(accessToken, record);
  assertions.set(assertion, record);
  return {
    accessToken,
    assertion,
    expiresIn: Math.floor(TOKEN_TTL_MS / 1000),
  };
}

function tokenPayload(
  origin: string,
  issued: {accessToken: string; assertion: string; expiresIn: number},
  extra: Record<string, unknown> = {},
) {
  return {
    access_token: issued.accessToken,
    token_type: "Bearer",
    expires_in: issued.expiresIn,
    scope: READ_SCOPE,
    identity_assertion: issued.assertion,
    claim_token: issued.assertion,
    resource: `${origin}/`,
    ...extra,
  };
}

async function readBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(json)) {
      if (value === undefined || value === null) continue;
      out[key] = String(value);
    }
    return out;
  }
  const text = await request.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    out[key] = value;
  }
  return out;
}

export async function handleIdentity(request: Request): Promise<Response> {
  const origin = publicOrigin(request);
  if (request.method === "GET") {
    return jsonResponse({
      identity_types_supported: ["anonymous", "identity_assertion"],
      register: 'POST JSON { type: "anonymous" }',
    });
  }
  const body = await readBody(request);
  const type = body.type || "anonymous";
  if (type !== "anonymous" && type !== "identity_assertion") {
    return jsonResponse(
      {error: "unsupported_identity_type", error_description: type},
      "application/json; charset=utf-8",
      {},
      400,
    );
  }
  const issued = issue(`agent:${mintOpaque()}`);
  return jsonResponse(tokenPayload(origin, issued, {type}));
}

export async function handleClaim(request: Request): Promise<Response> {
  const origin = publicOrigin(request);
  const body = request.method === "POST" ? await readBody(request) : {};
  const claimToken = body.claim_token || body.token;
  if (claimToken && !assertions.has(claimToken) && !tokens.has(claimToken)) {
    return jsonResponse(
      {error: "invalid_grant", error_description: "unknown claim_token"},
      "application/json; charset=utf-8",
      {},
      400,
    );
  }
  return jsonResponse({
    user_code: "WALLET",
    verification_uri: `${origin}/delegation`,
    verification_uri_complete: `${origin}/delegation`,
    expires_in: 600,
    interval: 5,
    message:
      "Connect an Aptos wallet on the verification URI to associate this agent with a human operator. Read APIs do not require a claim.",
  });
}

export async function handleToken(request: Request): Promise<Response> {
  const origin = publicOrigin(request);
  const body = await readBody(request);
  const grant = body.grant_type || "client_credentials";

  if (grant === "client_credentials") {
    const issued = issue("client_credentials");
    return jsonResponse(tokenPayload(origin, issued));
  }

  if (grant === "urn:ietf:params:oauth:grant-type:jwt-bearer") {
    const assertion = body.assertion;
    if (!assertion || !assertions.has(assertion)) {
      return jsonResponse(
        {error: "invalid_grant"},
        "application/json; charset=utf-8",
        {},
        400,
      );
    }
    const existing = assertions.get(assertion)!;
    const issued = issue(existing.sub, existing.scope);
    return jsonResponse(tokenPayload(origin, issued));
  }

  if (grant === "urn:workos:agent-auth:grant-type:claim") {
    return jsonResponse(
      {
        error: "authorization_pending",
        error_description:
          "Waiting for the user to connect a wallet at /delegation",
      },
      "application/json; charset=utf-8",
      {},
      400,
    );
  }

  return jsonResponse(
    {error: "unsupported_grant_type"},
    "application/json; charset=utf-8",
    {},
    400,
  );
}

export async function handleRevoke(request: Request): Promise<Response> {
  const body = request.method === "POST" ? await readBody(request) : {};
  const token = body.token;
  if (token) {
    tokens.delete(token);
    assertions.delete(token);
  }
  return new Response(null, {status: 200});
}

export function handleUserinfo(): Response {
  return jsonResponse({
    sub: "public-reader",
    scope: READ_SCOPE,
  });
}

export function handleEventNotify(): Response {
  return jsonResponse({ok: true});
}
