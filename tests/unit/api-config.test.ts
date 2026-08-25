import {afterEach, describe, expect, it} from "vitest";
import {
  classifyApiKey,
  resolveApiConfig,
  resolveApiKey,
} from "~/lib/governance/api-config";

const KEY_ENVS = [
  "APTOS_BUILD_API_KEY",
  "GEOMI_API_KEY",
  "VITE_APTOS_BUILD_API_KEY",
  "VITE_GEOMI_API_KEY",
  "VITE_APTOS_API_KEY_MAINNET",
  "VITE_APTOS_API_KEY",
  "APTOS_API_KEY",
  "APTOS_FULLNODE_URL",
  "APTOS_INDEXER_URL",
  "VITE_GEOMI_FULLNODE_URL",
  "VITE_GEOMI_INDEXER_URL",
  "GEOMI_FULLNODE_URL",
  "GEOMI_INDEXER_URL",
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

describe("classifyApiKey", () => {
  it("recognizes Geomi/Aptos Labs server keys", () => {
    expect(
      classifyApiKey("aptoslabs_aXjFX8fDdZv_AXMynDZvp711WTBpSBmqLyj12RV9RFA6B"),
    ).toBe("server");
  });

  it("recognizes Geomi client keys", () => {
    expect(classifyApiKey("AG-FL4PYMZ1YX1LGAJCWP2R1ACYTYRCBY1GB")).toBe(
      "client",
    );
  });

  it("returns none when the key is missing", () => {
    expect(classifyApiKey(undefined)).toBe("none");
    expect(classifyApiKey("")).toBe("none");
  });
});

describe("resolveApiKey", () => {
  it("prefers APTOS_BUILD_API_KEY over legacy VITE_ names", () => {
    clearKeyEnvs();
    process.env.APTOS_BUILD_API_KEY = "aptoslabs_server_key";
    process.env.VITE_APTOS_API_KEY_MAINNET = "AG-CLIENTKEY";
    const resolved = resolveApiKey();
    expect(resolved.source).toBe("APTOS_BUILD_API_KEY");
    expect(resolved.key).toBe("aptoslabs_server_key");
    expect(resolved.kind).toBe("server");
  });

  it("falls back to the original Vite mainnet key name used on Vercel", () => {
    clearKeyEnvs();
    process.env.VITE_APTOS_API_KEY_MAINNET =
      "AG-FL4PYMZ1YX1LGAJCWP2R1ACYTYRCBY1GB";
    const resolved = resolveApiKey();
    expect(resolved.source).toBe("VITE_APTOS_API_KEY_MAINNET");
    expect(resolved.kind).toBe("client");
  });

  it("accepts VITE_APTOS_BUILD_API_KEY as a legacy alias", () => {
    clearKeyEnvs();
    process.env.VITE_APTOS_BUILD_API_KEY = "aptoslabs_from_vite_build";
    expect(resolveApiKey().source).toBe("VITE_APTOS_BUILD_API_KEY");
    expect(resolveApiKey().kind).toBe("server");
  });

  it("accepts GEOMI_API_KEY as an alias", () => {
    clearKeyEnvs();
    process.env.GEOMI_API_KEY = "aptoslabs_from_geomi";
    expect(resolveApiKey().source).toBe("GEOMI_API_KEY");
    expect(resolveApiKey().kind).toBe("server");
  });
});

describe("resolveApiConfig", () => {
  it("keeps Aptos Labs hosted endpoints when a Geomi/Aptos key is set", () => {
    clearKeyEnvs();
    process.env.APTOS_BUILD_API_KEY = "aptoslabs_server_key";
    const config = resolveApiConfig();
    expect(config.fullnodeUrl).toBeUndefined();
    expect(config.indexerUrl).toBe(
      "https://api.mainnet.aptoslabs.com/v1/graphql",
    );
    expect(config.apiKey).toBe("aptoslabs_server_key");
  });

  it("honors explicit fullnode and indexer overrides", () => {
    clearKeyEnvs();
    process.env.APTOS_FULLNODE_URL = "http://localhost:8081/v1";
    process.env.APTOS_INDEXER_URL = "http://localhost:8081/graphql";
    const config = resolveApiConfig();
    expect(config.fullnodeUrl).toBe("http://localhost:8081/v1");
    expect(config.indexerUrl).toBe("http://localhost:8081/graphql");
  });
});
