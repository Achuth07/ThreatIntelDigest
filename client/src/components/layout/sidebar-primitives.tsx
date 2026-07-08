import { createContext, useContext, type ReactNode, type ComponentType } from 'react';
import { useLocation } from 'wouter';
import { Bug, Settings, Home, BookOpen, LifeBuoy } from 'lucide-react';

/** Lets sidebar items close the mobile drawer after navigating. */
export const SidebarCloseContext = createContext<() => void>(() => {});
export const useSidebarClose = () => useContext(SidebarCloseContext);

interface SidebarSectionProps {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  children: ReactNode;
}

export function SidebarSection({ label, icon: Icon, action, children }: SidebarSectionProps) {
  return (
    <div>
      <div className="mb-2 flex h-7 items-center justify-between px-3">
        <span className="eyebrow flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-whatcyber-teal" aria-hidden="true" />}
          {label}
        </span>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

interface SidebarItemProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: ReactNode;
  /** Route to navigate to. Ignored when onClick is provided. */
  href?: string;
  onClick?: () => void;
  /** Extra element shown on hover at the row end (e.g. remove button). */
  trailing?: ReactNode;
  /** Replaces the icon slot entirely (e.g. favicons). */
  leading?: ReactNode;
  disabled?: boolean;
  testId?: string;
}

export function SidebarItem({
  icon: Icon,
  label,
  active = false,
  badge,
  href,
  onClick,
  trailing,
  leading,
  disabled = false,
  testId,
}: SidebarItemProps) {
  const [, setLocation] = useLocation();
  const closeSidebar = useSidebarClose();

  const handleClick = () => {
    if (disabled) return;
    if (onClick) {
      onClick();
    } else if (href) {
      setLocation(href);
    }
    closeSidebar();
  };

  return (
    <div
      className={`group relative flex w-full items-center rounded-lg transition-colors ${
        active ? 'bg-accent' : 'hover:bg-secondary'
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-current={active ? 'page' : undefined}
        data-testid={testId}
        className={`flex min-h-[40px] w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          active
            ? 'text-accent-foreground'
            : 'text-slate-300 group-hover:text-slate-100'
        }`}
      >
        {leading ??
          (Icon && (
            <Icon
              className={`h-4 w-4 shrink-0 ${active ? 'text-whatcyber-teal' : 'text-slate-400 group-hover:text-whatcyber-teal'} transition-colors`}
            />
          ))}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge}
      </button>
      {trailing}
    </div>
  );
}

/** Small count/status pill used at the end of sidebar rows. */
export function SidebarBadge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'accent' }) {
  return (
    <span
      className={`ml-auto shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
        tone === 'accent'
          ? 'bg-whatcyber-teal text-whatcyber-dark dark:text-whatcyber-darker'
          : 'bg-secondary text-slate-400'
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Shared footer group rendered at the bottom of every sidebar:
 * Support & Settings + Ko-fi.
 */
export function SidebarSupportSection() {
  const [location] = useLocation();

  return (
    <div className="border-t border-border pt-5">
      <SidebarSection label="Support & Settings" icon={LifeBuoy}>
        <SidebarItem icon={Bug} label="Report Bugs/Feedback" href="/report-bugs" active={location === '/report-bugs'} testId="button-report-bugs" />
        <SidebarItem icon={Settings} label="Settings" href="/settings" active={location === '/settings'} testId="button-settings" />
        <SidebarItem icon={Home} label="Visit Homepage" href="/" testId="button-homepage" />
        <SidebarItem icon={BookOpen} label="Blog" href="/blog" active={location.startsWith('/blog')} testId="button-blog" />
      </SidebarSection>
      <a
        href="https://ko-fi.com/whatcyber"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center rounded-lg border border-whatcyber-teal/30 bg-secondary p-3 transition-all hover:border-whatcyber-teal/80 hover:shadow-md group"
      >
        <img
          src="https://storage.ko-fi.com/cdn/cup-border.png"
          alt=""
          aria-hidden="true"
          className="mr-2 h-5 w-5 drop-shadow-sm transition-transform group-hover:scale-110"
        />
        <span className="text-sm font-semibold text-whatcyber-teal">Support WhatCyber</span>
      </a>
    </div>
  );
}
