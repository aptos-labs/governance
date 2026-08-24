// tests/e2e/fixtures/mock-fullnode-server.ts
import http from "node:http";
import { Deserializer, EntryFunction } from "@aptos-labs/ts-sdk";
import { MOCK_POOL_ADDRESS } from "./mock-wallet.ts";

export const ACTIVE_PROPOSAL_ID = "999";
const VOTING_FORUM_HANDLE =
  "0xmockforumhandle00000000000000000000000000000000000000000000001";

// Same field shapes as the real mainnet fixture used in Task 8's test —
// but with a future expiration so this proposal is always "active".
function buildMockProposal() {
  const nowSecs = Math.floor(Date.now() / 1000);
  return {
    proposer: MOCK_POOL_ADDRESS,
    execution_content: { vec: [{ dummy_field: false }] },
    metadata: {
      data: [
        {
          key: "metadata_location",
          // hex("http://localhost:8081/metadata.json")
          value:
            "0x687474703a2f2f6c6f63616c686f73743a383038312f6d657461646174612e6a736f6e",
        },
        {
          key: "metadata_hash",
          // filled in at server start once we've computed sha3-256 of the served metadata body
          value: "0x00",
        },
      ],
    },
    creation_time_secs: String(nowSecs - 3600),
    execution_hash: "0x00",
    min_vote_threshold: "1",
    expiration_secs: String(nowSecs + 3600),
    early_resolution_vote_threshold: { vec: [] },
    yes_votes: "0",
    no_votes: "0",
    is_resolved: false,
    resolution_time_secs: "0",
  };
}

// NOTE: @noble/hashes@2.x requires the explicit .js extension on
// subpath imports (its package.json "exports" map only defines
// "./sha3.js" and "./utils.js", not the extensionless "./sha3"/"./utils"
// that worked on older majors) — confirmed the hard way in Task 4
// (reproduced ERR_PACKAGE_PATH_NOT_EXPORTED with the extensionless
// form). Fixed proactively here rather than waiting to hit the error.
async function computeMetadataHashHex(): Promise<string> {
  const { sha3_256 } = await import("@noble/hashes/sha3.js");
  const { bytesToHex } = await import("@noble/hashes/utils.js");
  const digestHex = bytesToHex(
    sha3_256(new TextEncoder().encode(MOCK_METADATA_BODY)),
  );
  // On-chain shape confirmed in Task 4/8: hex-of-ASCII-hex-digest, not raw digest bytes.
  return "0x" + Buffer.from(digestHex, "ascii").toString("hex");
}

const MOCK_METADATA_BODY = JSON.stringify({
  title: "Mock Proposal For E2E Testing",
  description: "This proposal exists only for the Playwright e2e test.",
  source_code_url: "https://example.com/src",
  discussion_url: "https://example.com/discuss",
});

export async function startMockFullnodeServer(port = 8081) {
  const metadataHashHex = await computeMetadataHashHex();
  const proposal = buildMockProposal();
  proposal.metadata.data[1].value = metadataHashHex;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    res.setHeader("Content-Type", "application/json");

    if (url.pathname === "/metadata.json") {
      res.setHeader("Content-Type", "application/json");
      res.end(MOCK_METADATA_BODY);
      return;
    }

    // aptos.view() internally calls fetchFunctionAbi() ->
    // fetchModuleAbi() -> getModule(), which issues a real
    // GET /v1/accounts/:address/module/:moduleName request to fetch
    // the target module's on-chain ABI before validating/encoding the
    // view call's arguments (confirmed directly from
    // @aptos-labs/ts-sdk's transactions/transactionBuilder/remoteAbi.js
    // source — this is not part of the view-function response itself,
    // it's a separate prerequisite request the SDK makes first).
    // Matches any 0x1::<module> since this app's view calls span
    // multiple modules (aptos_governance, delegation_pool). The ABI
    // below is deliberately minimal — it only declares the specific
    // functions this app's mocked /v1/view handler below actually
    // knows how to answer, with permissive `Object` param/return types
    // so the SDK's argument encoder doesn't need real type-tag parsing
    // to accept the string/address arguments this app passes.
    const moduleAbiMatch = url.pathname.match(
      /^\/v1\/accounts\/0x1\/module\/([a-zA-Z_][a-zA-Z0-9_]*)$/,
    );
    if (moduleAbiMatch) {
      const moduleName = moduleAbiMatch[1];
      // Each function's params/return MUST match its real on-chain
      // signature (confirmed against the actual Move source in
      // aptos_governance.move/delegation_pool.move during plan
      // research) — NOT one generic shape for all functions. The
      // SDK's remote-ABI argument encoder uses these declared types
      // to parse each argument (e.g. "address" triggers hex-address
      // parsing), so a wrong type here causes a real, confusing
      // encoding failure on an argument that is actually correct for
      // its real position (confirmed by reproducing exactly this:
      // declaring a proposal-id argument slot as "address" caused
      // "Hex string is too short..." trying to parse "999" as hex).
      const functionAbis: Record<
        string,
        { params: string[]; return: string[] }
      > = {
        get_remaining_voting_power: {
          params: ["address", "u64"],
          return: ["u64"],
        },
        has_entirely_voted: {
          params: ["address", "u64"],
          return: ["bool"],
        },
        get_voting_power: {
          params: ["address"],
          return: ["u64"],
        },
        calculate_and_update_remaining_voting_power: {
          params: ["address", "address", "u64"],
          return: ["u64"],
        },
        calculate_and_update_voter_total_voting_power: {
          params: ["address", "address"],
          return: ["u64"],
        },
      };
      res.end(
        JSON.stringify({
          bytecode: "0x",
          abi: {
            address: "0x1",
            name: moduleName,
            friends: [],
            exposed_functions: Object.entries(functionAbis).map(
              ([name, { params, return: returns }]) => ({
                name,
                visibility: "public",
                is_entry: false,
                is_view: true,
                generic_type_params: [],
                params,
                return: returns,
              }),
            ),
            structs: [],
          },
        }),
      );
      return;
    }

    if (
      url.pathname ===
      "/v1/accounts/0x1/resource/0x1::voting::VotingForum%3C0x1::governance_proposal::GovernanceProposal%3E"
    ) {
      res.end(
        JSON.stringify({
          data: {
            next_proposal_id: String(Number(ACTIVE_PROPOSAL_ID) + 1),
            proposals: { handle: VOTING_FORUM_HANDLE },
          },
        }),
      );
      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === `/v1/tables/${VOTING_FORUM_HANDLE}/item`
    ) {
      res.end(JSON.stringify(proposal));
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/view") {
      // aptos.view() (unlike the deprecated viewJson()) always sends a
      // BCS-serialized body (Content-Type
      // application/x.aptos.view_function+bcs), never JSON — confirmed
      // directly from @aptos-labs/ts-sdk's internal/view.js — and it
      // does so unconditionally once fetchAbi() (see the module-ABI
      // mock above) resolves a real ABI, which is required for every
      // view() call with no JSON fallback path. This was reproduced
      // directly: JSON.parse-ing this body threw
      // "Unexpected token... is not valid JSON" and crashed the mock
      // server entirely once the module-ABI mock started succeeding.
      //
      // Rather than hand-roll a BCS reader, this reuses the SDK's own
      // EntryFunction.deserialize() (the exact counterpart to the
      // serialize() call the SDK's view() function makes) to recover
      // the module/function identifier — the only thing this mock
      // actually branches on. It deliberately does NOT decode the
      // individual function arguments (module_id.deserialize()s the
      // rest as opaque EntryFunctionBytes, which is fine — the mock's
      // responses never depend on argument values).
      const rawBody = await readRawBody(req);
      const deserializer = new Deserializer(rawBody);
      const entryFunction = EntryFunction.deserialize(deserializer);
      const functionId = `${entryFunction.module_name.address.toString()}::${entryFunction.module_name.name.identifier}::${entryFunction.function_name.identifier}`;

      if (functionId === "0x1::aptos_governance::get_remaining_voting_power") {
        res.end(JSON.stringify(["100000000"])); // 1 APT in octas
        return;
      }
      if (functionId === "0x1::aptos_governance::has_entirely_voted") {
        res.end(JSON.stringify([false]));
        return;
      }
      if (functionId === "0x1::aptos_governance::get_voting_power") {
        res.end(JSON.stringify(["100000000"])); // 1 APT in octas
        return;
      }
      if (
        functionId ===
        "0x1::delegation_pool::calculate_and_update_remaining_voting_power"
      ) {
        res.end(JSON.stringify(["0"])); // no delegation-pool power in this mock
        return;
      }
      if (
        functionId ===
        "0x1::delegation_pool::calculate_and_update_voter_total_voting_power"
      ) {
        res.end(JSON.stringify(["0"]));
        return;
      }
      res.end(JSON.stringify([]));
      return;
    }

    // Handler for waitForTransaction: the SDK polls
    // GET /v1/transactions/by_hash/:hash until the response has
    // type !== "pending_transaction" and success !== undefined.
    // Without this, the mock server returns 404, 404 is treated as
    // retryable by handleAPIError, and the SDK polls until its
    // internal timeout (DEFAULT_TXN_TIMEOUT_SEC = 20s), keeping
    // voteMutation.isPending true the whole time \u2014 which means the
    // "Confirm and sign" button stays disabled and the e2e test's
    // waitForFunction for window.__mockWalletCalls never gets past
    // the review-step check to see the mutation resolve.
    // Note: /wait_by_hash/:hash is also called as a "long wait"
    // before polling, so we handle both paths.
    const txByHashMatch = url.pathname.match(
      /^\/v1\/transactions\/by_hash\/(0x[a-f0-9]+)$/,
    );
    if (txByHashMatch) {
      res.end(
        JSON.stringify({
          type: "user_transaction",
          version: "1",
          hash: txByHashMatch[1],
          success: true,
          vm_status: "Executed successfully",
          gas_used: "100",
          gas_unit_price: "100",
          sender: "0x1",
          sequence_number: "0",
          max_gas_amount: "2000",
          expiration_timestamp_secs: String(Math.floor(Date.now() / 1000) + 3600),
          payload: {
            type: "entry_function_payload",
            function: "0x1::aptos_governance::partial_vote",
            type_arguments: [],
            arguments: [],
          },
          events: [],
          timestamp: String(Date.now()),
          block_height: "1",
          epoch: "1",
        }),
      );
      return;
    }

    const txWaitByHashMatch = url.pathname.match(
      /^\/v1\/transactions\/wait_by_hash\/(0x[a-f0-9]+)$/,
    );
    if (txWaitByHashMatch) {
      // Same settled response \u2014 the SDK calls this once (long poll)
      // before falling back to polling transactions/by_hash/:hash.
      res.end(
        JSON.stringify({
          type: "user_transaction",
          version: "1",
          hash: txWaitByHashMatch[1],
          success: true,
          vm_status: "Executed successfully",
          gas_used: "100",
          gas_unit_price: "100",
          sender: "0x1",
          sequence_number: "0",
          max_gas_amount: "2000",
          expiration_timestamp_secs: String(Math.floor(Date.now() / 1000) + 3600),
          payload: {
            type: "entry_function_payload",
            function: "0x1::aptos_governance::partial_vote",
            type_arguments: [],
            arguments: [],
          },
          events: [],
          timestamp: String(Date.now()),
          block_height: "1",
          epoch: "1",
        }),
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/graphql") {
      const body = JSON.parse(await readBody(req));
      if (typeof body.query === "string" && body.query.includes("current_staking_pool_voter")) {
        res.end(
          JSON.stringify({
            data: {
              current_staking_pool_voter: [
                { staking_pool_address: MOCK_POOL_ADDRESS },
              ],
            },
          }),
        );
        return;
      }
      if (typeof body.query === "string" && body.query.includes("current_delegated_voter")) {
        res.end(JSON.stringify({ data: { current_delegated_voter: [] } }));
        return;
      }
      if (typeof body.query === "string" && body.query.includes("proposal_votes")) {
        res.end(JSON.stringify({ data: { proposal_votes: [] } }));
        return;
      }
      res.statusCode = 400;
      res.end(JSON.stringify({ errors: [{ message: "unhandled mock query" }] }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: `mock server: no handler for ${req.method} ${url.pathname}` }));
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  return { server, activeProposalId: ACTIVE_PROPOSAL_ID };
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/** Like readBody, but returns the raw bytes rather than decoding as
 *  UTF-8 text — required for BCS-encoded request bodies (e.g.
 *  aptos.view()'s request, which is binary, not JSON). */
function readRawBody(req: http.IncomingMessage): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    req.on("error", reject);
  });
}
