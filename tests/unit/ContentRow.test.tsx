// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {ContentRow} from "~/components/ContentRow";

describe("ContentRow", () => {
  afterEach(cleanup);

  it("renders a discussion link only when the URL is navigable", () => {
    render(
      <ContentRow
        title="Discussion"
        href="https://github.com/aptos-foundation/AIPs"
      >
        LINK TO DISCUSSION
      </ContentRow>,
    );
    expect(screen.getByRole("link", {name: /discussion/i})).toHaveAttribute(
      "href",
      "https://github.com/aptos-foundation/AIPs",
    );
  });

  it("does not render a link for empty, hash-only, or placeholder URLs", () => {
    const {rerender} = render(
      <ContentRow title="Discussion" href="">
        LINK TO DISCUSSION
      </ContentRow>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    rerender(
      <ContentRow title="Discussion" href="#">
        LINK TO DISCUSSION
      </ContentRow>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    rerender(
      <ContentRow title="Discussion" href="n/a">
        LINK TO DISCUSSION
      </ContentRow>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
