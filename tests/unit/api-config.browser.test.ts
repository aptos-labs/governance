// @vitest-environment jsdom
import {afterEach, describe, expect, it} from "vitest";
import {resolveApiConfig, resolveApiKey} from "~/lib/governance/api-config";

const KEY_ENVS = [
  "APTOS_BUILD_API_KEY",
  "GEOMI_API_KEY",
  "VITE_GEOMI_API_KEY",
  "VITE_APTOS_API_KEY_MAINNET",
  "VITE_APTOS_API_KEY",
  "APTOS_API_KEY",
] as const;

const originalEnv: Record<string, string | undefined> = {};

function clearKeyEnvs() {
  for (const name of KEY_ENVS) {
    if (!(name in originalEnv)) originalEnv[name] = process.env[name];
    delete process.env[name];
  }
}

afterEach(() => {
  for (const name of KEY_ENVS) {
    const value = originalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("resolveApiKey in the browser", () => {
  it("uses the frontend key and ignores the backend key", () => {
    clearKeyEnvs();
    process.env.APTOS_BUILD_API_KEY = "aptoslabs_server_key";
    process.env.VITE_APTOS_API_KEY = "AG-CLIENTKEY";
    const resolved = resolveApiKey();
    expect(resolved.source).toBe("VITE_APTOS_API_KEY");
    expect(resolved.key).toBe("AG-CLIENTKEY");
    expect(resolved.kind).toBe("client");
    expect(resolveApiConfig().apiKey).toBe("AG-CLIENTKEY");
  });

  it("accepts the legacy Vite mainnet client key name", () => {
    clearKeyEnvs();
    process.env.VITE_APTOS_API_KEY_MAINNET = "AG-LEGACYCLIENT";
    expect(resolveApiKey().source).toBe("VITE_APTOS_API_KEY_MAINNET");
    expect(resolveApiConfig().apiKey).toBe("AG-LEGACYCLIENT");
  });

  it("does not send a backend server key from the browser", () => {
    clearKeyEnvs();
    process.env.VITE_APTOS_API_KEY = "aptoslabs_leaked_server_key";
    const config = resolveApiConfig();
    expect(config.kind).toBe("server");
    expect(config.apiKey).toBeUndefined();
  });
});
