import {
  isRateLimitError,
  RATE_LIMIT_MESSAGE,
} from "~/lib/governance/rate-limit";

export function errorAlertCopy(error: unknown): {title: string; body: string} {
  if (isRateLimitError(error)) {
    return {title: "Rate Limited", body: RATE_LIMIT_MESSAGE};
  }
  const body =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);
  return {title: "Error", body};
}

export function ApiErrorAlert({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const {title, body} = errorAlertCopy(error);
  return (
    <div
      role="alert"
      className="mb-4 rounded border border-[var(--color-error)] p-4 text-[var(--color-error)]"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 break-words">{body}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded border border-[var(--color-error)] px-3 py-1 text-sm"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
