import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { CVEList } from '@/components/cve-list';
import { SEO } from '@/components/seo';

export default function VulnerabilitiesPage() {
  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO
        title="Latest Vulnerabilities (CVEs) | WhatCyber"
        description="Browse the latest Common Vulnerabilities and Exposures (CVEs). Stay updated on security flaws and potential exploits."
        keywords="CVE, vulnerabilities, security flaws, exploit, cvss, nvd"
      />
      <CVEList />
    </AppShell>
  );
}
