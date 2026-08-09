import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Search,
  Bookmark,
  Menu,
  X,
  LogOut,
  User,
  LayoutDashboard,
  Rss,
  ShieldAlert,
  Users,
  Settings,
  Shield,
  PenTool,
  Newspaper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { getAuthenticatedUser } from '@/lib/auth';
import { useLoginPopup } from '@/contexts/login-popup-context';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { CommandPalette } from '@/components/command-palette';
import logoImage from '@/assets/logo/android-chrome-512x512.png';
import type { Bookmark as BookmarkType } from '@shared/schema';

export type AppTab = 'dashboard' | 'feeds' | 'vulnerabilities' | 'actors';

export const APP_TABS: { id: AppTab; label: string; href: string; icon: typeof Rss }[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'feeds', label: 'Threat Feeds', href: '/threatfeed', icon: Rss },
  { id: 'vulnerabilities', label: 'Vulnerabilities', href: '/vulnerabilities', icon: ShieldAlert },
  { id: 'actors', label: 'Threat Actors', href: '/threat-actors', icon: Users },
];

interface TopNavProps {
  activeTab: AppTab;
  onSidebarToggle: () => void;
  isSidebarOpen: boolean;
}

export function TopNav({ activeTab, onSidebarToggle, isSidebarOpen }: TopNavProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { showLoginPopup } = useLoginPopup();
  const { toast } = useToast();

  const user = getAuthenticatedUser();

  const { data: bookmarks = [] } = useQuery<BookmarkType[]>({
    queryKey: ['/api/bookmarks'],
    enabled: !!user && !!user.token && !user.isGuest,
    staleTime: 1000 * 60 * 2,
  });
  const bookmarkCount = bookmarks.length;

  useEffect(() => {
    if (!user?.token || user.isGuest) return;
    let cancelled = false;
    fetch('/api/user-preferences', {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((prefs) => {
        if (!cancelled && prefs?.displayName) setDisplayName(prefs.displayName);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  const handleGoogleLogin = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    window.location.href = isProduction
      ? 'https://www.whatcyber.com/api/auth?action=google'
      : 'http://localhost:5001/api/auth?action=google';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth?action=logout');
    } catch {
      // Local cleanup below still applies if the API call fails
    }
    localStorage.removeItem('cyberfeed_user');
    window.location.reload();
  };

  const handleBookmarksClick = () => {
    if (user?.isGuest) {
      toast({
        title: 'Authentication Required',
        description: 'Login to use the bookmark feature and personalize your experience.',
      });
      return;
    }
    if (!user) {
      showLoginPopup();
      return;
    }
    setLocation('/threatfeed?view=bookmarks');
  };

  const tabLink = (tab: (typeof APP_TABS)[number], mobile = false) => {
    const isActive = tab.id === activeTab;
    const TabIcon = tab.icon;
    return (
      <Link
        key={tab.id}
        href={tab.href}
        aria-current={isActive ? 'page' : undefined}
        data-testid={`tab-${tab.id}`}
        className={`relative flex items-center gap-2 whitespace-nowrap px-3 text-sm font-medium transition-colors ${
          mobile ? 'h-11 shrink-0' : 'h-16'
        } ${isActive ? 'text-slate-100' : 'text-slate-400 hover:text-slate-100'}`}
      >
        <TabIcon className={`h-4 w-4 ${isActive ? 'text-whatcyber-teal' : ''}`} aria-hidden="true" />
        {tab.label}
        {tab.id === 'feeds' && <span className="live-dot" aria-hidden="true" />}
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-whatcyber-teal-bright shadow-[0_0_8px_rgba(0,212,170,0.6)]"
          />
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden p-2 text-slate-400 hover:text-slate-100"
          onClick={onSidebarToggle}
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          data-testid="button-mobile-menu"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Logo */}
        <Link href="/threatfeed" className="flex shrink-0 items-center gap-2.5" data-testid="logo-link">
          <img src={logoImage} alt="" className="h-9 w-9 rounded-lg logo-glow" />
          <span className="hidden flex-col sm:flex">
            <span className="font-display text-lg font-bold leading-tight text-slate-100">WhatCyber</span>
            <span className="-mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-whatcyber-teal">
              ThreatFeed
            </span>
          </span>
        </Link>

        {/* Desktop tabs */}
        <nav className="ml-6 hidden h-16 items-center lg:flex" aria-label="Primary">
          {APP_TABS.map((tab) => tabLink(tab))}
        </nav>

        <div className="flex-1" />

        {/* Search */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden h-9 w-64 cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 text-sm text-slate-400 transition-colors hover:border-whatcyber-teal/50 hover:text-slate-300 md:flex xl:w-80"
          data-testid="button-search"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 truncate text-left">Search articles, CVEs, actors…</span>
          <kbd className="pointer-events-none flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="p-2 text-slate-400 hover:text-slate-100 md:hidden"
          onClick={() => setIsCommandPaletteOpen(true)}
          aria-label="Search"
          data-testid="button-mobile-search"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Theme switch */}
        <ThemeToggle />

        {/* Bookmarks */}
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 text-slate-400 hover:text-slate-100"
          onClick={handleBookmarksClick}
          aria-label={`Bookmarks${bookmarkCount ? ` (${bookmarkCount})` : ''}`}
          data-testid="button-bookmarks"
        >
          <Bookmark className="h-5 w-5" />
          {bookmarkCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-whatcyber-teal-bright font-mono text-[10px] font-bold text-whatcyber-darker"
              data-testid="text-bookmark-count"
            >
              {bookmarkCount > 99 ? '99+' : bookmarkCount}
            </span>
          )}
        </Button>

        {/* User menu */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 flex cursor-pointer items-center gap-2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label="Account menu"
                data-testid="button-user-menu"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={displayName || user.name}
                    className="h-8 w-8 rounded-full border-2 border-border"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-secondary">
                    <User className="h-4 w-4 text-slate-300" />
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">
                {displayName || user.name}
                {user.isGuest && ' (Guest)'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.isAdmin && (
                <DropdownMenuItem onClick={() => setLocation('/admin')}>
                  <Shield className="mr-2 h-4 w-4" /> Admin Dashboard
                </DropdownMenuItem>
              )}
              {user.email === 'achuthchandra07@gmail.com' && (
                <>
                  <DropdownMenuItem asChild>
                    <a href="https://whatcyber.sanity.studio" target="_blank" rel="noopener noreferrer">
                      <PenTool className="mr-2 h-4 w-4" /> Manage Blog
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/blog')}>
                    <Newspaper className="mr-2 h-4 w-4" /> View Blog
                  </DropdownMenuItem>
                </>
              )}
              {!user.isGuest && (
                <DropdownMenuItem onClick={() => setLocation('/settings')}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {user.isGuest ? (
                <DropdownMenuItem
                  onClick={() => {
                    localStorage.removeItem('guestToken');
                    showLoginPopup();
                    window.location.reload();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Login to full account
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-slate-400 hover:text-slate-100"
            onClick={handleGoogleLogin}
            data-testid="button-google-login"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="ml-1.5 hidden text-sm md:inline">Sign In</span>
          </Button>
        )}
      </div>

      {/* Mobile tab bar */}
      <nav
        className="flex items-center overflow-x-auto border-t border-border no-scrollbar lg:hidden"
        aria-label="Primary"
      >
        {APP_TABS.map((tab) => tabLink(tab, true))}
      </nav>

      <CommandPalette open={isCommandPaletteOpen} setOpen={setIsCommandPaletteOpen} />
    </header>
  );
}
