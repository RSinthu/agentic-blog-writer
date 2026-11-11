"use client";

import { useEffect } from "react";

const storageKey = "galley-theme";

function savedTheme() {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function ThemeToggle() {
  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      document.documentElement.dataset.theme = savedTheme() ?? (system.matches ? "dark" : "light");
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) sync();
    };
    sync();
    system.addEventListener("change", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      system.removeEventListener("change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggleTheme() {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme}>
      <span className="theme-to-dark"><span aria-hidden="true">&#9790;</span> Dark mode</span>
      <span className="theme-to-light"><span aria-hidden="true">&#9728;</span> Light mode</span>
    </button>
  );
}
