// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {AddressChip} from "~/components/AddressChip";

const FULL =
  "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8";

describe("AddressChip", () => {
  afterEach(cleanup);

  beforeAll(() => {
    Object.assign(navigator, {
      clipboard: {writeText: vi.fn().mockResolvedValue(undefined)},
    });
  });

  it("shows a truncated address and reveals the full value on hover", () => {
    render(<AddressChip address={FULL} />);
    expect(screen.getByText("0xdb009a...c7a1d8")).toBeInTheDocument();
    expect(screen.queryByText(FULL)).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId("address-chip"));
    expect(screen.getByText(FULL)).toBeInTheDocument();
  });

  it("copies the full address from the tooltip", async () => {
    render(<AddressChip address={FULL} />);
    fireEvent.mouseEnter(screen.getByTestId("address-chip"));
    fireEvent.click(screen.getByRole("button", {name: /copy/i}));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FULL);
  });
});
