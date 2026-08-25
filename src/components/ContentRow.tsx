import {isNavigableHttpUrl} from "~/lib/governance/urls";

export function ContentRow({
  title,
  children,
  href,
}: {
  title: string;
  children: React.ReactNode;
  href?: string | null;
}) {
  const link = href && isNavigableHttpUrl(href) ? href : null;
  return (
    <div className="space-y-2 border-b border-dotted border-[var(--color-border)] pb-8 last:border-b-0 last:pb-0">
      <h3 className="text-lg font-light">{title}</h3>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[var(--color-info)] underline"
        >
          {children}
        </a>
      ) : (
        <div className="break-words text-[var(--color-text-primary)]">
          {children}
        </div>
      )}
    </div>
  );
}
