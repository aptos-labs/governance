import {
  getTotalPages,
  hasNextPage,
  hasPrevPage,
} from "~/lib/governance/pagination";

export function PaginationBar({
  page,
  totalCount,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = getTotalPages(totalCount, pageSize);
  if (totalPages <= 1) return null;

  const pages = visiblePages(page, totalPages);

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-center gap-1 text-sm"
      aria-label="Pagination"
    >
      <PageButton disabled={!hasPrevPage(page)} onClick={() => onPageChange(0)}>
        First
      </PageButton>
      <PageButton
        disabled={!hasPrevPage(page)}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </PageButton>

      {pages.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`e-${index}`}
            className="px-1 text-[var(--color-text-disabled)]"
          >
            …
          </span>
        ) : (
          <PageButton
            key={item}
            current={item === page}
            onClick={() => onPageChange(item)}
          >
            {item + 1}
          </PageButton>
        ),
      )}

      <PageButton
        disabled={!hasNextPage(page, totalCount, pageSize)}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </PageButton>
      <PageButton
        disabled={!hasNextPage(page, totalCount, pageSize)}
        onClick={() => onPageChange(totalPages - 1)}
      >
        Last
      </PageButton>
    </nav>
  );
}

function PageButton({
  current,
  disabled,
  onClick,
  children,
}: {
  current?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={`min-w-8 rounded border px-2 py-1 text-center disabled:border-[var(--color-border-light)] disabled:text-[var(--color-text-disabled)] ${
        current
          ? "border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-canvas)]"
          : "border-[var(--color-border)]"
      }`}
    >
      {children}
    </button>
  );
}

function visiblePages(
  page: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({length: totalPages}, (_, i) => i);
  }
  const items: Array<number | "ellipsis"> = [0];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages - 2, page + 1);
  if (start > 1) items.push("ellipsis");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < totalPages - 2) items.push("ellipsis");
  items.push(totalPages - 1);
  return items;
}
