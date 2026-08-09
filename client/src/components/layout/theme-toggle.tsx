import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

/**
 * Light/dark mode switch. Rendered as a real switch (track + thumb) so the
 * current mode is visible at a glance in both states.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full border border-border bg-secondary transition-colors hover:border-whatcyber-teal/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      data-testid="button-theme-toggle"
    >
      <Sun className="absolute left-1.5 h-3.5 w-3.5 text-yellow-500/80" aria-hidden="true" />
      <Moon className="absolute right-1.5 h-3.5 w-3.5 text-whatcyber-teal" aria-hidden="true" />
      <span
        aria-hidden="true"
        className={`pointer-events-none relative z-10 inline-block h-5 w-5 transform rounded-full bg-card shadow-md ring-1 ring-border transition-transform duration-200 ${
          isDark ? 'translate-x-[27px]' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
