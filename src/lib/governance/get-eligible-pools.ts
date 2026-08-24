// src/lib/governance/get-eligible-pools.ts
import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {findEligiblePools} from "~/lib/governance/fetch-eligible-pools";

const inputSchema = z.object({
  voterAddress: z.string().min(1),
  proposalId: z.string().regex(/^\d+$/),
});

/**
 * Thin server-fn wrapper around findEligiblePools (Task 7) so the
 * optional APTOS_BUILD_API_KEY env var and indexer calls stay
 * server-side, matching the pattern used by listProposals/getProposalDetail.
 * Called from the client (VotingPanel) once a wallet is connected —
 * unlike the list/detail server functions, this is never used as a
 * route loader, since it depends on the connected address.
 */
export const getEligiblePools = createServerFn({method: "GET"})
  .validator(inputSchema)
  .handler(async ({data}) => {
    const pools = await findEligiblePools(data.voterAddress, data.proposalId);
    // Serialize bigints as strings for the wire — server fns JSON-encode
    // their return value, and JSON has no native bigint support.
    return pools.map((pool) => ({
      ...pool,
      remainingVotingPower: pool.remainingVotingPower.toString(),
    }));
  });
