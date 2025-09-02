import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Globe, Rss, Filter, Zap, RefreshCw, Download, Plus, Minus, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AddSourcesDialog } from '@/components/add-sources-dialog';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { exportBookmarks } from '@/lib/export-utils';
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sourceToDeactivate, setSourceToDeactivate] = useState<{ id: string; name: string } | null>(null);
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);

  const { data: sources = [], isLoading } = useQuery<RssSource[]>({
    queryKey: ['/api/sources'],
  });

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

  const deactivateSourceMutation = useMutation({
    mutationFn: (sourceId: string) => apiRequest('PATCH', `/api/sources/${sourceId}`, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      toast({
        title: "Source Deactivated",
        description: "RSS source has been removed from sidebar and can be re-added from built-in sources",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate RSS source. Please try again.",
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

  const handleDeactivateSource = (sourceId: string, sourceName: string) => {
    setSourceToDeactivate({ id: sourceId, name: sourceName });
    setShowConfirmDialog(true);
  };

  const confirmDeactivateSource = () => {
    if (sourceToDeactivate) {
      deactivateSourceMutation.mutate(sourceToDeactivate.id);
      setSourceToDeactivate(null);
    }
  };

  const cancelDeactivateSource = () => {
    setSourceToDeactivate(null);
  };

  const getSourceIcon = (iconClass: string | null | undefined) => {
    if (!iconClass) return <Rss className="w-5 h-5" />;
    
    // Map Font Awesome classes to Lucide icons
    const iconMap: Record<string, JSX.Element> = {
      'fas fa-exclamation': <div className="w-5 h-5 bg-red-500 rounded-sm flex items-center justify-center text-white text-xs">!</div>,
      'fas fa-user-secret': <div className="w-5 h-5 bg-orange-500 rounded-sm flex items-center justify-center text-white text-xs">H</div>,
      'fas fa-eye': <div className="w-5 h-5 bg-purple-500 rounded-sm flex items-center justify-center text-white text-xs">👁</div>,
      'fas fa-crow': <div className="w-5 h-5 bg-red-600 rounded-sm flex items-center justify-center text-white text-xs">🐦</div>,
      'fas fa-shield-virus': <div className="w-5 h-5 bg-blue-600 rounded-sm flex items-center justify-center text-white text-xs">🛡</div>,
      'fas fa-search': <div className="w-5 h-5 bg-green-600 rounded-sm flex items-center justify-center text-white text-xs">🔍</div>,
      'fas fa-flash': <div className="w-5 h-5 bg-yellow-500 rounded-sm flex items-center justify-center text-white text-xs">⚡</div>,
    };

    return iconMap[iconClass] || <Rss className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <aside className="w-80 lg:w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto h-full">
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

  const totalArticles = sources.reduce((sum, source) => sum + (source.isActive ? 10 : 0), 0); // Rough estimate

  return (
    <aside className="w-80 lg:w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto h-full">
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
            <Filter className="w-5 h-5 text-cyber-cyan mr-2" />
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

        {/* Collapsible Feed Sources */}
        <Collapsible open={!isSourcesCollapsed} onOpenChange={(open) => setIsSourcesCollapsed(!open)} className="mb-6">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between mb-4 group">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center">
                <Rss className="w-5 h-5 text-cyber-cyan mr-2" />
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
                selectedSource === 'all' ? 'bg-cyber-blue' : 'hover:bg-slate-700'
              }`}
              onClick={() => onSourceSelect('all')}
              data-testid="button-source-all"
            >
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-slate-100" />
                <span className="font-medium text-slate-100">All Sources</span>
              </div>
              <span className="bg-slate-100 text-cyber-blue text-xs px-2 py-1 rounded-full font-medium">
                {totalArticles}
              </span>
            </button>

            {/* Individual Sources */}
            {sources.filter(source => source.isActive).map((source) => (
              <div
                key={source.id}
                className={`relative w-full flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
                  selectedSource === source.name ? 'bg-cyber-blue' : 'hover:bg-slate-700'
                }`}
                data-testid={`button-source-${source.name.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <button
                  className="flex-1 flex items-center space-x-3 text-left"
                  onClick={() => onSourceSelect(source.name)}
                >
                  {getSourceIcon(source.icon)}
                  <span className="text-slate-300 group-hover:text-slate-100 transition-colors">
                    {source.name}
                  </span>
                </button>
                
                {/* Article count badge */}
                <span className="bg-slate-600 text-slate-300 text-xs px-2 py-1 rounded-full mr-2">
                  {source.isActive ? '10' : '0'}
                </span>
                
                {/* Remove button - shown on hover */}
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-600 rounded text-red-400 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeactivateSource(source.id, source.name);
                  }}
                  title={`Remove ${source.name} from sidebar`}
                  disabled={deactivateSourceMutation.isPending}
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
              <Shield className="w-5 h-5 text-cyber-cyan mr-2" />
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



        {/* Quick Actions */}
        <div>
          <h3 className="text-md font-medium text-slate-200 mb-3 flex items-center">
            <Zap className="w-5 h-5 text-cyber-cyan mr-2" />
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
              variant="ghost"
              size="sm"
              className="w-full justify-start p-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700"
              onClick={() => setShowAddSourcesDialog(true)}
              data-testid="button-add-source"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Source
            </Button>
          </div>
        </div>
      </div>
      
      <AddSourcesDialog 
        open={showAddSourcesDialog}
        onOpenChange={setShowAddSourcesDialog}
      />
      
      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Remove RSS Source"
        description={sourceToDeactivate ? `Remove "${sourceToDeactivate.name}" from your sidebar? You can re-add it later from the built-in sources list.` : ''}
        confirmText="Remove Source"
        cancelText="Keep Source"
        variant="destructive"
        onConfirm={confirmDeactivateSource}
        onCancel={cancelDeactivateSource}
        loading={deactivateSourceMutation.isPending}
      />
    </aside>
  );
}
