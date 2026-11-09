import { useLocation } from 'wouter';
import { ShieldAlert, Flame, Bug } from 'lucide-react';
import { SidebarSection, SidebarItem, SidebarBadge } from '@/components/layout/sidebar-primitives';

export function VulnsSidebar() {
  const [location] = useLocation();

  return (
    <>
      <SidebarSection label="Vulnerabilities" icon={ShieldAlert}>
        <SidebarItem
          icon={Bug}
          label="Latest CVEs"
          href="/cve"
          active={location.startsWith('/cve')}
          testId="button-vulnerabilities"
        />
        <SidebarItem
          icon={Flame}
          label="CISA KEV Catalog"
          href="/cisa-kev"
          active={location.startsWith('/cisa-kev')}
          badge={<SidebarBadge tone="accent">LIVE</SidebarBadge>}
          testId="button-kev-catalog"
        />
      </SidebarSection>
    </>
  );
}
