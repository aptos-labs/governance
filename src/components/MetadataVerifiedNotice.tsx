import type {MetadataVerificationResult} from "~/lib/governance/types";
import {isNavigableHttpUrl} from "~/lib/governance/urls";

export function MetadataVerifiedNotice({
  result,
}: {
  result: MetadataVerificationResult;
}) {
  if (!result.verified) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-[var(--color-error)] bg-[var(--color-error)]/10 p-4"
      >
        <p className="font-semibold text-[var(--color-error)]">
          Metadata unverified
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          This proposal's off-chain metadata could not be verified against its
          on-chain hash and is not shown. Reason: {result.reason}
        </p>
      </div>
    );
  }

  const sourceUrl = isNavigableHttpUrl(result.metadata.source_code_url)
    ? result.metadata.source_code_url
    : null;
  const discussionUrl = isNavigableHttpUrl(result.metadata.discussion_url)
    ? result.metadata.discussion_url
    : null;

  return (
    <div>
      <p className="whitespace-pre-wrap text-[var(--color-text-primary)]">
        {result.metadata.description}
      </p>
      {(sourceUrl || discussionUrl) && (
        <div className="mt-4 flex gap-4 text-sm">
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[var(--color-info)] underline"
            >
              Source code
            </a>
          )}
          {discussionUrl && (
            <a
              href={discussionUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[var(--color-info)] underline"
            >
              Discussion
            </a>
          )}
        </div>
      )}
    </div>
  );
}
