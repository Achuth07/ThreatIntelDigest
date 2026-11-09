import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { CVEList } from '@/components/cve-list';
import { SEO } from '@/components/seo';
import { STATIC_PAGE_META } from '@/lib/page-meta';

export default function VulnerabilitiesPage() {
  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO
        {...STATIC_PAGE_META['/cve']}
      />
      <CVEList />
    </AppShell>
  );
}
