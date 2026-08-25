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
    <img
      src={src}
      alt={decorative ? "" : label}
      aria-hidden={decorative || undefined}
      className={`brand-mark ${className ?? ""}`}
    />
  );
}
