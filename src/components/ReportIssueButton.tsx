import {useEffect, useState} from "react";
import {githubNewIssueUrl} from "~/lib/github-issue";

const DEFAULT_CLASS =
  "whitespace-nowrap rounded border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-row-hover)]";

export function ReportIssueButton({className}: {className?: string}) {
  const [href, setHref] = useState(() => githubNewIssueUrl());

  useEffect(() => {
    setHref(githubNewIssueUrl(window.location.href));
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className ? `${DEFAULT_CLASS} ${className}` : DEFAULT_CLASS}
    >
      Report Issue
    </a>
  );
}
