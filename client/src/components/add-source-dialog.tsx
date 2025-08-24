import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { InsertRssSource } from '@shared/schema';

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSourceDialog({ open, onOpenChange }: AddSourceDialogProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('fas fa-rss');
  const [color, setColor] = useState('#6366f1');
  const [isActive, setIsActive] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createSourceMutation = useMutation({
    mutationFn: (data: InsertRssSource) => apiRequest('POST', '/api/sources', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      toast({
        title: "Success",
        description: "RSS source added successfully",
      });
      // Reset form
      setName('');
      setUrl('');
      setIcon('fas fa-rss');
      setColor('#6366f1');
      setIsActive(true);
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add RSS source. Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !url.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createSourceMutation.mutate({
      name: name.trim(),
      url: url.trim(),
      icon,
      color,
      isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Add New RSS Source</DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a new cybersecurity RSS feed to aggregate threat intelligence
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-200">Source Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Bleeping Computer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-700 border-slate-600 text-slate-100"
              data-testid="input-source-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="url" className="text-slate-200">RSS Feed URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/rss"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-slate-700 border-slate-600 text-slate-100"
              data-testid="input-source-url"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon" className="text-slate-200">Icon Class</Label>
              <Input
                id="icon"
                type="text"
                placeholder="fas fa-rss"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="bg-slate-700 border-slate-600 text-slate-100"
                data-testid="input-source-icon"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color" className="text-slate-200">Color</Label>
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="bg-slate-700 border-slate-600 h-10"
                data-testid="input-source-color"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
              data-testid="switch-source-active"
            />
            <Label htmlFor="active" className="text-slate-200">Active</Label>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-slate-100"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createSourceMutation.isPending}
            className="bg-cyber-blue hover:bg-blue-700"
            data-testid="button-add-source-submit"
          >
            {createSourceMutation.isPending ? 'Adding...' : 'Add Source'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}