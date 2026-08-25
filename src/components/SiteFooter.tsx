import foundationMark from "~/assets/svg/aptos-foundation_logo_mark.svg";
import discordIcon from "~/assets/svg/discord.svg";
import githubIcon from "~/assets/svg/github.svg";
import mediumIcon from "~/assets/svg/medium.svg";
import twitterIcon from "~/assets/svg/twitter.svg";
import {BrandMark} from "~/components/BrandMark";

const SOCIAL = [
  {
    title: "Github",
    href: "https://github.com/aptos-foundation/",
    src: githubIcon,
  },
  {
    title: "Discord",
    href: "https://discord.com/invite/aptosnetwork",
    src: discordIcon,
  },
  {
    title: "Twitter",
    href: "https://twitter.com/aptos_network",
    src: twitterIcon,
  },
  {title: "Medium", href: "https://aptoslabs.medium.com/", src: mediumIcon},
];

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-[var(--color-paper)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-8 md:flex-row">
        <a
          href="https://aptosfoundation.org/"
          target="_blank"
          rel="noreferrer noopener"
          title="Aptos Foundation"
          className="block"
        >
          <BrandMark
            src={foundationMark}
            label="Aptos Foundation"
            className="h-10 w-10"
          />
        </a>
        <p className="text-xs text-[var(--color-text-secondary)]">
          © {new Date().getFullYear()}{" "}
          <span className="whitespace-nowrap">Aptos Foundation</span>
        </p>
        <div className="flex items-center gap-5 md:ml-auto">
          {SOCIAL.map((link) => (
            <a
              key={link.title}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              title={link.title}
              className="text-[var(--color-text-primary)] hover:opacity-80"
            >
              <BrandMark
                src={link.src}
                label={link.title}
                className="h-[26px] w-[26px]"
              />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
