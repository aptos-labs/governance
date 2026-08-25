// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {MetadataVerifiedNotice} from "~/components/MetadataVerifiedNotice";

describe("MetadataVerifiedNotice", () => {
  afterEach(cleanup);
  it("shows nothing alarming and renders the verified description when verified", () => {
    render(
      <MetadataVerifiedNotice
        result={{
          verified: true,
          metadata: {
            title: "T",
            description: "A verified description.",
            source_code_url: "https://example.com/src",
            discussion_url: "https://example.com/discuss",
          },
        }}
      />,
    );
    expect(screen.getByText("A verified description.")).toBeInTheDocument();
    expect(screen.getByRole("link", {name: /source/i})).toHaveAttribute(
      "href",
      "https://example.com/src",
    );
    expect(screen.getByRole("link", {name: /discussion/i})).toHaveAttribute(
      "href",
      "https://example.com/discuss",
    );
    expect(screen.queryByText(/unverified/i)).not.toBeInTheDocument();
  });

  it("hides the discussion link when the URL does not go anywhere", () => {
    render(
      <MetadataVerifiedNotice
        result={{
          verified: true,
          metadata: {
            title: "T",
            description: "A verified description.",
            source_code_url: "https://example.com/src",
            discussion_url: "",
          },
        }}
      />,
    );
    expect(screen.getByRole("link", {name: /source/i})).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {name: /discussion/i}),
    ).not.toBeInTheDocument();
  });

  it("hides a hash-only or placeholder discussion URL", () => {
    render(
      <MetadataVerifiedNotice
        result={{
          verified: true,
          metadata: {
            title: "T",
            description: "A verified description.",
            source_code_url: "n/a",
            discussion_url: "#",
          },
        }}
      />,
    );
    expect(
      screen.queryByRole("link", {name: /source/i}),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {name: /discussion/i}),
    ).not.toBeInTheDocument();
  });

  it("shows an explicit warning and the failure reason when unverified", () => {
    render(
      <MetadataVerifiedNotice
        result={{verified: false, reason: "metadata hash mismatch: ..."}}
      />,
    );
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();
    expect(screen.getByText(/hash mismatch/i)).toBeInTheDocument();
  });

  it("never renders raw HTML from the description — only text", () => {
    render(
      <MetadataVerifiedNotice
        result={{
          verified: true,
          metadata: {
            title: "T",
            description: "<img src=x onerror=alert(1)>",
            source_code_url: "https://example.com/src",
            discussion_url: "https://example.com/discuss",
          },
        }}
      />,
    );
    // The literal tag text should appear as text content, not be parsed as an element.
    expect(
      screen.getByText("<img src=x onerror=alert(1)>"),
    ).toBeInTheDocument();
    expect(document.querySelector("img")).not.toBeInTheDocument();
  });
});
