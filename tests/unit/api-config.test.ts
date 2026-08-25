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

describe("resolveApiKey on the server", () => {
  it("uses the backend key and ignores the frontend key", () => {
    clearKeyEnvs();
    process.env.APTOS_BUILD_API_KEY = "aptoslabs_server_key";
    process.env.VITE_APTOS_API_KEY = "AG-CLIENTKEY";
    const resolved = resolveApiKey();
    expect(resolved.source).toBe("APTOS_BUILD_API_KEY");
    expect(resolved.key).toBe("aptoslabs_server_key");
    expect(resolved.kind).toBe("server");
  });

  it("does not use a VITE_ frontend key for SSR", () => {
    clearKeyEnvs();
    process.env.VITE_APTOS_API_KEY_MAINNET =
      "AG-FL4PYMZ1YX1LGAJCWP2R1ACYTYRCBY1GB";
    process.env.VITE_APTOS_API_KEY = "AG-CLIENTKEY";
    const resolved = resolveApiKey();
    expect(resolved.kind).toBe("none");
    expect(resolved.key).toBeUndefined();
  });

  it("accepts GEOMI_API_KEY as a backend alias", () => {
    clearKeyEnvs();
    process.env.GEOMI_API_KEY = "aptoslabs_from_geomi";
    expect(resolveApiKey().source).toBe("GEOMI_API_KEY");
    expect(resolveApiKey().kind).toBe("server");
  });
});

describe("resolveApiConfig on the server", () => {
  it("sends the backend key on Aptos Labs hosted endpoints", () => {
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

  it("does not send a frontend client key from Node SSR", () => {
    clearKeyEnvs();
    process.env.VITE_APTOS_API_KEY = "AG-CLIENTKEYFROMSSR";
    const config = resolveApiConfig();
    expect(config.apiKey).toBeUndefined();
  });

  it("does not send a client key even when it is stored as the backend env name", () => {
    clearKeyEnvs();
    process.env.APTOS_BUILD_API_KEY = "AG-WRONGTYPEFORBACKEND";
    const config = resolveApiConfig();
    expect(config.kind).toBe("client");
    expect(config.apiKey).toBeUndefined();
  });

  it("skips a wrong-kind backend env and uses a later server key", () => {
    clearKeyEnvs();
    process.env.APTOS_BUILD_API_KEY = "AG-WRONGTYPEFORBACKEND";
    process.env.GEOMI_API_KEY = "aptoslabs_from_geomi";
    const resolved = resolveApiKey();
    expect(resolved.source).toBe("GEOMI_API_KEY");
    expect(resolved.kind).toBe("server");
    expect(resolveApiConfig().apiKey).toBe("aptoslabs_from_geomi");
  });
});
