import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, Globe, Rss, Filter, Zap, RefreshCw, Download, Plus, Minus, Shield, ChevronDown, ChevronUp, X, Bookmark } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AddSourcesDialog } from '@/components/add-sources-dialog';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { exportBookmarks } from '@/lib/export-utils';
import { getAuthenticatedUser } from '@/lib/auth';
import { getFaviconUrl } from '@/lib/favicon-utils';
import { VENDOR_THREAT_RESEARCH, GOVERNMENT_ALERTS, MALWARE_RESEARCH, GENERAL_SECURITY_NEWS, LEGACY_SOURCES } from '@/lib/rss-sources';
import type { InsertRssSource, RssSource } from '@shared/schema';

interface SidebarProps {
  selectedSource: string;
  onSourceSelect: (source: string) => void;
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
  threatFilters: string[];
  onThreatFilterChange: (filters: string[]) => void;
  onClose?: () => void;
  onVulnerabilitiesClick?: () => void;
  onFollowSourcesClick?: () => void; // Add this new prop
  onBookmarksClick?: () => void; // Add this new prop
}

export function Sidebar({
  selectedSource,
  onSourceSelect,
  timeFilter,
  onTimeFilterChange,
  threatFilters,
  onThreatFilterChange,
  onClose,
  onVulnerabilitiesClick,
  onFollowSourcesClick,
  onBookmarksClick,
}: SidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddSourcesDialog, setShowAddSourcesDialog] = useState(false);
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
  const [isFollowSourcesCollapsed, setIsFollowSourcesCollapsed] = useState(true);
  const [userSources, setUserSources] = useState<RssSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    sourceId: string | null;
    sourceName: string | null;
  }>({
    open: false,
    sourceId: null,
    sourceName: null
  });
  const [hasLoadedSources, setHasLoadedSources] = useState(false);

  // Reference for the add sources button
  const addSourcesButtonRef = useRef<HTMLButtonElement>(null);

  // Get authenticated user
  const user = getAuthenticatedUser();

  // Filter out inactive sources from the sidebar display
  const activeUserSources = userSources.filter(source => source.isActive !== false);

  // Fetch user-specific sources with useCallback to prevent re-creation
  const fetchUserSources = useCallback(async (force = false) => {
    if (hasLoadedSources && !force) return; // Prevent multiple loads unless forced
    
    setIsLoadingSources(true);
    
    if (!user) {
      // For unauthenticated users, fetch all active sources
      try {
        const response = await apiRequest('GET', '/api/sources/');
        const sources = await response.json();
        setUserSources(sources);
        setHasLoadedSources(true);
      } catch (error) {
        console.error('Error fetching sources:', error);
      } finally {
        setIsLoadingSources(false);
      }
      return;
    }

    // For authenticated users, fetch user-specific sources
    try {
      const response = await apiRequest('GET', '/api/sources/');
      const sources = await response.json();
      setUserSources(sources);
      setHasLoadedSources(true);
    } catch (error) {
      console.error('Error fetching user sources:', error);
      // Fallback to all active sources
      try {
        const response = await apiRequest('GET', '/api/sources/');
        const sources = await response.json();
        setUserSources(sources);
        setHasLoadedSources(true);
      } catch (fallbackError) {
        console.error('Error fetching fallback sources:', fallbackError);
      }
    } finally {
      setIsLoadingSources(false);
    }
  }, [user, hasLoadedSources]);

  // Fetch sources only once on mount or when user changes
  useEffect(() => {
    fetchUserSources();
  }, [fetchUserSources]);

  const refreshFeedsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/fetch-feeds/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles/'] });
      toast({
        title: "Feeds Updated",
        description: "Successfully fetched latest articles from all sources",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to refresh feeds. Please try again.",
        variant: "destructive",
      });
    },
  });

  const exportBookmarksMutation = useMutation({
    mutationFn: exportBookmarks,
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Your bookmarks have been exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export bookmarks. Please try again.",
        variant: "destructive",
      });
    },
  });

  const fetchCVEsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/fetch-cves/'),
    onSuccess: () => {
      toast({
        title: "CVEs Updated",
        description: "Successfully fetched latest CVEs from NVD",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to fetch CVEs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateUserSourceMutation = useMutation({
    mutationFn: ({ sourceId, isActive }: { sourceId: string; isActive: boolean }) => 
      apiRequest('POST', '/api/user-source-preferences/', { sourceId, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      // Refetch sources after updating (force refresh)
      fetchUserSources(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update source preference. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleThreatFilterChange = (threatLevel: string, checked: boolean) => {
    if (checked) {
      onThreatFilterChange([...threatFilters, threatLevel]);
    } else {
      onThreatFilterChange(threatFilters.filter(filter => filter !== threatLevel));
    }
  };

  const handleToggleSource = (sourceId: string, currentActiveState: boolean) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to customize your sources.",
        variant: "destructive",
      });
      return;
    }
    
    updateUserSourceMutation.mutate({ 
      sourceId, 
      isActive: !currentActiveState 
    });
  };

  const handleDeleteSource = (sourceId: string, sourceName: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to customize your sources.",
        variant: "destructive",
      });
      return;
    }
    
    // Show confirmation dialog before disabling
    setDeleteConfirmation({ open: true, sourceId, sourceName });
  };

  const confirmDeleteSource = () => {
    if (deleteConfirmation.sourceId) {
      // Instead of deleting, we toggle the source to inactive
      updateUserSourceMutation.mutate({ 
        sourceId: deleteConfirmation.sourceId, 
        isActive: false 
      });
      setDeleteConfirmation({ open: false, sourceId: null, sourceName: null });
    }
  };

  const cancelDeleteSource = () => {
    setDeleteConfirmation({ open: false, sourceId: null, sourceName: null });
  };

  // Render favicon for source
  const renderSourceFavicon = (source: RssSource) => {
    const isActive = source.isActive !== false;
    const faviconUrl = getFaviconUrl(source.url, 20);
    
    return (
      <div className={`w-5 h-5 flex items-center justify-center ${isActive ? '' : 'opacity-50'}`}>
        <img 
          src={faviconUrl} 
          alt={`${source.name} icon`}
          className="w-5 h-5 rounded-sm"
          onError={(e) => {
            // Fallback to RSS icon if favicon fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const fallbackDiv = document.createElement('div');
              fallbackDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-slate-400"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/></svg>';
              parent.appendChild(fallbackDiv.firstChild!);
            }
          }}
        />
      </div>
    );
  };

  if (isLoadingSources) {
    return (
      <aside className="w-80 lg:w-80 bg-whatcyber-dark border-r border-whatcyber-light-gray/30 overflow-y-auto h-full">
        <div className="p-4 lg:p-6">
          {/* Mobile Close Button */}
          {onClose && (
            <div className="lg:hidden flex justify-end mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-100"
              >
                ×
              </Button>
            </div>
          )}
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-700 rounded"></div>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const totalArticles = userSources.reduce((sum, source) => sum + (source.isActive ? 10 : 0), 0); // Rough estimate

  // Function to handle adding a source
  const handleAddSource = (sourceName: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add sources.",
        variant: "destructive",
      });
      return;
    }
    
    // Find the source in our predefined lists
    const allSources = [
      ...VENDOR_THREAT_RESEARCH,
      ...GOVERNMENT_ALERTS,
      ...MALWARE_RESEARCH,
      ...GENERAL_SECURITY_NEWS,
      ...LEGACY_SOURCES
    ];
    
    const sourceToAdd = allSources.find(source => source.name === sourceName);
    if (!sourceToAdd) return;
    
    // Check if source already exists in the user's sources and is active
    const activeSourceExists = userSources.some(existing => 
      existing.isActive && (existing.name === sourceToAdd.name || existing.url === sourceToAdd.url)
    );

    if (activeSourceExists) {
      toast({
        title: "Source Already Added",
        description: `${sourceToAdd.name} is already active in your sources list`,
        variant: "destructive",
      });
      return;
    }

    // Check if inactive source exists that we can reactivate
    const inactiveSource = userSources.find(existing => 
      !existing.isActive && (existing.name === sourceToAdd.name || existing.url === sourceToAdd.url)
    );

    if (inactiveSource) {
      // Reactivate existing inactive source
      updateUserSourceMutation.mutate({ 
        sourceId: inactiveSource.id, 
        isActive: true 
      });
    } else {
      // Check if the source exists globally
      const globalSource = userSources.find(source => 
        source.name === sourceToAdd.name || source.url === sourceToAdd.url
      );
      
      if (globalSource) {
        // If source exists globally, just enable it for this user
        updateUserSourceMutation.mutate({ 
          sourceId: globalSource.id, 
          isActive: true 
        });
      } else {
        // If source doesn't exist globally, show a message
        toast({
          title: "Source Not Available",
          description: "This source is not currently available in the system.",
          variant: "destructive",
        });
      }
    }
  };

  // Function to check if a source is already added
  const isSourceAdded = (sourceName: string) => {
    return userSources.some(source => 
      source.name === sourceName && source.isActive
    );
  };

  // Render source card for Follow Sources section
  const renderSourceCard = (source: any) => {
    const isAdded = isSourceAdded(source.name);
    const faviconUrl = getFaviconUrl(source.url, 16);
    
    return (
      <div 
        key={source.name}
        className="border border-whatcyber-light-gray/30 rounded-lg p-3 bg-whatcyber-darker hover:bg-whatcyber-gray/50 transition-colors"
      >
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0 mt-0.5">
            <img 
              src={faviconUrl} 
              alt={`${source.name} icon`}
              className="w-4 h-4 rounded-sm"
              onError={(e) => {
                // Fallback to RSS icon if favicon fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallbackDiv = document.createElement('div');
                  fallbackDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-slate-400"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/></svg>';
                  parent.appendChild(fallbackDiv.firstChild!);
                }
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-100 text-sm truncate">{source.name}</h4>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {source.description || `Follow threat intelligence from ${source.name}`}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 w-6 p-0 ${isAdded ? 'text-green-400 hover:text-green-300' : 'text-whatcyber-teal hover:text-whatcyber-teal'}`}
            onClick={() => handleAddSource(source.name)}
            disabled={isAdded || updateUserSourceMutation.isPending}
            title={isAdded ? "Already added" : "Add source"}
          >
            {isAdded ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-80 lg:w-80 bg-whatcyber-dark border-r border-whatcyber-light-gray/30 overflow-y-auto h-full">
      <div className="p-4 lg:p-6">
        {/* Mobile Close Button */}
        {onClose && (
          <div className="lg:hidden flex justify-end mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100"
            >
              ×
            </Button>
          </div>
        )}
        
        {/* Filter Options - Moved to top */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-slate-200 mb-3 flex items-center">
            <Filter className="w-5 h-5 text-whatcyber-teal mr-2" />
            Filters
          </h3>
          
          {/* Time Filter */}
          <div className="space-y-2">
            <Label className="block text-sm text-slate-400">Time Range</Label>
            <Select value={timeFilter} onValueChange={onTimeFilterChange}>
              <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-slate-100" data-testid="select-time-filter">
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

          {/* Threat Level Filter */}
          <div className="space-y-2 mt-4">
            <Label className="block text-sm text-slate-400">Threat Level</Label>
            <div className="space-y-2">
              {[
                { id: 'CRITICAL', label: 'Critical', color: 'text-red-400' },
                { id: 'HIGH', label: 'High', color: 'text-yellow-400' },
                { id: 'MEDIUM', label: 'Medium', color: 'text-blue-400' },
              ].map((threat) => (
                <div key={threat.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={threat.id}
                    checked={threatFilters.includes(threat.id)}
                    onCheckedChange={(checked) => handleThreatFilterChange(threat.id, !!checked)}
                    className="bg-slate-700 border-slate-600"
                    data-testid={`checkbox-threat-${threat.id.toLowerCase()}`}
                  />
                  <Label htmlFor={threat.id} className={`text-sm ${threat.color} cursor-pointer`}>
                    {threat.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-slate-200 mb-3 flex items-center">
            <Zap className="w-5 h-5 text-whatcyber-teal mr-2" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700"
              onClick={() => refreshFeedsMutation.mutate()}
              disabled={refreshFeedsMutation.isPending}
              data-testid="button-refresh-feeds"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshFeedsMutation.isPending ? 'animate-spin' : ''}`} />
              {refreshFeedsMutation.isPending ? 'Refreshing...' : 'Refresh All Feeds'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700"
              onClick={() => exportBookmarksMutation.mutate()}
              disabled={exportBookmarksMutation.isPending}
              data-testid="button-export-bookmarks"
            >
              <Download className={`w-4 h-4 mr-2 ${exportBookmarksMutation.isPending ? 'animate-pulse' : ''}`} />
              {exportBookmarksMutation.isPending ? 'Exporting...' : 'Export Bookmarks'}
            </Button>
            
            {/* New Bookmarks Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700"
              onClick={onBookmarksClick}
              data-testid="button-sidebar-bookmarks"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Bookmarks
            </Button>

          </div>
          
          {/* Callout box for adding new sources */}
          {activeUserSources.length === 0 && (
            <div className="mt-4 p-3 bg-whatcyber-teal/10 border border-whatcyber-teal/30 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <Plus className="w-4 h-4 text-whatcyber-teal" />
                </div>
                <div className="ml-2 text-sm text-slate-300">
                  <p className="font-medium text-slate-200">Follow more threat intel sources</p>
                  <p className="mt-1">Add new sources to customize your threat intelligence feed</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Follow Sources Section - Moved to its own section */}
        <div className="mb-6">
          <div 
            className="w-full flex items-center justify-between p-2 cursor-pointer hover:bg-slate-700 rounded-lg"
            onClick={onFollowSourcesClick}
            data-testid="button-follow-sources"
          >
            <h3 className="text-lg font-semibold text-slate-100 flex items-center">
              <Plus className="w-5 h-5 text-green-500 mr-2" />
              Follow Sources
            </h3>
          </div>
        </div>

        {/* Collapsible Feed Sources - Restore the delete/hide button */}
        <Collapsible open={!isSourcesCollapsed} onOpenChange={(open) => setIsSourcesCollapsed(!open)} className="mb-6">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between mb-4 group">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center">
                <Rss className="w-5 h-5 text-whatcyber-teal mr-2" />
                Threat Intel Sources
              </h2>
              <div className="text-slate-400 hover:text-slate-100 transition-colors">
                {isSourcesCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2">
            {/* All Sources */}
            <button
              className={`w-full flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                selectedSource === 'all' ? 'bg-whatcyber-teal/20 border border-whatcyber-teal/30' : 'hover:bg-whatcyber-gray/50'
              }`}
              onClick={() => onSourceSelect('all')}
              data-testid="button-source-all"
            >
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-slate-100" />
                <span className="font-medium text-slate-100">All Sources</span>
              </div>
              <span className="bg-whatcyber-teal text-whatcyber-dark text-xs px-2 py-1 rounded-full font-medium">
                {totalArticles}
              </span>
            </button>

            {/* Individual Sources - Restore the delete/hide button */}
            {activeUserSources.map((source) => (
              <div
                key={source.id}
                className={`relative w-full flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
                  selectedSource === source.name ? 'bg-whatcyber-teal/20 border border-whatcyber-teal/30' : 'hover:bg-whatcyber-gray/50'
                }`}
                data-testid={`button-source-${source.name.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <button
                  className="flex-1 flex items-center space-x-3 text-left"
                  onClick={() => onSourceSelect(source.name)}
                >
                  {renderSourceFavicon(source)}
                  <span className="text-slate-300 group-hover:text-slate-100 transition-colors">
                    {source.name}
                  </span>
                </button>
                
                {/* Delete/Hide button - shown on hover */}
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-600 rounded text-red-400 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSource(source.id, source.name);
                  }}
                  title={`Hide ${source.name}`}
                  disabled={updateUserSourceMutation.isPending}
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Vulnerabilities Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center">
              <Shield className="w-5 h-5 text-whatcyber-teal mr-2" />
              Vulnerabilities
            </h2>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-100 hover:bg-slate-700"
              onClick={() => fetchCVEsMutation.mutate()}
              disabled={fetchCVEsMutation.isPending}
              title="Refresh CVEs from NVD"
            >
              <RefreshCw className={`w-4 h-4 ${fetchCVEsMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="space-y-2">
            <button
              className="w-full flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-slate-700"
              onClick={onVulnerabilitiesClick}
              data-testid="button-vulnerabilities"
            >
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-red-500 rounded-sm flex items-center justify-center text-white text-xs">
                  CVE
                </div>
                <span className="font-medium text-slate-100">Latest CVEs</span>
              </div>
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                NEW
              </span>
            </button>
          </div>
        </div>

      </div>
      
      <AddSourcesDialog 
        open={showAddSourcesDialog}
        onOpenChange={setShowAddSourcesDialog}
      />

      <ConfirmationDialog
        open={deleteConfirmation.open}
        onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, open }))}
        title="Disable Source"
        description={`Are you sure you want to disable the source "${deleteConfirmation.sourceName || ''}"?`}
        confirmText="Disable"
        cancelText="Cancel"
        onConfirm={confirmDeleteSource}
        onCancel={cancelDeleteSource}
      />

    </aside>
  );
}
