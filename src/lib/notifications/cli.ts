import {existsSync, readFileSync} from "node:fs";
import path from "node:path";

export const DEFAULT_POLL_INTERVAL_MS = 300_000;
export const DEFAULT_STORE_PATH = ".data/notifications.json";

export const WORKER_HELP = `Aptos governance Slack poller

Watches on-chain proposals and posts created / voting / executed /
countdown alerts to Aptos Labs Slack #governance. The proposal snapshot
is stored on local disk, so this can run on any persistent machine
(no Upstash).

Options:
  --once              Poll once and exit (for cron / systemd timers)
  --interval <ms>     Sleep between polls (default: 300000)
  --store <path>      Snapshot JSON path (default: .data/notifications.json)
  --env-file <path>   Load KEY=VALUE env file (repeatable). Existing
                      process env is not overwritten
  --dry-run           Print events without posting to Slack or writing
                      the snapshot
  --help              Show this help

Environment:
  NOTIFICATIONS_SLACK_WEBHOOK_URL   Incoming Webhook for #governance
  NOTIFICATIONS_SLACK_BOT_TOKEN     Alternative Slack bot token
  NOTIFICATIONS_PUBLIC_APP_URL      Origin used in proposal links
  NOTIFICATIONS_STORE_PATH          Snapshot path (same as --store)
  NOTIFICATIONS_POLL_INTERVAL_MS    Loop delay (same as --interval)
  APTOS_BUILD_API_KEY               Geomi server key
  APTOS_FULLNODE_URL / APTOS_INDEXER_URL

Examples:
  pnpm notifications:worker
  pnpm notifications:worker --once
  pnpm notifications:worker --once --dry-run
  pnpm notifications:worker --interval 60000 --store /var/lib/gov/notifications.json
  pnpm notifications:worker --env-file /etc/gov/notifications.env
`;

export interface WorkerOptions {
  help: boolean;
  once: boolean;
  dryRun: boolean;
  intervalMs: number;
  storePath: string;
  envFiles: string[];
  envFilesExplicit: boolean;
}

export function parseWorkerArgs(
  argv: string[],
  env: NodeJS.Dict<string> = process.env,
): WorkerOptions | {error: string; example: string} {
  if (argv.includes("--help") || argv.includes("-h")) {
    return {
      help: true,
      once: false,
      dryRun: false,
      intervalMs: DEFAULT_POLL_INTERVAL_MS,
      storePath: DEFAULT_STORE_PATH,
      envFiles: [".env", ".env.local"],
      envFilesExplicit: false,
    };
  }

  const defaultInterval = parseInterval(
    env.NOTIFICATIONS_POLL_INTERVAL_MS,
    DEFAULT_POLL_INTERVAL_MS,
  );
  if (typeof defaultInterval !== "number") {
    return {
      error: defaultInterval.error,
      example: "pnpm notifications:worker --interval 300000",
    };
  }

  const options: WorkerOptions = {
    help: false,
    once: false,
    dryRun: false,
    intervalMs: defaultInterval,
    storePath: env.NOTIFICATIONS_STORE_PATH?.trim() || DEFAULT_STORE_PATH,
    envFiles: [],
    envFilesExplicit: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--once") {
      options.once = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--interval" || arg.startsWith("--interval=")) {
      const value =
        arg === "--interval" ? argv[++i] : arg.slice("--interval=".length);
      if (!value) {
        return {
          error: "Missing value for --interval.",
          example: "pnpm notifications:worker --interval 300000",
        };
      }
      const parsed = parseInterval(value, Number.NaN);
      if (typeof parsed !== "number") return parsed;
      options.intervalMs = parsed;
      continue;
    }
    if (arg === "--store" || arg.startsWith("--store=")) {
      const value =
        arg === "--store" ? argv[++i] : arg.slice("--store=".length);
      if (!value) {
        return {
          error: "Missing value for --store.",
          example: "pnpm notifications:worker --store .data/notifications.json",
        };
      }
      options.storePath = value;
      continue;
    }
    if (arg === "--env-file" || arg.startsWith("--env-file=")) {
      const value =
        arg === "--env-file" ? argv[++i] : arg.slice("--env-file=".length);
      if (!value) {
        return {
          error: "Missing value for --env-file.",
          example:
            "pnpm notifications:worker --env-file /etc/gov/notifications.env",
        };
      }
      options.envFiles.push(value);
      options.envFilesExplicit = true;
      continue;
    }
    return {
      error: `Unknown argument: ${arg}`,
      example: "pnpm notifications:worker --help",
    };
  }

  if (!options.envFilesExplicit) {
    options.envFiles = [".env", ".env.local"];
  }
  return options;
}

function parseInterval(
  value: string | undefined,
  fallback: number,
): number | {error: string; example: string} {
  if (value === undefined || value.trim() === "") return fallback;
  if (!/^\d+$/.test(value.trim())) {
    return {
      error: `Invalid interval: ${value}`,
      example: "pnpm notifications:worker --interval 300000",
    };
  }
  const ms = Number(value);
  if (ms < 1000) {
    return {
      error: "Interval must be at least 1000ms.",
      example: "pnpm notifications:worker --interval 300000",
    };
  }
  return ms;
}

export function parseEnvFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const stripped = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = stripped.indexOf("=");
    if (eq <= 0) continue;
    const key = stripped.slice(0, eq).trim();
    let value = stripped.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function applyEnvFile(
  filePath: string,
  env: NodeJS.Dict<string> = process.env,
  options: {required?: boolean} = {},
): {loaded: boolean; path: string} {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) {
    if (options.required) {
      throw new Error(`Env file not found: ${resolved}`);
    }
    return {loaded: false, path: resolved};
  }
  const parsed = parseEnvFile(readFileSync(resolved, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (env[key] === undefined || env[key] === "") {
      env[key] = value;
    }
  }
  return {loaded: true, path: resolved};
}
