import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getFaviconUrl } from '@/lib/favicon-utils';
import { VENDOR_THREAT_RESEARCH, GOVERNMENT_ALERTS, MALWARE_RESEARCH, GENERAL_SECURITY_NEWS, LEGACY_SOURCES } from '@/lib/rss-sources';
import type { RssSource, InsertRssSource } from '@shared/schema';
import { getAuthenticatedUser } from '@/lib/auth';

interface FollowSourcesViewProps {
  userSources: RssSource[];
  onSourceAdded?: () => void;
  onBack: () => void;
}

export function FollowSourcesView({ userSources, onSourceAdded, onBack }: FollowSourcesViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getAuthenticatedUser();

  const addSourceMutation = useMutation({
    mutationFn: (data: InsertRssSource) => apiRequest('POST', '/api/sources/', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/articles/'] });
      toast({
        title: "Success",
        description: `${variables.name} added successfully`,
      });
      onSourceAdded?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add source. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateUserSourceMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      apiRequest('POST', '/api/user-source-preferences/', { sourceId: id, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/articles/'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update source preference. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reactivateSourceMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => 
      apiRequest('PATCH', `/api/sources/${id}`, { isActive: true }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      toast({
        title: "Success",
        description: "Source reactivated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reactivate source. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Function to handle adding a source
  const handleAddSource = (sourceToAdd: any) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add sources.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if source already exists and is active
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
      reactivateSourceMutation.mutate({ 
        id: inactiveSource.id 
      });
    } else {
      // Add new source
      addSourceMutation.mutate({
        name: sourceToAdd.name,
        url: sourceToAdd.url,
        icon: sourceToAdd.icon,
        color: sourceToAdd.color,
        isActive: true,
      });
    }
  };

  // Function to handle disabling/removing a source
  const handleDisableSource = (sourceId: string, sourceName: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to customize your sources.",
        variant: "destructive",
      });
      return;
    }
    
    // Instead of deleting, we toggle the source to inactive
    updateUserSourceMutation.mutate({ 
      id: sourceId, 
      isActive: false 
    });
    
    toast({
      title: "Source Disabled",
      description: `${sourceName} has been disabled from your feed`,
    });
  };

  // Function to check if a source is already added
  const isSourceAdded = (sourceName: string) => {
    return userSources.some(source => 
      source.name === sourceName && source.isActive
    );
  };

  // Function to check if a source is added but disabled
  const isSourceDisabled = (sourceName: string) => {
    return userSources.some(source => 
      source.name === sourceName && source.isActive === false
    );
  };

  // Get the source ID for a given source name
  const getSourceId = (sourceName: string) => {
    const source = userSources.find(s => s.name === sourceName);
    return source ? source.id : null;
  };

  // Render source card
  const renderSourceCard = (source: any) => {
    const isAdded = isSourceAdded(source.name);
    const isDisabled = isSourceDisabled(source.name);
    const sourceId = getSourceId(source.name);
    const faviconUrl = getFaviconUrl(source.url, 24);
    
    return (
      <div 
        key={source.name}
        className="border border-whatcyber-light-gray/30 rounded-lg p-4 bg-whatcyber-darker hover:bg-whatcyber-gray/50 transition-colors"
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <img 
              src={faviconUrl} 
              alt={`${source.name} icon`}
              className="w-6 h-6 rounded-sm"
              onError={(e) => {
                // Fallback to RSS icon if favicon fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallbackDiv = document.createElement('div');
                  fallbackDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-slate-400"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/></svg>';
                  parent.appendChild(fallbackDiv.firstChild!);
                }
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-100 text-base truncate">{source.name}</h3>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
              {source.description || `Follow threat intelligence from ${source.name}`}
            </p>
          </div>
          {isAdded ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/50"
              onClick={() => sourceId && handleDisableSource(sourceId, source.name)}
              disabled={updateUserSourceMutation.isPending}
              title="Disable source"
            >
              <Minus className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-whatcyber-teal hover:text-whatcyber-teal"
              onClick={() => handleAddSource(source)}
              disabled={addSourceMutation.isPending || updateUserSourceMutation.isPending || reactivateSourceMutation.isPending}
              title="Add source"
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Follow Threat Intel Sources</h1>
          <p className="text-slate-400 mt-1">Discover and follow cybersecurity sources to customize your feed</p>
        </div>
        <Button 
          variant="outline" 
          onClick={onBack}
          className="bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600"
        >
          Back to Feed
        </Button>
      </div>

      {/* Categorized Sources */}
      <div className="space-y-8">
        {/* Vendor & Private Threat Research */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-whatcyber-light-gray/30 pb-2 flex items-center">
            <Plus className="w-5 h-5 text-green-500 mr-2" />
            Vendor & Private Threat Research
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VENDOR_THREAT_RESEARCH.map(renderSourceCard)}
          </div>
        </div>
        
        {/* Government & Agency Alerts */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-whatcyber-light-gray/30 pb-2 flex items-center">
            <Plus className="w-5 h-5 text-green-500 mr-2" />
            Government & Agency Alerts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GOVERNMENT_ALERTS.map(renderSourceCard)}
          </div>
        </div>
        
        {/* Specialized & Malware Focus */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-whatcyber-light-gray/30 pb-2 flex items-center">
            <Plus className="w-5 h-5 text-green-500 mr-2" />
            Specialized & Malware Focus
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MALWARE_RESEARCH.map(renderSourceCard)}
          </div>
        </div>
        
        {/* General Security News */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-whatcyber-light-gray/30 pb-2 flex items-center">
            <Plus className="w-5 h-5 text-green-500 mr-2" />
            General Security News
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GENERAL_SECURITY_NEWS.map(renderSourceCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
