import {HeroDivider} from "~/components/HeroDivider";
import {WalletConnectButton} from "~/components/WalletConnectButton";

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <div className="grid items-center gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          {subtitle ? (
            <>
              <p className="mb-1 text-base font-normal uppercase leading-tight tracking-wide text-[var(--color-primary)]">
                {subtitle}
              </p>
              <h1 className="break-words text-4xl font-light tracking-tight sm:text-6xl lg:text-[6rem]">
                {title}
              </h1>
            </>
          ) : (
            <h2 className="text-3xl font-light">{title}</h2>
          )}
        </div>
        <div className="hidden justify-end sm:flex">
          <WalletConnectButton />
        </div>
      </div>
      <HeroDivider />
    </>
  );
}
