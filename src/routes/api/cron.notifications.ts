import {createFileRoute} from "@tanstack/react-router";
import {cronAuthorized} from "~/lib/notifications/auth";
import {resolveNotificationConfig} from "~/lib/notifications/config";
import {runNotificationPoll} from "~/lib/notifications/poll";
import {getNotificationStore} from "~/lib/notifications/store";

async function handleCron({request}: {request: Request}): Promise<Response> {
  const config = resolveNotificationConfig();
  if (!cronAuthorized(request, config.cronSecret)) {
    return Response.json({error: "Unauthorized"}, {status: 401});
  }

  try {
    const store = getNotificationStore(config);
    const result = await runNotificationPoll({config, store});
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[notifications] poll failed", error);
    return Response.json({error: message}, {status: 500});
  }
}

export const Route = createFileRoute("/api/cron/notifications")({
  server: {
    handlers: {
      GET: handleCron,
      POST: handleCron,
    },
  },
});
