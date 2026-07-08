import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { ShieldAlert, Flame, RefreshCw, Zap, Bug } from 'lucide-react';
import { SidebarSection, SidebarItem, SidebarBadge } from '@/components/layout/sidebar-primitives';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function VulnsSidebar() {
  const [location] = useLocation();
  const { toast } = useToast();

  const fetchCVEsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/fetch-cves/'),
    onSuccess: () => {
      toast({ title: 'CVEs Updated', description: 'Fetched the latest CVEs from NVD.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to fetch CVEs. Please try again.', variant: 'destructive' });
    },
  });

  return (
    <>
      <SidebarSection label="Vulnerabilities" icon={ShieldAlert}>
        <SidebarItem
          icon={Bug}
          label="Latest CVEs"
          href="/vulnerabilities"
          active={location.startsWith('/vulnerabilities')}
          testId="button-vulnerabilities"
        />
        <SidebarItem
          icon={Flame}
          label="CISA KEV Catalog"
          href="/exploited-vulnerabilities"
          active={location.startsWith('/exploited-vulnerabilities')}
          badge={<SidebarBadge tone="accent">LIVE</SidebarBadge>}
          testId="button-kev-catalog"
        />
      </SidebarSection>

      <SidebarSection label="Quick Actions" icon={Zap}>
        <SidebarItem
          icon={RefreshCw}
          label={fetchCVEsMutation.isPending ? 'Refreshing…' : 'Refresh CVEs from NVD'}
          onClick={() => fetchCVEsMutation.mutate()}
          disabled={fetchCVEsMutation.isPending}
          testId="button-refresh-cves"
        />
      </SidebarSection>
    </>
  );
}
