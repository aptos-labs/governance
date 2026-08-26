import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import type {NotificationConfig} from "~/lib/notifications/config";
import {isVercelRuntime} from "~/lib/notifications/config";
import {
  EMPTY_STORE_STATE,
  type NotificationStoreState,
  normalizeWatchState,
} from "~/lib/notifications/types";

export type StoreKind = "memory" | "file" | "upstash";

export interface NotificationStore {
  kind: StoreKind;
  durable: boolean;
  withLock<T>(
    fn: (state: NotificationStoreState) => Promise<{
      state: NotificationStoreState;
      result: T;
    }>,
  ): Promise<T>;
}

const STATE_KEY = "aptos-gov:notifications:v1";
const LOCK_KEY = "aptos-gov:notifications:lock";
const LOCK_TTL_SECONDS = 55;

export function normalizeStoreState(value: unknown): NotificationStoreState {
  if (!value || typeof value !== "object") return EMPTY_STORE_STATE;
  const record = value as Partial<NotificationStoreState>;
  if (record.version !== 1) return EMPTY_STORE_STATE;
  return {
    version: 1,
    snapshot: {
      initialized: Boolean(record.snapshot?.initialized),
      nextProposalId: Number(record.snapshot?.nextProposalId) || 0,
      proposals: normalizeSnapshotProposals(record.snapshot?.proposals),
    },
  };
}

function normalizeSnapshotProposals(
  value: unknown,
): NotificationStoreState["snapshot"]["proposals"] {
  if (!value || typeof value !== "object") return {};
  const proposals: NotificationStoreState["snapshot"]["proposals"] = {};
  for (const [id, watch] of Object.entries(value)) {
    const normalized = normalizeWatchState(watch);
    if (normalized) proposals[id] = normalized;
  }
  return proposals;
}

export class MemoryNotificationStore implements NotificationStore {
  readonly kind = "memory" as const;
  readonly durable: boolean;
  state: NotificationStoreState;

  constructor(
    initial: NotificationStoreState = EMPTY_STORE_STATE,
    durable = false,
  ) {
    this.state = initial;
    this.durable = durable;
  }

  async withLock<T>(
    fn: (state: NotificationStoreState) => Promise<{
      state: NotificationStoreState;
      result: T;
    }>,
  ): Promise<T> {
    const {state, result} = await fn(this.state);
    this.state = state;
    return result;
  }
}

export class FileNotificationStore implements NotificationStore {
  readonly kind = "file" as const;
  readonly durable = true;
  private readonly filePath: string;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async withLock<T>(
    fn: (state: NotificationStoreState) => Promise<{
      state: NotificationStoreState;
      result: T;
    }>,
  ): Promise<T> {
    const run = this.chain.then(() => this.runExclusive(fn));
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async runExclusive<T>(
    fn: (state: NotificationStoreState) => Promise<{
      state: NotificationStoreState;
      result: T;
    }>,
  ): Promise<T> {
    const current = await this.read();
    const {state, result} = await fn(current);
    await this.write(state);
    return result;
  }

  private async read(): Promise<NotificationStoreState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return normalizeStoreState(JSON.parse(raw));
    } catch (error) {
      if ((error as {code?: string}).code === "ENOENT") {
        return EMPTY_STORE_STATE;
      }
      throw error;
    }
  }

  private async write(state: NotificationStoreState): Promise<void> {
    await mkdir(path.dirname(this.filePath), {recursive: true});
    await writeFile(
      this.filePath,
      `${JSON.stringify(state, null, 2)}\n`,
      "utf8",
    );
  }
}

export class UpstashNotificationStore implements NotificationStore {
  readonly kind = "upstash" as const;
  readonly durable = true;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async withLock<T>(
    fn: (state: NotificationStoreState) => Promise<{
      state: NotificationStoreState;
      result: T;
    }>,
  ): Promise<T> {
    const lockId = crypto.randomUUID();
    const locked = await this.redis([
      "SET",
      LOCK_KEY,
      lockId,
      "NX",
      "EX",
      String(LOCK_TTL_SECONDS),
    ]);
    if (locked !== "OK") {
      throw new Error("notifications store is busy; try again shortly");
    }

    try {
      const raw = await this.redis(["GET", STATE_KEY]);
      const current = normalizeStoreState(
        typeof raw === "string" ? JSON.parse(raw) : raw,
      );
      const {state, result} = await fn(current);
      await this.redis(["SET", STATE_KEY, JSON.stringify(state)]);
      return result;
    } finally {
      await this.releaseLock(lockId);
    }
  }

  private async releaseLock(lockId: string): Promise<void> {
    await this.redis([
      "EVAL",
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      "1",
      LOCK_KEY,
      lockId,
    ]);
  }

  private async redis(command: string[]): Promise<unknown> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    if (!response.ok) {
      throw new Error(`Upstash Redis error (${response.status})`);
    }
    const payload = (await response.json()) as {
      result?: unknown;
      error?: string;
    };
    if (payload.error) throw new Error(payload.error);
    return payload.result;
  }
}

let cachedStore: NotificationStore | undefined;

export function resetNotificationStoreForTests(): void {
  cachedStore = undefined;
}

export function createNotificationStore(
  config: NotificationConfig,
): NotificationStore {
  if (config.upstashUrl && config.upstashToken) {
    return new UpstashNotificationStore(config.upstashUrl, config.upstashToken);
  }
  const filePath = config.storePath || path.resolve(".data/notifications.json");
  if (isVercelRuntime() && !config.storePath) {
    return new MemoryNotificationStore();
  }
  return new FileNotificationStore(filePath);
}

export function getNotificationStore(
  config: NotificationConfig,
): NotificationStore {
  cachedStore ??= createNotificationStore(config);
  return cachedStore;
}
