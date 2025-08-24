import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { RSS_SOURCES } from '@/lib/rss-sources';
import type { InsertRssSource, RssSource } from '@shared/schema';

interface BuiltInSourcesDropdownProps {
  className?: string;
}

export function BuiltInSourcesDropdown({ className }: BuiltInSourcesDropdownProps) {
  const [selectedSourceName, setSelectedSourceName] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get existing sources to check which built-in sources are already added
  const { data: existingSources = [] } = useQuery<RssSource[]>({
    queryKey: ['/api/sources'],
  });

  const addSourceMutation = useMutation({
    mutationFn: (data: InsertRssSource) => apiRequest('POST', '/api/sources', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      toast({
        title: "Success",
        description: `${selectedSourceName} added successfully`,
      });
      setSelectedSourceName('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add source. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddSource = () => {
    const selectedSource = RSS_SOURCES.find(source => source.name === selectedSourceName);
    if (!selectedSource) {
      toast({
        title: "Error",
        description: "Please select a source to add",
        variant: "destructive",
      });
      return;
    }

    // Check if source already exists
    const sourceExists = existingSources.some(existing => 
      existing.name === selectedSource.name || existing.url === selectedSource.url
    );

    if (sourceExists) {
      toast({
        title: "Source Already Added",
        description: `${selectedSource.name} is already in your sources list`,
        variant: "destructive",
      });
      return;
    }

    addSourceMutation.mutate({
      name: selectedSource.name,
      url: selectedSource.url,
      icon: selectedSource.icon,
      color: selectedSource.color,
      isActive: true,
    });
  };

  // Get available sources (not already added)
  const availableSources = RSS_SOURCES.filter(source => 
    !existingSources.some(existing => 
      existing.name === source.name || existing.url === source.url
    )
  );

  if (availableSources.length === 0) {
    return (
      <div className={`flex items-center justify-center p-3 text-sm text-slate-400 bg-slate-700/50 rounded-lg ${className}`}>
        <Check className="w-4 h-4 mr-2" />
        All built-in sources added
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <Select value={selectedSourceName} onValueChange={setSelectedSourceName}>
          <SelectTrigger className="flex-1 bg-slate-700 border-slate-600 text-slate-100">
            <SelectValue placeholder="Select a built-in source..." />
          </SelectTrigger>
          <SelectContent>
            {availableSources.map((source) => (
              <SelectItem key={source.name} value={source.name}>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: source.color }}
                  />
                  <span>{source.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          size="sm"
          onClick={handleAddSource}
          disabled={!selectedSourceName || addSourceMutation.isPending}
          className="bg-cyber-blue hover:bg-blue-700 px-3"
          data-testid="button-add-built-in-source"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {selectedSourceName && (
        <div className="text-xs text-slate-400">
          {RSS_SOURCES.find(s => s.name === selectedSourceName)?.url}
        </div>
      )}
    </div>
  );
}