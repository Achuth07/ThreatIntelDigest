import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { CVEList } from '@/components/cve-list';
import { SEO } from '@/components/seo';

export default function VulnerabilitiesPage() {
  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO
        title="Latest CVEs Today: New Vulnerabilities by Severity | WhatCyber"
        description="Browse newly published CVEs, filter by severity and vendor, and see CVSS scores. Data from the National Vulnerability Database."
        keywords="CVE, vulnerabilities, security flaws, exploit, cvss, nvd"
      />
      <CVEList />
    </AppShell>
  );
}
