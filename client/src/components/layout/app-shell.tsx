import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopNav, type AppTab } from '@/components/layout/top-nav';
import { SidebarCloseContext, SidebarSupportSection } from '@/components/layout/sidebar-primitives';
import logoImage from '@/assets/logo/android-chrome-512x512.png';

interface AppShellProps {
  activeTab: AppTab;
  /** Tab-specific sidebar sections; the Support & Settings group is appended automatically. */
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ activeTab, sidebar, children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  const sidebarContent = (
    <SidebarCloseContext.Provider value={closeSidebar}>
      <div className="flex flex-col gap-6 p-4">
        {sidebar}
        <SidebarSupportSection />
      </div>
    </SidebarCloseContext.Provider>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopNav
        activeTab={activeTab}
        onSidebarToggle={() => setIsSidebarOpen((open) => !open)}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex w-full flex-1 min-h-0">
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Mobile drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-[120] w-[300px] max-w-[85vw] transform overflow-y-auto no-scrollbar border-r border-border bg-sidebar transition-transform duration-300 ease-in-out lg:hidden ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Sidebar"
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <span className="flex items-center gap-2">
              <img src={logoImage} alt="" className="h-7 w-7 rounded-md" />
              <span className="font-display text-sm font-bold text-slate-100">WhatCyber</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-slate-400 hover:text-slate-100"
              onClick={closeSidebar}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {sidebarContent}
        </aside>

        {/* Desktop sidebar */}
        <aside
          className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[280px] shrink-0 overflow-y-auto no-scrollbar border-r border-border bg-sidebar lg:block"
          aria-label="Sidebar"
        >
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
