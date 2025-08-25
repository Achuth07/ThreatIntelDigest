import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { RSS_SOURCES } from '@/lib/rss-sources';
import type { InsertRssSource, RssSource } from '@shared/schema';

interface AddSourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSourcesDialog({ open, onOpenChange }: AddSourcesDialogProps) {
  // Built-in sources state
  const [selectedSourceName, setSelectedSourceName] = useState<string>('');
  
  // Custom source state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('fas fa-rss');
  const [color, setColor] = useState('#6366f1');
  const [isActive, setIsActive] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get existing sources to check which built-in sources are already added
  const { data: existingSources = [] } = useQuery<RssSource[]>({
    queryKey: ['/api/sources'],
  });

  const addSourceMutation = useMutation({
    mutationFn: (data: InsertRssSource) => apiRequest('POST', '/api/sources', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      toast({
        title: "Success",
        description: `${variables.name} added successfully`,
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add source. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedSourceName('');
    setName('');
    setUrl('');
    setIcon('fas fa-rss');
    setColor('#6366f1');
    setIsActive(true);
  };

  const handleAddBuiltInSource = () => {
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

  const handleAddCustomSource = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !url.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addSourceMutation.mutate({
      name: name.trim(),
      url: url.trim(),
      icon,
      color,
      isActive,
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Get available sources (not already added)
  const availableSources = RSS_SOURCES.filter(source => 
    !existingSources.some(existing => 
      existing.name === source.name || existing.url === source.url
    )
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Add RSS Source</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="builtin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-700">
            <TabsTrigger value="builtin" className="text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-slate-100">
              Built-in Sources
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-slate-100">
              Custom Source
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="builtin" className="space-y-4">
            {availableSources.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-sm text-slate-400 bg-slate-700/50 rounded-lg">
                <Check className="w-4 h-4 mr-2" />
                All built-in sources already added
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Select a built-in source</Label>
                  <Select value={selectedSourceName} onValueChange={setSelectedSourceName}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Choose from pre-configured sources..." />
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
                </div>
                
                {selectedSourceName && (
                  <div className="text-xs text-slate-400 p-2 bg-slate-700/50 rounded">
                    URL: {RSS_SOURCES.find(s => s.name === selectedSourceName)?.url}
                  </div>
                )}
                
                <Button
                  onClick={handleAddBuiltInSource}
                  disabled={!selectedSourceName || addSourceMutation.isPending}
                  className="w-full bg-cyber-blue hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addSourceMutation.isPending ? 'Adding...' : 'Add Source'}
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="custom" className="space-y-4">
            <form onSubmit={handleAddCustomSource} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Source Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Security News Blog"
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="url" className="text-slate-300">RSS URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon" className="text-slate-300">Icon Class</Label>
                  <Input
                    id="icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="fas fa-rss"
                    className="bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="color" className="text-slate-300">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="bg-slate-700 border-slate-600 h-10 w-full"
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={addSourceMutation.isPending}
                className="w-full bg-cyber-blue hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {addSourceMutation.isPending ? 'Adding...' : 'Add Custom Source'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}