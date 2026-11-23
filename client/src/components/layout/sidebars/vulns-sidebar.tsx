import { useLocation } from 'wouter';
import { ShieldAlert, Flame, Bug, Building2, Layers, Calculator } from 'lucide-react';
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
        <SidebarItem
          icon={Building2}
          label="By vendor"
          href="/vendors"
          active={location.startsWith('/vendors')}
          testId="button-vendors"
        />
        <SidebarItem
          icon={Layers}
          label="By weakness (CWE)"
          href="/cwe"
          active={location.startsWith('/cwe')}
          testId="button-cwe"
        />
        <SidebarItem
          icon={Calculator}
          label="CVSS 3.1 calculator"
          href="/tools/cvss-calculator"
          active={location.startsWith('/tools/cvss-calculator')}
          testId="button-cvss-calculator"
        />
        <SidebarItem
          icon={Calculator}
          label="CVSS 4.0 calculator"
          href="/tools/cvss-4-calculator"
          active={location.startsWith('/tools/cvss-4-calculator')}
          testId="button-cvss4-calculator"
        />
      </SidebarSection>
    </>
  );
}
