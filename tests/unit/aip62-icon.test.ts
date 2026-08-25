import {describe, expect, it} from "vitest";
import {aip62WalletIconSrc} from "~/lib/wallet/aip62-icon";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("aip62WalletIconSrc", () => {
  it("accepts AIP-62 data URIs", () => {
    expect(aip62WalletIconSrc(PNG)).toBe(PNG);
    expect(aip62WalletIconSrc("data:image/svg+xml;base64,PHN2Zy8+")).toBe(
      "data:image/svg+xml;base64,PHN2Zy8+",
    );
    expect(aip62WalletIconSrc("data:image/webp;base64,AAAA")).toBe(
      "data:image/webp;base64,AAAA",
    );
    expect(aip62WalletIconSrc("data:image/gif;base64,AAAA")).toBe(
      "data:image/gif;base64,AAAA",
    );
  });

  it("rejects missing, remote, or non-AIP-62 icons", () => {
    expect(aip62WalletIconSrc(undefined)).toBeUndefined();
    expect(aip62WalletIconSrc("")).toBeUndefined();
    expect(aip62WalletIconSrc("https://example.com/petra.png")).toBeUndefined();
    expect(aip62WalletIconSrc("data:text/plain;base64,AAAA")).toBeUndefined();
    expect(aip62WalletIconSrc("data:image/jpeg;base64,AAAA")).toBeUndefined();
  });
});
