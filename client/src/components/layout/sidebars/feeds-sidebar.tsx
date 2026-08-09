import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Globe,
  Rss,
  Filter,
  Zap,
  RefreshCw,
  Download,
  Plus,
  Minus,
  Bookmark,
  Telescope,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SidebarSection, SidebarItem, SidebarBadge } from '@/components/layout/sidebar-primitives';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { exportBookmarks } from '@/lib/export-utils';
import { getAuthenticatedUser } from '@/lib/auth';
import { getFaviconUrl } from '@/lib/favicon-utils';
import { RSS_SOURCES } from '@/lib/rss-sources';
import type { RssSource } from '@shared/schema';

const GUEST_SOURCE_NAMES = [
  'Microsoft Security Blog',
  'Palo Alto Unit 42',
  'CrowdStrike Blog',
  'US-Cert (Alerts)',
  'Bleeping Computer',
];

export function guestSources(): RssSource[] {
  return RSS_SOURCES.filter((source) => GUEST_SOURCE_NAMES.includes(source.name)).map(
    (source, index) =>
      ({
        ...source,
        id: `guest-source-${index}`,
        isActive: true,
        userId: 'guest',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastFetched: null,
      }) as unknown as RssSource,
  );
}

interface FeedsSidebarProps {
  selectedSource?: string;
  onSourceSelect?: (source: string) => void;
  timeFilter?: string;
  onTimeFilterChange?: (filter: string) => void;
  threatFilters?: string[];
  onThreatFilterChange?: (filters: string[]) => void;
  onFollowSourcesClick?: () => void;
  onBookmarksClick?: () => void;
  /** 'feed' when on /threatfeed (filters apply); other pages navigate back to the feed. */
  activeView?: 'feed' | 'follow' | 'bookmarks' | 'none';
}

export function FeedsSidebar({
  selectedSource = 'all',
  onSourceSelect,
  timeFilter = 'all',
  onTimeFilterChange,
  threatFilters = ['CRITICAL', 'HIGH', 'MEDIUM'],
  onThreatFilterChange,
  onFollowSourcesClick,
  onBookmarksClick,
  activeView = 'none',
}: FeedsSidebarProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getAuthenticatedUser();

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    sourceId: string | null;
    sourceName: string | null;
  }>({ open: false, sourceId: null, sourceName: null });

  const { data: fetchedSources = [] } = useQuery<RssSource[]>({
    queryKey: ['/api/sources'],
    enabled: !user?.isGuest,
  });

  const sources = user?.isGuest ? guestSources() : fetchedSources;
  const activeSources = sources.filter((source) => source.isActive !== false);

  const refreshFeedsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/fetch-feeds/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      toast({ title: 'Feeds Updated', description: 'Fetched the latest articles from all sources.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to refresh feeds. Please try again.', variant: 'destructive' });
    },
  });

  const exportBookmarksMutation = useMutation({
    mutationFn: exportBookmarks,
    onSuccess: () => {
      toast({ title: 'Export Successful', description: 'Your bookmarks have been exported.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export bookmarks. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateUserSourceMutation = useMutation({
    mutationFn: ({ sourceId, isActive }: { sourceId: string; isActive: boolean }) =>
      apiRequest('POST', '/api/user-source-preferences/', { sourceId, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update source preference. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const requireAccount = (): boolean => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to customize your sources.',
        variant: 'destructive',
      });
      return false;
    }
    if (user.isGuest) {
      toast({
        title: 'Authentication Required',
        description: 'Login to customize your sources and personalize your experience.',
      });
      return false;
    }
    return true;
  };

  const selectSource = (source: string) => {
    setLocation(`/threatfeed?source=${encodeURIComponent(source)}`);
    onSourceSelect?.(source);
  };

  const handleThreatFilterChange = (threatLevel: string, checked: boolean) => {
    if (!onThreatFilterChange) return;
    if (checked) {
      onThreatFilterChange([...threatFilters, threatLevel]);
    } else {
      onThreatFilterChange(threatFilters.filter((filter) => filter !== threatLevel));
    }
  };

  const sourceFavicon = (source: RssSource) => (
    <img
      src={getFaviconUrl(source.url, 20)}
      alt=""
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-sm"
      onError={(e) => {
        (e.target as HTMLImageElement).style.visibility = 'hidden';
      }}
    />
  );

  return (
    <>
      <SidebarSection label="Browse" icon={Telescope}>
        <SidebarItem
          icon={Plus}
          label="Follow Sources"
          active={activeView === 'follow'}
          onClick={() => {
            setLocation('/threatfeed?view=follow');
            onFollowSourcesClick?.();
          }}
          testId="button-follow-sources"
        />
        <SidebarItem
          icon={Bookmark}
          label="Bookmarks"
          active={activeView === 'bookmarks'}
          onClick={() => {
            if (user?.isGuest) {
              toast({
                title: 'Authentication Required',
                description: 'Login to use the bookmark feature and personalize your experience.',
              });
              return;
            }
            setLocation('/threatfeed?view=bookmarks');
            onBookmarksClick?.();
          }}
          testId="button-sidebar-bookmarks"
        />
      </SidebarSection>

      <SidebarSection label="Threat Intel Sources" icon={Rss}>
        <SidebarItem
          icon={Globe}
          label="All Sources"
          active={activeView === 'feed' && selectedSource === 'all'}
          onClick={() => selectSource('all')}
          badge={<SidebarBadge tone="accent">{activeSources.length}</SidebarBadge>}
          testId="button-source-all"
        />
        {activeSources.map((source) => (
          <SidebarItem
            key={source.id}
            leading={sourceFavicon(source)}
            label={source.name}
            active={activeView === 'feed' && selectedSource === source.name}
            onClick={() => selectSource(source.name)}
            testId={`button-source-${source.name.replace(/\s+/g, '-').toLowerCase()}`}
            trailing={
              <button
                type="button"
                className="absolute right-2 rounded p-1 text-red-400 opacity-0 transition-opacity hover:bg-destructive hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!requireAccount()) return;
                  setDeleteConfirmation({ open: true, sourceId: source.id, sourceName: source.name });
                }}
                aria-label={`Hide ${source.name}`}
                disabled={updateUserSourceMutation.isPending}
              >
                <Minus className="h-3 w-3" />
              </button>
            }
          />
        ))}
        {activeSources.length === 0 && (
          <div className="mx-1 rounded-lg border border-whatcyber-teal/30 bg-accent p-3 text-sm">
            <p className="font-medium text-slate-100">Follow threat intel sources</p>
            <p className="mt-1 text-slate-400">Add sources to customize your feed.</p>
          </div>
        )}
      </SidebarSection>

      <SidebarSection label="Filters" icon={Filter}>
        <div className="space-y-2 px-3 pb-1">
          <Label className="text-xs text-slate-400" htmlFor="time-filter">
            Time Range
          </Label>
          <Select value={timeFilter} onValueChange={(value) => onTimeFilterChange?.(value)}>
            <SelectTrigger id="time-filter" className="h-9 w-full bg-secondary" data-testid="select-time-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 px-3 pt-2">
          <Label className="text-xs text-slate-400">Threat Level</Label>
          <div className="space-y-2">
            {[
              { id: 'CRITICAL', label: 'Critical', color: 'bg-red-500' },
              { id: 'HIGH', label: 'High', color: 'bg-orange-500' },
              { id: 'MEDIUM', label: 'Medium', color: 'bg-yellow-500' },
            ].map((threat) => (
              <div key={threat.id} className="flex items-center gap-2">
                <Checkbox
                  id={threat.id}
                  checked={threatFilters.includes(threat.id)}
                  onCheckedChange={(checked) => handleThreatFilterChange(threat.id, !!checked)}
                  data-testid={`checkbox-threat-${threat.id.toLowerCase()}`}
                />
                <Label htmlFor={threat.id} className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${threat.color}`} aria-hidden="true" />
                  {threat.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </SidebarSection>

      <SidebarSection label="Quick Actions" icon={Zap}>
        <SidebarItem
          icon={RefreshCw}
          label={refreshFeedsMutation.isPending ? 'Refreshing…' : 'Refresh All Feeds'}
          onClick={() => refreshFeedsMutation.mutate()}
          disabled={refreshFeedsMutation.isPending}
          testId="button-refresh-feeds"
        />
        <SidebarItem
          icon={Download}
          label={exportBookmarksMutation.isPending ? 'Exporting…' : 'Export Bookmarks'}
          onClick={() => exportBookmarksMutation.mutate()}
          disabled={exportBookmarksMutation.isPending}
          testId="button-export-bookmarks"
        />
      </SidebarSection>

      <ConfirmationDialog
        open={deleteConfirmation.open}
        onOpenChange={(open) => setDeleteConfirmation((prev) => ({ ...prev, open }))}
        title="Disable Source"
        description={`Are you sure you want to disable the source "${deleteConfirmation.sourceName || ''}"?`}
        confirmText="Disable"
        cancelText="Cancel"
        onConfirm={() => {
          if (deleteConfirmation.sourceId) {
            updateUserSourceMutation.mutate({ sourceId: deleteConfirmation.sourceId, isActive: false });
          }
          setDeleteConfirmation({ open: false, sourceId: null, sourceName: null });
        }}
        onCancel={() => setDeleteConfirmation({ open: false, sourceId: null, sourceName: null })}
      />
    </>
  );
}
