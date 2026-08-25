// tests/unit/format.test.ts
import {describe, expect, it} from "vitest";
import {
  clampVotingPowerOctas,
  formatDurationCompact,
  formatOctasToApt,
  parseAptToOctas,
  truncateAddress,
} from "~/lib/governance/format";

describe("formatOctasToApt", () => {
  it("converts whole-APT octas with no fractional remainder", () => {
    expect(formatOctasToApt(100_000_000n)).toBe("1");
  });

  it("converts a large realistic voting-power figure", () => {
    // 369935249.51380141 APT worth of octas, truncated to 2 decimals
    expect(formatOctasToApt(36_993_524_951_380_141n, 2)).toBe("369,935,249.51");
  });

  it("handles zero", () => {
    expect(formatOctasToApt(0n)).toBe("0");
  });

  it("does not lose precision for values beyond Number.MAX_SAFE_INTEGER", () => {
    const hugeOctas = 90_071_992_547_409_910_000n; // far beyond 2^53
    expect(() => formatOctasToApt(hugeOctas)).not.toThrow();
    expect(formatOctasToApt(hugeOctas, 0)).toBe("900,719,925,474");
  });
});

describe("truncateAddress", () => {
  it("truncates a full 66-char address to prefix...suffix", () => {
    const addr =
      "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8";
    expect(truncateAddress(addr)).toBe("0xdb009a...c7a1d8");
  });

  it("returns short input unchanged", () => {
    expect(truncateAddress("0x1")).toBe("0x1");
  });

  it("respects custom prefix/suffix lengths", () => {
    const addr =
      "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8";
    expect(truncateAddress(addr, 8, 4)).toBe("0xdb009ab1...a1d8");
  });
});

describe("formatDurationCompact", () => {
  it("formats days and hours", () => {
    expect(formatDurationCompact(2n * 86400n + 14n * 3600n)).toBe("2d 14h");
  });

  it("formats hours and minutes when under a day", () => {
    expect(formatDurationCompact(3n * 3600n + 25n * 60n)).toBe("3h 25m");
  });

  it("formats minutes only when under an hour", () => {
    expect(formatDurationCompact(45n * 60n)).toBe("45m");
  });

  it("floors negative durations to 0m rather than showing a negative sign", () => {
    expect(formatDurationCompact(-100n)).toBe("0m");
  });
});

// --- Task 16: Voting power amount helpers ---

describe("parseAptToOctas", () => {
  it("parses a whole-number APT string", () => {
    expect(parseAptToOctas("5")).toBe(500_000_000n);
  });

  it("parses a fractional APT string", () => {
    expect(parseAptToOctas("1.5")).toBe(150_000_000n);
  });

  it("parses a comma-grouped APT string", () => {
    expect(parseAptToOctas("1,234.56")).toBe(123_456_000_000n);
  });

  it("returns null for empty input", () => {
    expect(parseAptToOctas("")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(parseAptToOctas("abc")).toBeNull();
  });

  it("returns null for negative input", () => {
    expect(parseAptToOctas("-5")).toBeNull();
  });

  it("returns null for more than 8 fractional digits (finer than 1 octa)", () => {
    expect(parseAptToOctas("1.123456789")).toBeNull();
  });
});

describe("clampVotingPowerOctas", () => {
  it("returns the requested amount when within range", () => {
    expect(clampVotingPowerOctas(50n, 100n)).toBe(50n);
  });

  it("clamps down to the max when the request exceeds it", () => {
    expect(clampVotingPowerOctas(150n, 100n)).toBe(100n);
  });

  it("clamps up to zero when the request is negative", () => {
    expect(clampVotingPowerOctas(-10n, 100n)).toBe(0n);
  });
});
