export function HeroDivider() {
  return (
    <div className="mb-8 mt-2 flex items-center text-[var(--color-border)]">
      <div className="mt-[14px] flex-1 border-y border-current" />
      <svg width="52" height="34" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          d="M0,14.5h0.6h17.6c7.1,0,14-2.8,19-8c3.6-3.7,8.3-6,13.4-6H52"
        />
        <path
          fill="none"
          stroke="currentColor"
          d="M52,19.5h-0.6H33.8c-7.1,0-14,2.8-19,8c-3.6,3.7-8.3,6-13.4,6H0"
        />
      </svg>
      <div className="mb-[14px] flex-1 border-y border-current" />
    </div>
  );
}
