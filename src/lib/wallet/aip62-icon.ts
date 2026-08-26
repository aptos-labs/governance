/**
 * AIP-62 wallet icons are data URIs with a fixed media type and
 * base64 payload. See aptos-foundation/AIPs aip-62 (AptosWallet.icon)
 * and @aptos-labs/wallet-standard AptosWallet.
 */
const AIP62_ICON =
  /^data:image\/(?:svg\+xml|webp|png|gif);base64,[A-Za-z0-9+/]+=*$/;

export function aip62WalletIconSrc(icon: unknown): string | undefined {
  if (typeof icon !== "string" || !AIP62_ICON.test(icon)) return undefined;
  return icon;
}
