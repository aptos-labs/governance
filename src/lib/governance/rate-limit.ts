export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return /429|rate limit/i.test(String(error));
  }
  const record = error as {
    status?: unknown;
    statusCode?: unknown;
    message?: unknown;
  };
  if (record.status === 429 || record.statusCode === 429) return true;
  const message = typeof record.message === "string" ? record.message : "";
  return /429|rate limit/i.test(message);
}

export const RATE_LIMIT_MESSAGE =
  "You've been rate limited by the API. Please try again later.";
