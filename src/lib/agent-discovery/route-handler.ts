import {handleAgentDiscoveryRequest} from "~/lib/agent-discovery/dispatch";

export async function agentDiscoveryHandler({
  request,
}: {
  request: Request;
}): Promise<Response> {
  const response = await handleAgentDiscoveryRequest(request);
  return response ?? new Response("Not found\n", {status: 404});
}

export const AGENT_DISCOVERY_HANDLERS = {
  GET: agentDiscoveryHandler,
  HEAD: agentDiscoveryHandler,
  POST: agentDiscoveryHandler,
  OPTIONS: agentDiscoveryHandler,
};
