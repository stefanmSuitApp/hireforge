'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

/**
 * Runs in <head> before paint, so a dark page never flashes light. Keep it
 * in sync with `applyTheme`.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(choice: ThemeChoice) {
  const dark =
    choice === 'dark' ||
    (choice === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

/** Cycles system → light → dark; "system" follows the OS setting live. */
export function ThemeToggle() {
  const t = useTranslations('Nav');
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    setChoice(readChoice());
  }, []);

  useEffect(() => {
    if (choice !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [choice]);

  function next() {
    const value = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length] ?? 'system';
    setChoice(value);
    try {
      if (value === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
    applyTheme(value);
  }

  const Icon = choice === 'dark' ? Moon : choice === 'light' ? Sun : Monitor;
  const label =
    choice === 'dark'
      ? t('themeDark')
      : choice === 'light'
        ? t('themeLight')
        : t('themeSystem');

  return (
    <button
      type="button"
      onClick={next}
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-9"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
