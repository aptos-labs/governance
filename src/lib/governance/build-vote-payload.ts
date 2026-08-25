// src/lib/governance/build-vote-payload.ts
import type {InputEntryFunctionData} from "@aptos-labs/ts-sdk";
import type {EligiblePool} from "~/lib/governance/types";

/**
 * Uses the SDK's own InputEntryFunctionData type directly (re-exported
 * from @aptos-labs/ts-sdk) rather than a hand-rolled lookalike interface.
 * A structurally-similar-but-distinct interface does not reliably widen
 * to the wallet adapter's InputTransactionData['data'] union
 * (InputGenerateTransactionPayloadData = InputEntryFunctionData |
 * InputScriptData | InputMultiSigData | InputMultiSigScriptData) —
 * TypeScript's error messages when this mismatches point at the wrong
 * union branch (e.g. complaining about a missing multisigAddress field),
 * which is misleading. Using the real type sidesteps this entirely.
 */
export interface VoteTransactionPayload {
  data: InputEntryFunctionData;
}

/**
 * Builds the standard/JSON transaction payload for casting a vote,
 * per design spec §6.4/§8: always the standard entry-function input
 * shape (not raw BCS), always an explicit voting-power amount (never
 * the MAX_U64 "vote all" sugar — see Task 16's design-decision note),
 * one pool per transaction.
 */
export function buildVoteTransactionPayload(
  pool: EligiblePool,
  proposalId: string,
  amountOctas: bigint,
  shouldPass: boolean,
): VoteTransactionPayload {
  if (amountOctas <= 0n) {
    throw new Error("Voting power amount must be greater than zero");
  }
  if (amountOctas > pool.remainingVotingPower) {
    throw new Error(
      `Requested amount ${amountOctas} exceeds remaining voting power ${pool.remainingVotingPower} for pool ${pool.poolAddress}`,
    );
  }

  const functionId =
    pool.poolKind === "stake_pool"
      ? "0x1::aptos_governance::partial_vote"
      : "0x1::delegation_pool::vote";

  return {
    data: {
      function: functionId,
      typeArguments: [],
      functionArguments: [
        pool.poolAddress,
        proposalId,
        amountOctas.toString(),
        shouldPass,
      ],
    },
  };
}
