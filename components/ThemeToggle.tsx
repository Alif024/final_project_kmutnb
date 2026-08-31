'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Toggles the `dark` class on <html>. Tailwind's `dark:` variant is configured
 * (see app/globals.css) to key off this class rather than the OS color-scheme,
 * so no theme context/provider is needed — every `dark:` utility across the
 * app reacts to this one class automatically. Which icon is visible is driven
 * by the same `dark:` variant (not React state), so there's nothing to sync
 * on mount and no risk of a hydration mismatch.
 */
export default function ThemeToggle() {
  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // localStorage unavailable (private browsing, etc.) — theme just won't persist
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-slate-900/10 dark:hover:border-white/10"
      title="สลับ Light / Dark Mode"
    >
      <Sun className="w-4 h-4 hidden dark:block" />
      <Moon className="w-4 h-4 block dark:hidden" />
    </button>
  );
}
