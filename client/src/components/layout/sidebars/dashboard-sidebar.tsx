import { useLocation } from 'wouter';
import { LayoutDashboard, Globe } from 'lucide-react';
import { SidebarSection, SidebarItem } from '@/components/layout/sidebar-primitives';

export function DashboardSidebar() {
  const [location] = useLocation();

  return (
    <SidebarSection label="Dashboard" icon={LayoutDashboard}>
      <SidebarItem
        icon={Globe}
        label="Threat Overview"
        href="/dashboard"
        active={location === '/dashboard'}
        testId="button-dashboard"
      />
    </SidebarSection>
  );
}
