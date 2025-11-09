import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Globe, Rss, Filter, Zap, RefreshCw, Download, Plus, Minus, Shield, ChevronDown, ChevronUp, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AddSourcesDialog } from '@/components/add-sources-dialog';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { exportBookmarks } from '@/lib/export-utils';
import { getAuthenticatedUser } from '@/lib/auth';
import type { RssSource } from '@shared/schema';

interface SidebarProps {
  selectedSource: string;
  onSourceSelect: (source: string) => void;
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
  threatFilters: string[];
  onThreatFilterChange: (filters: string[]) => void;
  onClose?: () => void;
  onVulnerabilitiesClick?: () => void;
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
}: SidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddSourcesDialog, setShowAddSourcesDialog] = useState(false);
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
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
  const [showTooltipGuide, setShowTooltipGuide] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hasLoadedSources, setHasLoadedSources] = useState(false);

  // Reference for the add sources button
  const addSourcesButtonRef = useRef<HTMLButtonElement>(null);

  // Position tooltip when it's shown
  useEffect(() => {
    if (showTooltipGuide && addSourcesButtonRef.current) {
      // Add a small delay to ensure the button is fully rendered
      const timer = setTimeout(() => {
        positionTooltip(addSourcesButtonRef.current!);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showTooltipGuide]);

  // Get authenticated user
  const user = getAuthenticatedUser();

  // Filter out inactive sources from the sidebar display
  const activeUserSources = userSources.filter(source => source.isActive !== false);

  // Show tooltip guide on every login for all users
  useEffect(() => {
    if (user) {
      // Check if tooltip has already been shown in this session
      const hasShownTooltip = sessionStorage.getItem('tooltip_shown');
      
      if (!hasShownTooltip) {
        // Delay the tooltip slightly to ensure UI is rendered
        const showTimer = setTimeout(() => {
          setShowTooltipGuide(true);
        }, 1000);
        
        // Auto-hide after 20 seconds and mark as shown for this session
        const hideTimer = setTimeout(() => {
          setShowTooltipGuide(false);
          sessionStorage.setItem('tooltip_shown', 'true');
        }, 21000);
        
        return () => {
          clearTimeout(showTimer);
          clearTimeout(hideTimer);
        };
      }
    } else {
      // User logged out - clear the session flag so it shows again on next login
      sessionStorage.removeItem('tooltip_shown');
    }
  }, [user]);

  // Fetch user-specific sources with useCallback to prevent re-creation
  const fetchUserSources = useCallback(async (force = false) => {
    if (hasLoadedSources && !force) return; // Prevent multiple loads unless forced
    
    setIsLoadingSources(true);
    
    if (!user) {
      // For unauthenticated users, fetch all active sources
      try {
        const response = await apiRequest('GET', '/api/sources');
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
      const response = await apiRequest('GET', '/api/sources');
      const sources = await response.json();
      setUserSources(sources);
      setHasLoadedSources(true);
    } catch (error) {
      console.error('Error fetching user sources:', error);
      // Fallback to all active sources
      try {
        const response = await apiRequest('GET', '/api/sources');
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
    mutationFn: () => apiRequest('POST', '/api/fetch-feeds'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
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
    mutationFn: () => apiRequest('POST', '/api/fetch-cves'),
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
      apiRequest('POST', '/api/user-source-preferences', { sourceId, isActive }),
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

  // Update the getSourceIcon function to show different icons for active/inactive sources
  const getSourceIcon = (iconClass: string | null | undefined, isActive: boolean = true) => {
    if (!iconClass) return <Rss className={`w-5 h-5 ${isActive ? '' : 'opacity-50'}`} />;
    
    // Map Font Awesome classes to Lucide icons
    const iconMap: Record<string, JSX.Element> = {
      'fas fa-exclamation': <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-white text-xs ${isActive ? 'bg-red-500' : 'bg-red-500/50'}`}>!</div>,
      'fas fa-user-secret': <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-white text-xs ${isActive ? 'bg-orange-500' : 'bg-orange-500/50'}`}>H</div>,
      'fas fa-eye': <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-white text-xs ${isActive ? 'bg-purple-500' : 'bg-purple-500/50'}`}>👁</div>,
      'fas fa-crow': <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-white text-xs ${isActive ? 'bg-red-600' : 'bg-red-600/50'}`}>🐦</div>,
      'fas fa-shield-virus': <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-white text-xs ${isActive ? 'bg-blue-600' : 'bg-blue-600/50'}`}>🛡</div>,
      'fas fa-search': <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-white text-xs ${isActive ? 'bg-green-600' : 'bg-green-600/50'}`}>🔍</div>,
      'fas fa-flash': <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-white text-xs ${isActive ? 'bg-yellow-500' : 'bg-yellow-500/50'}`}>⚡</div>,
      'fas fa-microsoft': <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-white text-xs ${isActive ? 'bg-blue-500' : 'bg-blue-500/50'}`}>M</div>,
    };
    
    return iconMap[iconClass] || <Rss className={`w-5 h-5 ${isActive ? '' : 'opacity-50'}`} />;
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

  // Function to position tooltip relative to the add sources button
  const positionTooltip = (buttonElement: HTMLElement) => {
    const rect = buttonElement.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 100 // Move 100px higher to be completely above the heading
    });
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
            
            <Button
              ref={addSourcesButtonRef}
              variant="ghost"
              size="sm"
              className="w-full justify-start p-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700 relative"
              onClick={() => setShowAddSourcesDialog(true)}
              data-testid="button-add-source"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Source
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

        {/* Tooltip Guide Popup */}
        {showTooltipGuide && (
          <div 
            className="fixed z-50 animate-bounce"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
              animationDuration: '1s'
            }}
          >
            <div className="relative bg-slate-800 border border-slate-700 rounded-lg p-4 w-64 shadow-lg">
              <button
                onClick={() => {
                  setShowTooltipGuide(false);
                  sessionStorage.setItem('tooltip_shown', 'true');
                }}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <Plus className="w-5 h-5 text-whatcyber-teal" />
                </div>
                <div className="ml-2">
                  <h4 className="text-sm font-semibold text-slate-100">Add Threat Sources</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Click on the + to add new threat intelligence sources and customize your feed
                  </p>
                </div>
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-700"></div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Feed Sources */}
        <Collapsible open={!isSourcesCollapsed} onOpenChange={(open) => setIsSourcesCollapsed(!open)} className="mb-6">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between mb-4 group">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center">
                <Rss className="w-5 h-5 text-whatcyber-teal mr-2" />
                Threat Intel Sources
              </h2>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddSourcesDialog(true);
                  }}
                  data-testid="button-add-sources"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <div className="text-slate-400 hover:text-slate-100 transition-colors">
                  {isSourcesCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
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

            {/* Individual Sources */}
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
                  {getSourceIcon(source.icon, source.isActive !== false)}
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
