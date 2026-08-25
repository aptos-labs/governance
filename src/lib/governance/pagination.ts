export function getTotalPages(totalCount: number, pageSize: number): number {
  if (totalCount <= 0 || pageSize <= 0) return 0;
  return Math.ceil(totalCount / pageSize);
}

export function hasPrevPage(page: number): boolean {
  return page > 0;
}

export function hasNextPage(
  page: number,
  totalCount: number,
  pageSize: number,
): boolean {
  return (page + 1) * pageSize < totalCount;
}

export function pageOffset(page: number, pageSize: number): number {
  return Math.max(0, page) * pageSize;
}
