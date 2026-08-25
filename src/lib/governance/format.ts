// src/lib/governance/format.ts

const OCTAS_PER_APT = 100_000_000n;

/**
 * Formats a raw octas bigint (1 APT = 10^8 octas) as a comma-grouped
 * APT string with up to `maxDecimals` fractional digits. Pure bigint
 * arithmetic throughout — never routes through JS `number`, so this is
 * safe for values far beyond Number.MAX_SAFE_INTEGER.
 */
export function formatOctasToApt(octas: bigint, maxDecimals = 2): string {
  const whole = octas / OCTAS_PER_APT;
  const remainder = octas % OCTAS_PER_APT;

  const wholeStr = whole.toLocaleString("en-US");

  if (maxDecimals <= 0 || remainder === 0n) {
    return wholeStr;
  }

  const fractionalDigits = remainder
    .toString()
    .padStart(8, "0")
    .slice(0, maxDecimals)
    .replace(/0+$/, "");

  return fractionalDigits.length > 0
    ? `${wholeStr}.${fractionalDigits}`
    : wholeStr;
}

/**
 * Truncates a hex address to `0x` + first `prefixLen` chars + "..." +
 * last `suffixLen` chars. Returns the input unchanged if it's already
 * shorter than the truncated form would be.
 */
export function truncateAddress(
  address: string,
  prefixLen = 6,
  suffixLen = 6,
): string {
  const hasPrefix = address.startsWith("0x");
  const body = hasPrefix ? address.slice(2) : address;
  const prefix = hasPrefix ? "0x" : "";

  if (body.length <= prefixLen + suffixLen) {
    return address;
  }

  return `${prefix}${body.slice(0, prefixLen)}...${body.slice(-suffixLen)}`;
}

/**
 * Formats a duration in seconds as a compact "2d 14h" / "3h 25m" / "45m"
 * string. Negative durations (e.g. an already-passed expiration) floor
 * to "0m" rather than displaying a confusing negative value.
 */
/**
 * Parses a user-typed APT amount (e.g. "1,234.56") into octas. Returns
 * null for anything that isn't a valid non-negative number with at
 * most 8 fractional digits (1 octa = 10^-8 APT) — callers should treat
 * null as "show a validation error", never fall back to a default.
 */
export function parseAptToOctas(input: string): bigint | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (cleaned.length === 0) return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;

  const [wholePart, fractionalPart = ""] = cleaned.split(".");
  if (fractionalPart.length > 8) return null;

  const paddedFractional = fractionalPart.padEnd(8, "0");
  return BigInt(wholePart) * OCTAS_PER_APT + BigInt(paddedFractional || "0");
}

/** Clamps a requested octas amount to the inclusive range [0, maxOctas]. */
export function clampVotingPowerOctas(
  requestedOctas: bigint,
  maxOctas: bigint,
): bigint {
  if (requestedOctas < 0n) return 0n;
  if (requestedOctas > maxOctas) return maxOctas;
  return requestedOctas;
}

/**
 * Local datetime for proposal creation / expiration / execution, matching
 * the original governance UI's "D MMM YYYY HH:mm:ss" shape. Zero and
 * missing values render as an em dash because those mean "not executed".
 */
export function formatTimestamp(secs: bigint | null | undefined): string {
  if (secs === null || secs === undefined || secs === 0n) return "—";
  const date = new Date(Number(secs) * 1000);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDurationCompact(totalSeconds: bigint): string {
  const seconds = totalSeconds < 0n ? 0n : totalSeconds;
  const days = seconds / 86400n;
  const hours = (seconds % 86400n) / 3600n;
  const minutes = (seconds % 3600n) / 60n;

  if (days > 0n) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0n) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/** Original governance remaining-time copy: always "Xd Xh Xm". */
export function formatDurationRemaining(totalSeconds: bigint): string {
  const seconds = totalSeconds < 0n ? 0n : totalSeconds;
  const days = seconds / 86400n;
  const hours = (seconds % 86400n) / 3600n;
  const minutes = (seconds % 3600n) / 60n;
  return `${days}d ${hours}h ${minutes}m`;
}
