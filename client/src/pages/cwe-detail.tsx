import { Link, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { SEO } from '@/components/seo';
import { HubCveList, HubKevList, HubSection, SeverityStrip } from '@/components/hub-lists';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { cweSeo } from '@/lib/seo-text';
import { CWE_HUB, cweUrl } from '@/lib/urls';
import type { CweHub } from '../../../server/services/hub-data';

/** /cwe/:id: the newest and the exploited CVEs with one weakness (WHA-24). */
export default function CweDetailPage() {
  const [, params] = useRoute('/cwe/:id');
  const id = params?.id?.toUpperCase();

  const { data: hub, isLoading } = useQuery<CweHub | null>({
    queryKey: ['/api/hubs/cwe', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/hubs/cwe/${encodeURIComponent(id!)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to load weakness');
      return res.json();
    },
  });

  useSsrHandoff(!isLoading);

  if (isLoading) {
    return (
      <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
        <div className="flex justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-whatcyber-teal" />
        </div>
      </AppShell>
    );
  }

  if (!hub) {
    return (
      <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
        <SEO title="Weakness Not Found | WhatCyber" description="This weakness page could not be found." noindex />
        <div className="space-y-3 py-24 text-center">
          <h1 className="text-2xl font-bold text-slate-400">Weakness not found</h1>
          <Link href={CWE_HUB} className="text-whatcyber-teal hover:underline">
            Browse all weaknesses
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO {...cweSeo(hub)} url={`https://www.whatcyber.com${cweUrl(hub.id)}`} />
      <div className="mx-auto max-w-5xl space-y-8 p-4 pb-20 lg:p-8">
        <div className="space-y-3">
          <div className="text-sm text-slate-500">
            <Link href={CWE_HUB} className="hover:text-whatcyber-teal hover:underline">
              Weaknesses
            </Link>{' '}
            / <span className="text-slate-300">{hub.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">
            {hub.id}
            {hub.name ? `: ${hub.name}` : ''}
          </h1>
          {hub.category && <p className="text-sm text-slate-500">Category: {hub.category}</p>}
          {hub.description && <p className="max-w-3xl text-slate-300">{hub.description}</p>}
          <p className="max-w-3xl text-slate-400">
            {hub.cveCount.toLocaleString('en-US')} CVEs have this weakness
            {hub.kevCount > 0 ? `, ${hub.kevCount.toLocaleString('en-US')} of them in CISA's Known Exploited Vulnerabilities (KEV) catalog` : ''}.
          </p>
          <SeverityStrip severity={hub.severity} />
        </div>

        <HubSection title={`Latest CVEs with ${hub.id}`}>
          <HubCveList rows={hub.recent} />
        </HubSection>

        {hub.kev.length > 0 && (
          <HubSection title={`Known exploited vulnerabilities with ${hub.id}`}>
            <HubKevList rows={hub.kev} />
          </HubSection>
        )}
      </div>
    </AppShell>
  );
}
