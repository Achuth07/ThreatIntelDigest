import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getFaviconUrl } from '@/lib/favicon-utils';
import { VENDOR_THREAT_RESEARCH, GOVERNMENT_ALERTS, MALWARE_RESEARCH, GENERAL_SECURITY_NEWS } from '@/lib/rss-sources';
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

  // Fetch ALL available sources from the system (not filtered by user preferences)
  const { data: allAvailableSources = [] } = useQuery<RssSource[]>({
    queryKey: ['/api/sources', { all: 'true' }],
    queryFn: async () => {
      // Fetch all sources using the all=true parameter
      const response = await apiRequest('GET', '/api/sources?all=true');
      return response.json();
    },
  });

  const createSourceMutation = useMutation({
    mutationFn: (newSource: any) =>
      apiRequest('POST', '/api/sources', {
        name: newSource.name,
        url: newSource.url,
        icon: newSource.icon,
        color: newSource.color,
        isActive: true
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create new source. Please try again.";

      // The error from apiRequest is in the format "statusCode: jsonBody"
      // Try to parse the JSON body to get the actual error message
      try {
        if (error?.message) {
          const parts = error.message.split(': ');
          if (parts.length > 1) {
            // Try to parse the JSON part
            const jsonPart = parts.slice(1).join(': '); // Rejoin in case the message contains colons
            const errorData = JSON.parse(jsonPart);
            if (errorData?.error) {
              errorMessage = errorData.error;
            } else if (errorData?.message) {
              errorMessage = errorData.message;
            }
          }
        }
      } catch (e) {
        // If we can't parse the error, use the default message
        console.error('Error parsing error message:', e);
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateUserSourceMutation = useMutation({
    mutationFn: ({ sourceId, isActive }: { sourceId: string; isActive: boolean }) =>
      apiRequest('POST', '/api/user-source-preferences/', { sourceId, isActive }),
    onSuccess: () => {
      // Force refetch of sources to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update source preference. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Function to handle adding a source (enabling it for the user)
  const handleAddSource = async (sourceToAdd: any) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add sources.",
        variant: "destructive",
      });
      return;
    }

    if (user.isGuest) {
      toast({
        title: "Authentication Required",
        description: "Login to Follow more sources and personalize your experiences.",
      });
      return;
    }

    // Find the source in ALL available sources (not just user's current sources)
    let existingSource = allAvailableSources.find(source =>
      source.name === sourceToAdd.name || source.url === sourceToAdd.url
    );

    try {
      let sourceId: string;

      if (existingSource) {
        // Source exists in the system
        sourceId = existingSource.id;
      } else {
        // Source doesn't exist, create it first
        const response = await createSourceMutation.mutateAsync(sourceToAdd);
        const newSource = await response.json();
        sourceId = newSource.id;
      }

      // Enable the source for this user
      updateUserSourceMutation.mutate({
        sourceId: sourceId,
        isActive: true
      });

      toast({
        title: "Source Added",
        description: `${sourceToAdd.name} has been added to your feed`,
      });
    } catch (error) {
      console.error("Error adding source:", error);
      // Error is handled by mutation callbacks
    }
  };

  // Function to handle disabling/removing a source (disabling it for the user)
  const handleDisableSource = (sourceId: string, sourceName: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to customize your sources.",
        variant: "destructive",
      });
      return;
    }

    // Instead of deleting, we toggle the source to inactive for this user only
    updateUserSourceMutation.mutate({
      sourceId: sourceId,
      isActive: false
    });

    toast({
      title: "Source Disabled",
      description: `${sourceName} has been disabled from your feed`,
    });
  };

  // Function to check if a source is already added (enabled) for this user
  const isSourceAdded = (sourceName: string) => {
    // We need to check against userSources which contains the user's enabled sources
    const source = userSources.find(source => source.name === sourceName);
    return source ? source.isActive !== false : false;
  };

  // Render source card
  const renderSourceCard = (source: any) => {
    const isAdded = isSourceAdded(source.name);
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
              onClick={() => {
                const sourceItem = userSources.find((s: RssSource) => s.name === source.name);
                if (sourceItem) {
                  handleDisableSource(sourceItem.id, sourceItem.name);
                }
              }}
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
              disabled={updateUserSourceMutation.isPending || createSourceMutation.isPending}
              title="Add source"
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Group sources by category
  const allSources = [
    ...VENDOR_THREAT_RESEARCH,
    ...GOVERNMENT_ALERTS,
    ...MALWARE_RESEARCH,
    ...GENERAL_SECURITY_NEWS
  ];

  // Group sources by category for display
  const categorizedSources = {
    'Vendor Threat Research': VENDOR_THREAT_RESEARCH,
    'Government Alerts': GOVERNMENT_ALERTS,
    'Malware Research': MALWARE_RESEARCH,
    'General Security News': GENERAL_SECURITY_NEWS
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-100">Follow Sources</h2>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      <p className="text-slate-400 mb-6">
        Select sources to follow for personalized threat intelligence feeds.
        Your selections are private and only affect your view.
      </p>

      <div className="space-y-8">
        {Object.entries(categorizedSources).map(([category, sources]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
              <span className="bg-whatcyber-teal w-2 h-2 rounded-full mr-2"></span>
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sources.map(renderSourceCard)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}