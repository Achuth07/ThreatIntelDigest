import { Link, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { SEO } from '@/components/seo';
import { HubCveList, HubKevList, HubSection, SeverityStrip } from '@/components/hub-lists';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { vendorSeo } from '@/lib/seo-text';
import { VENDORS_HUB, cweUrl, vendorUrl } from '@/lib/urls';
import type { VendorHub } from '../../../server/services/hub-data';

/** /vendors/:slug: the newest and the exploited CVEs of one vendor (WHA-24). */
export default function VendorDetailPage() {
  const [, params] = useRoute('/vendors/:slug');
  const slug = params?.slug?.toLowerCase();

  const { data: hub, isLoading } = useQuery<VendorHub | null>({
    queryKey: ['/api/hubs/vendors', slug],
    enabled: !!slug,
    queryFn: async () => {
      const res = await fetch(`/api/hubs/vendors/${encodeURIComponent(slug!)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to load vendor');
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
        <SEO title="Vendor Not Found | WhatCyber" description="This vendor page could not be found." noindex />
        <div className="space-y-3 py-24 text-center">
          <h1 className="text-2xl font-bold text-slate-400">Vendor not found</h1>
          <Link href={VENDORS_HUB} className="text-whatcyber-teal hover:underline">
            Browse all vendors
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO {...vendorSeo(hub)} url={`https://www.whatcyber.com${vendorUrl(hub.slug)}`} />
      <div className="mx-auto max-w-5xl space-y-8 p-4 pb-20 lg:p-8">
        <div className="space-y-3">
          <div className="text-sm text-slate-500">
            <Link href={VENDORS_HUB} className="hover:text-whatcyber-teal hover:underline">
              Vendors
            </Link>{' '}
            / <span className="text-slate-300">{hub.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">{hub.name} vulnerabilities</h1>
          <p className="max-w-3xl text-slate-400">
            {hub.name} has {hub.cveCount.toLocaleString('en-US')} CVEs recorded in the National Vulnerability Database
            {hub.kevCount > 0 ? `, ${hub.kevCount.toLocaleString('en-US')} of them in CISA's Known Exploited Vulnerabilities (KEV) catalog` : ''}.
          </p>
          <SeverityStrip severity={hub.severity} />
        </div>

        <HubSection title={`Latest ${hub.name} CVEs`}>
          <HubCveList rows={hub.recent} />
        </HubSection>

        {hub.kev.length > 0 && (
          <HubSection title={`Known exploited ${hub.name} vulnerabilities`}>
            <HubKevList rows={hub.kev} />
          </HubSection>
        )}

        {hub.topWeaknesses.length > 0 && (
          <HubSection title="Most common weaknesses">
            <ul className="space-y-2">
              {hub.topWeaknesses.map((w) => (
                <li key={w.id} className="text-sm text-slate-300">
                  <Link href={cweUrl(w.id)} className="text-whatcyber-teal hover:underline">
                    {w.id}
                    {w.name ? `: ${w.name}` : ''}
                  </Link>{' '}
                  <span className="text-slate-500">({w.count.toLocaleString('en-US')} CVEs)</span>
                </li>
              ))}
            </ul>
          </HubSection>
        )}
      </div>
    </AppShell>
  );
}
