import type {MetadataVerificationResult} from "~/lib/governance/types";

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

  return (
    <div>
      {/* Plain text content only — React escapes this, never parsed as HTML. */}
      <p className="whitespace-pre-wrap text-[var(--color-text-primary)]">
        {result.metadata.description}
      </p>
      <div className="mt-4 flex gap-4 text-sm">
        <a
          href={result.metadata.source_code_url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[var(--color-info)] underline"
        >
          Source code
        </a>
        <a
          href={result.metadata.discussion_url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[var(--color-info)] underline"
        >
          Discussion
        </a>
      </div>
    </div>
  );
}
