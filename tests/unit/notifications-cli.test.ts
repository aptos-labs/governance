import {describe, expect, it, vi} from "vitest";
import {
  DEFAULT_POLL_INTERVAL_MS,
  parseEnvFile,
  parseWorkerArgs,
  WORKER_HELP,
} from "~/lib/notifications/cli";
import {main} from "~/notifications-worker";

describe("parseWorkerArgs", () => {
  it("defaults to a 5 minute loop and the on-disk snapshot path", () => {
    expect(parseWorkerArgs([], {})).toEqual({
      help: false,
      once: false,
      dryRun: false,
      intervalMs: DEFAULT_POLL_INTERVAL_MS,
      storePath: ".data/notifications.json",
      envFiles: [".env", ".env.local"],
      envFilesExplicit: false,
    });
  });

  it("parses once, dry-run, interval, store, and env-file flags", () => {
    expect(
      parseWorkerArgs(
        [
          "--once",
          "--dry-run",
          "--interval",
          "60000",
          "--store",
          "/var/lib/gov.json",
          "--env-file",
          "/etc/gov.env",
        ],
        {},
      ),
    ).toEqual({
      help: false,
      once: true,
      dryRun: true,
      intervalMs: 60000,
      storePath: "/var/lib/gov.json",
      envFiles: ["/etc/gov.env"],
      envFilesExplicit: true,
    });
  });

  it("rejects unknown flags with an example invocation", () => {
    const result = parseWorkerArgs(["--watch"], {});
    expect(result).toMatchObject({
      error: "Unknown argument: --watch",
      example: "pnpm notifications:worker --help",
    });
  });

  it("documents copy-pasteable examples in --help", () => {
    expect(parseWorkerArgs(["--help"], {})).toMatchObject({help: true});
    expect(WORKER_HELP).toContain("pnpm notifications:worker --once");
    expect(WORKER_HELP).toContain("pnpm notifications:worker --once --dry-run");
  });

  it("prints help from the worker entry without polling", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(await main(["--help"])).toBe(0);
    expect(String(log.mock.calls[0]?.[0])).toContain(
      "pnpm notifications:worker --once",
    );
    log.mockRestore();
  });
});

describe("parseEnvFile", () => {
  it("parses KEY=VALUE lines and ignores comments", () => {
    expect(
      parseEnvFile(
        [
          "# comment",
          "NOTIFICATIONS_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/TTEST/BTEST/not-a-real-token",
          'NOTIFICATIONS_PUBLIC_APP_URL="https://gov.example"',
          "export APTOS_BUILD_API_KEY=aptoslabs_test",
        ].join("\n"),
      ),
    ).toEqual({
      NOTIFICATIONS_SLACK_WEBHOOK_URL:
        "https://hooks.slack.com/services/TTEST/BTEST/not-a-real-token",
      NOTIFICATIONS_PUBLIC_APP_URL: "https://gov.example",
      APTOS_BUILD_API_KEY: "aptoslabs_test",
    });
  });
});
