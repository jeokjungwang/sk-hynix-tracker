"use client";

import { useTheme } from "@/hooks/useTheme";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 7 7 0 1 0 20.5 14.3z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { theme, toggle, ready } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready}
      aria-label={theme === "dark" ? "화이트 모드로 전환" : "다크 모드로 전환"}
      title={theme === "dark" ? "화이트 모드" : "다크 모드"}
      className="theme-toggle fixed top-3 right-3 z-50 flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur transition hover:scale-105 disabled:opacity-60"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
