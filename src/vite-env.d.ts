/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_APTOS_API_KEY?: string;
  readonly VITE_APTOS_API_KEY_MAINNET?: string;
  readonly VITE_GEOMI_API_KEY?: string;
  readonly VITE_GEOMI_FULLNODE_URL?: string;
  readonly VITE_GEOMI_INDEXER_URL?: string;
}
