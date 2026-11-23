import { Link } from 'wouter';
import { HUB_ANSWERS } from '@/lib/provenance';
import { DataProvenance } from '@/components/data-provenance';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { SEO } from '@/components/seo';
import { STATIC_PAGE_META } from '@/lib/page-meta';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { cweUrl } from '@/lib/urls';
import type { CweIndexRow } from '../../../server/services/hub-data';

/** /cwe: the weaknesses behind the most CVEs (WHA-24). */
export default function CweIndexPage() {
  const { data, isLoading } = useQuery<CweIndexRow[]>({
    queryKey: ['/api/hubs/cwe'],
    queryFn: async () => {
      const res = await fetch('/api/hubs/cwe');
      if (!res.ok) throw new Error('Failed to load weaknesses');
      return res.json();
    },
  });

  useSsrHandoff(!isLoading);

  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO {...STATIC_PAGE_META['/cwe']} />
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-20 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">Common software weaknesses (CWE)</h1>
          <p className="mt-2 max-w-3xl text-slate-400">{HUB_ANSWERS.cwe}</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-whatcyber-teal" />
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {(data ?? []).map((cwe) => (
              <li key={cwe.id}>
                <Link
                  href={cweUrl(cwe.id)}
                  className="block h-full rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-colors hover:border-whatcyber-teal/60"
                >
                  <div className="font-mono text-sm text-whatcyber-teal">{cwe.id}</div>
                  <div className="mt-1 font-medium text-slate-100">{cwe.name ?? cwe.id}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {cwe.cveCount.toLocaleString('en-US')} CVEs
                    {cwe.kevCount > 0 ? ` · ${cwe.kevCount.toLocaleString('en-US')} known exploited` : ''}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <DataProvenance kind="cwe" latest={data?.[0]?.updatedAt} label="Rankings updated" />
      </div>
    </AppShell>
  );
}
