import path from "node:path";
import {
  applyEnvFile,
  parseWorkerArgs,
  WORKER_HELP,
  type WorkerOptions,
} from "~/lib/notifications/cli";
import {resolveNotificationConfig} from "~/lib/notifications/config";
import {runNotificationPoll} from "~/lib/notifications/poll";
import {FileNotificationStore} from "~/lib/notifications/store";

export async function main(argv: string[]): Promise<number> {
  const parsed = parseWorkerArgs(argv, process.env);
  if ("error" in parsed) {
    console.error(parsed.error);
    console.error(parsed.example);
    return 1;
  }
  if (parsed.help) {
    console.log(WORKER_HELP);
    return 0;
  }

  if (parsed.dryRun) {
    parsed.once = true;
  }

  try {
    loadEnvFiles(parsed);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  process.env.NOTIFICATIONS_STORE_PATH = path.resolve(parsed.storePath);
  const config = resolveNotificationConfig();
  const store = new FileNotificationStore(path.resolve(parsed.storePath));

  if (!config.slackWebhookUrl && !config.slackBotToken && !parsed.dryRun) {
    console.warn(
      "[notifications] Slack is not configured; snapshot will still update. Set NOTIFICATIONS_SLACK_WEBHOOK_URL or NOTIFICATIONS_SLACK_BOT_TOKEN.",
    );
  }

  if (parsed.once) {
    return runOnce(config, store, parsed);
  }
  return runLoop(config, store, parsed);
}

function loadEnvFiles(options: WorkerOptions): void {
  for (const file of options.envFiles) {
    applyEnvFile(file, process.env, {required: options.envFilesExplicit});
  }
}

async function runOnce(
  config: ReturnType<typeof resolveNotificationConfig>,
  store: FileNotificationStore,
  options: WorkerOptions,
): Promise<number> {
  try {
    const result = await runNotificationPoll({
      config,
      store,
      dryRun: options.dryRun,
    });
    logPoll(result, options);
    return result.failed > 0 ? 1 : 0;
  } catch (error) {
    console.error("[notifications] poll failed", error);
    return 1;
  }
}

async function runLoop(
  config: ReturnType<typeof resolveNotificationConfig>,
  store: FileNotificationStore,
  options: WorkerOptions,
): Promise<number> {
  let stopping = false;
  const onStop = () => {
    stopping = true;
  };
  process.on("SIGINT", onStop);
  process.on("SIGTERM", onStop);

  console.log(
    `[notifications] worker started interval=${options.intervalMs}ms store=${path.resolve(options.storePath)} channel=${config.slackChannel} dryRun=${options.dryRun}`,
  );

  while (!stopping) {
    const code = await runOnce(config, store, options);
    if (stopping) break;
    if (code !== 0) {
      console.error("[notifications] poll failed; retrying after interval");
    }
    await sleep(options.intervalMs, () => stopping);
  }
  console.log("[notifications] worker stopped");
  return 0;
}

function logPoll(
  result: Awaited<ReturnType<typeof runNotificationPoll>>,
  options: WorkerOptions,
): void {
  const types = result.eventTypes.join(",") || "-";
  console.log(
    `[notifications] poll events=${result.events} delivered=${result.delivered} failed=${result.failed} types=${types} fetched=${result.fetched} dryRun=${options.dryRun}`,
  );
}

function sleep(ms: number, isStopped: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timeout);
      clearInterval(watch);
      resolve();
    };
    const timeout = setTimeout(done, ms);
    const watch = setInterval(() => {
      if (isStopped()) done();
    }, 200);
  });
}
