"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "scholar-theme";
const THEME_EVENT_NAME = "scholar-theme-change";

type ThemeMode = "light" | "dark";

type ThemeToggleProps = {
  variant?: "default" | "rail";
};

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_EVENT_NAME));
}

function readThemeFromDom(): ThemeMode {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT_NAME, onStoreChange);
  return () => window.removeEventListener(THEME_EVENT_NAME, onStoreChange);
}

function getSnapshot() {
  return readThemeFromDom();
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export function ThemeToggle({ variant = "default" }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";
  const title = isDark ? "切换到浅色模式" : "切换到深色模式";

  function toggleTheme() {
    const nextTheme: ThemeMode = isDark ? "light" : "dark";
    applyTheme(nextTheme);
  }

  if (variant === "rail") {
    return (
      <button
        type="button"
        className="site-side-rail__tool"
        onClick={toggleTheme}
        aria-label={title}
        aria-pressed={isDark}
        title={title}
      >
        <span className="site-side-rail__tool-icon" aria-hidden="true">
          {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </span>
        <span className="site-side-rail__tool-label">{isDark ? "浅色" : "深色"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={title}
      aria-pressed={isDark}
      title={title}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </span>
      <span className="hidden sm:inline">{isDark ? "浅色" : "深色"}</span>
    </button>
  );
}
