import { Link, useRoute } from 'wouter';
import { DataProvenance } from '@/components/data-provenance';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { SEO } from '@/components/seo';
import { HubCveList, HubKevList, HubSection } from '@/components/hub-lists';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { productSeo } from '@/lib/seo-text';
import { VENDORS_HUB, productUrl, vendorUrl } from '@/lib/urls';
import type { ProductHub } from '../../../server/services/hub-data';

/** /vendors/:vendor/:product: the known exploited vulnerabilities of one product (WHA-24). */
export default function ProductDetailPage() {
  const [, params] = useRoute('/vendors/:vendor/:product');
  const vendor = params?.vendor?.toLowerCase();
  const product = params?.product?.toLowerCase();

  const { data: hub, isLoading } = useQuery<ProductHub | null>({
    queryKey: ['/api/hubs/products', vendor, product],
    enabled: !!vendor && !!product,
    queryFn: async () => {
      const res = await fetch(`/api/hubs/products/${encodeURIComponent(vendor!)}/${encodeURIComponent(product!)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to load product');
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
        <SEO title="Product Not Found | WhatCyber" description="This product page could not be found." noindex />
        <div className="space-y-3 py-24 text-center">
          <h1 className="text-2xl font-bold text-slate-400">Product not found</h1>
          <Link href={VENDORS_HUB} className="text-whatcyber-teal hover:underline">
            Browse all vendors
          </Link>
        </div>
      </AppShell>
    );
  }

  const name = `${hub.vendorName} ${hub.productName}`;

  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO {...productSeo(hub)} url={`https://www.whatcyber.com${productUrl(hub.vendorSlug, hub.productSlug)}`} />
      <div className="mx-auto max-w-5xl space-y-8 p-4 pb-20 lg:p-8">
        <div className="space-y-3">
          <div className="text-sm text-slate-500">
            <Link href={VENDORS_HUB} className="hover:text-whatcyber-teal hover:underline">
              Vendors
            </Link>{' '}
            /{' '}
            {hub.vendorHub ? (
              <Link href={vendorUrl(hub.vendorHub.slug)} className="hover:text-whatcyber-teal hover:underline">
                {hub.vendorHub.name}
              </Link>
            ) : (
              hub.vendorName
            )}{' '}
            / <span className="text-slate-300">{hub.productName}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">{name} vulnerabilities</h1>
          <p className="max-w-3xl text-slate-400">
            CISA lists {hub.kevCount.toLocaleString('en-US')} {name} {hub.kevCount === 1 ? 'vulnerability' : 'vulnerabilities'} in its Known Exploited
            Vulnerabilities (KEV) catalog, which means attackers are exploiting {hub.kevCount === 1 ? 'it' : 'them'} in the wild. The newest are listed first.
          </p>
        </div>

        <HubSection title={`Known exploited ${name} vulnerabilities`}>
          <HubKevList rows={hub.kev} />
        </HubSection>

        <HubSection title={`Latest CVEs mentioning ${name}`}>
          <HubCveList rows={hub.recent} />
        </HubSection>

        {hub.vendorHub && (
          <p className="text-sm">
            <Link href={vendorUrl(hub.vendorHub.slug)} className="text-whatcyber-teal hover:underline">
              All {hub.vendorHub.name} vulnerabilities
            </Link>
          </p>
        )}

        <DataProvenance kind="product" latest={hub.kev[0]?.dateAdded} label="Newest KEV entry added" />
      </div>
    </AppShell>
  );
}
