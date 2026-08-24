// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {WalletConnectButton} from "~/components/WalletConnectButton";

vi.mock("@aptos-labs/wallet-adapter-react", async () => {
  const actual = await vi.importActual("@aptos-labs/wallet-adapter-react");
  return {...actual, useWallet: vi.fn()};
});

const mockedUseWallet = vi.mocked(useWallet);

describe("WalletConnectButton", () => {
  afterEach(cleanup);

  it("shows a Connect Wallet button when disconnected", () => {
    mockedUseWallet.mockReturnValue({
      connected: false,
      account: null,
      wallets: [
        {name: "Petra", readyState: "Installed"},
        {name: "Nightly", readyState: "Installed"},
      ],
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as never);

    render(<WalletConnectButton />);
    expect(
      screen.getByRole("button", {name: /connect wallet/i}),
    ).toBeInTheDocument();
  });

  it("lists Petra and Petra Web before other wallets when the picker is open", () => {
    mockedUseWallet.mockReturnValue({
      connected: false,
      account: null,
      wallets: [
        {name: "Nightly", readyState: "Installed"},
        {name: "Petra Web", readyState: "Installed"},
        {name: "Backpack", readyState: "Installed"},
        {name: "Petra", readyState: "Installed"},
      ],
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as never);

    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole("button", {name: /connect wallet/i}));

    const items = screen.getAllByRole("menuitem").map((el) => el.textContent);
    expect(items[0]).toMatch(/Petra$/);
    expect(items[1]).toMatch(/Petra Web/);
  });

  it("calls connect with the clicked wallet's name", () => {
    const connect = vi.fn();
    mockedUseWallet.mockReturnValue({
      connected: false,
      account: null,
      wallets: [{name: "Petra", readyState: "Installed"}],
      connect,
      disconnect: vi.fn(),
    } as never);

    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole("button", {name: /connect wallet/i}));
    fireEvent.click(screen.getByRole("menuitem", {name: "Petra"}));
    expect(connect).toHaveBeenCalledWith("Petra");
  });

  it("shows the truncated address and a disconnect control when connected", () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {
        address:
          "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8",
      },
      wallets: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as never);

    render(<WalletConnectButton />);
    expect(screen.getByText("0xdb009a...c7a1d8")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {name: /disconnect/i}),
    ).toBeInTheDocument();
  });
});
