import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { CVEList } from '@/components/cve-list';
import { SEO } from '@/components/seo';
import { STATIC_PAGE_META } from '@/lib/page-meta';
import { HUB_ANSWERS } from '@/lib/provenance';
import { DataProvenance } from '@/components/data-provenance';

export default function VulnerabilitiesPage() {
  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO
        {...STATIC_PAGE_META['/cve']}
      />
      <div className="px-4 pt-4 lg:px-6 lg:pt-6">
        <p className="max-w-3xl text-slate-400">{HUB_ANSWERS.cve}</p>
      </div>
      <CVEList />
      <div className="px-4 pb-8 lg:px-6">
        <DataProvenance kind="cve" />
      </div>
    </AppShell>
  );
}
