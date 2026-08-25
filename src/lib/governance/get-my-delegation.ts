// src/lib/governance/get-my-delegation.ts
import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {
  fetchVoteHistoryForPool,
  findMyPools,
} from "~/lib/governance/fetch-my-pools";

const inputSchema = z.object({voterAddress: z.string().min(1)});

export const getMyDelegation = createServerFn({method: "GET"})
  .validator(inputSchema)
  .handler(async ({data}) => {
    const pools = await findMyPools(data.voterAddress);

    const withHistory = await Promise.all(
      pools.map(async (pool) => {
        // Per Task 17 Step 1: if the live filterability check failed,
        // replace this call with `Promise.resolve([])` and keep the
        // rest of the page working with an empty history list.
        const history = await fetchVoteHistoryForPool(pool.poolAddress).catch(
          () => [],
        );
        return {
          ...pool,
          votingPower: pool.votingPower.toString(),
          history: history.map((h) => ({
            ...h,
            numVotes: h.numVotes.toString(),
          })),
        };
      }),
    );

    return {pools: withHistory};
  });
