// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {PaginationBar} from "~/components/PaginationBar";

describe("PaginationBar", () => {
  afterEach(cleanup);

  it("renders numbered pages plus first/last for a multi-page voter list", () => {
    const onPageChange = vi.fn();
    render(
      <PaginationBar
        page={0}
        totalCount={41}
        pageSize={20}
        onPageChange={onPageChange}
      />,
    );

    expect(
      screen.getByRole("navigation", {name: /pagination/i}),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "1"})).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", {name: "3"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /first/i})).toBeDisabled();
    expect(screen.getByRole("button", {name: /previous/i})).toBeDisabled();

    screen.getByRole("button", {name: "2"}).click();
    expect(onPageChange).toHaveBeenCalledWith(1);

    screen.getByRole("button", {name: /last/i}).click();
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("hides itself when everything fits on one page", () => {
    const {container} = render(
      <PaginationBar
        page={0}
        totalCount={20}
        pageSize={20}
        onPageChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
