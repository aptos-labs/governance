// tests/unit/pagination.test.tsx
import { describe, it, expect } from "vitest";

function getTotalPages(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

function hasPrevPage(page: number): boolean {
  return page > 0;
}

function hasNextPage(page: number, totalCount: number, pageSize: number): boolean {
  return (page + 1) * pageSize < totalCount;
}

describe("getTotalPages", () => {
  it("returns 1 when totalCount <= pageSize", () => {
    expect(getTotalPages(15, 20)).toBe(1);
    expect(getTotalPages(20, 20)).toBe(1);
  });
  it("returns multiple pages for larger totalCount", () => {
    expect(getTotalPages(50, 20)).toBe(3);
    expect(getTotalPages(1, 20)).toBe(1);
  });
});

describe("hasPrevPage", () => {
  it("is true only for page > 0", () => {
    expect(hasPrevPage(0)).toBe(false);
    expect(hasPrevPage(1)).toBe(true);
  });
});

describe("hasNextPage", () => {
  it("is true only when more items exist", () => {
    expect(hasNextPage(0, 50, 20)).toBe(true);
    expect(hasNextPage(2, 50, 20)).toBe(false);
    expect(hasNextPage(0, 5, 20)).toBe(false);
  });
});