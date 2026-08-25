import {createFileRoute} from "@tanstack/react-router";
import {AGENT_DISCOVERY_HANDLERS} from "~/lib/agent-discovery/route-handler";

export const Route = createFileRoute("/agent/identity")({
  server: {handlers: AGENT_DISCOVERY_HANDLERS},
});
