import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { SEO } from '@/components/seo';
import { STATIC_PAGE_META } from '@/lib/page-meta';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { vendorUrl } from '@/lib/urls';
import type { VendorIndexRow } from '../../../server/services/hub-data';

/** /vendors: the vendors with the most CVEs (WHA-24). */
export default function VendorsPage() {
  const { data, isLoading } = useQuery<VendorIndexRow[]>({
    queryKey: ['/api/hubs/vendors'],
    queryFn: async () => {
      const res = await fetch('/api/hubs/vendors');
      if (!res.ok) throw new Error('Failed to load vendors');
      return res.json();
    },
  });

  // The server-written copy stays until the app has its own data.
  useSsrHandoff(!isLoading);

  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO {...STATIC_PAGE_META['/vendors']} />
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-20 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">Vulnerabilities by vendor</h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            The {data?.length ?? 100} vendors with the most CVEs in the National Vulnerability Database, with how many of their vulnerabilities are in
            CISA&apos;s Known Exploited Vulnerabilities catalog.
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-whatcyber-teal" />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((vendor) => (
              <li key={vendor.slug}>
                <Link
                  href={vendorUrl(vendor.slug)}
                  className="block rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-colors hover:border-whatcyber-teal/60"
                >
                  <div className="font-semibold text-slate-100">{vendor.name}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {vendor.cveCount.toLocaleString('en-US')} CVEs
                    {vendor.kevCount > 0 ? ` · ${vendor.kevCount.toLocaleString('en-US')} known exploited` : ''}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
