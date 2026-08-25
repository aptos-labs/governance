export function BrandMark({
  src,
  label,
  className,
}: {
  src: string;
  label: string;
  className?: string;
}) {
  const decorative = label.length === 0;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={className}
      style={{
        display: "block",
        backgroundColor: "currentColor",
        WebkitMask: `url(${src}) center / contain no-repeat`,
        mask: `url(${src}) center / contain no-repeat`,
      }}
    />
  );
}
