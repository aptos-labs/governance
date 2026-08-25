import {useEffect, useState} from "react";
import iconDark from "~/assets/svg/icon_dark.svg";
import iconLight from "~/assets/svg/icon_light.svg";
import {BrandMark} from "~/components/BrandMark";

type Theme = "light" | "dark";

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem("aptos-gov-theme");
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      setTheme(stored);
      document.documentElement.dataset.theme = stored;
      return;
    }
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("aptos-gov-theme", next);
    } catch {
      /* ignore quota / private mode */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      className="flex h-[30px] w-[30px] items-center justify-center text-[var(--color-text-primary)] hover:opacity-80"
    >
      <BrandMark
        src={theme === "light" ? iconLight : iconDark}
        label=""
        className="h-5 w-5"
      />
    </button>
  );
}
