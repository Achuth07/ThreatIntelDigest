import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Eye, ExternalLink, Clock, BookOpen } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Article } from '@shared/schema';

interface ArticleCardProps {
  article: Article & { isBookmarked?: boolean };
  isFeatured?: boolean;
  onReadHere?: (articleUrl: string) => void;
}

export function ArticleCard({ article, isFeatured = false, onReadHere }: ArticleCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBookmarked, setIsBookmarked] = useState(article.isBookmarked || false);

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        return apiRequest('DELETE', `/api/bookmarks/${article.id}`);
      } else {
        return apiRequest('POST', '/api/bookmarks', { articleId: article.id });
      }
    },
    onSuccess: () => {
      setIsBookmarked(!isBookmarked);
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      toast({
        title: isBookmarked ? "Bookmark Removed" : "Article Bookmarked",
        description: isBookmarked ? 
          "Article removed from bookmarks" : 
          "Article saved to bookmarks for later reading",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update bookmark. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getThreatLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-500/20';
      case 'HIGH':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'MEDIUM':
      default:
        return 'text-blue-400 bg-blue-500/20';
    }
  };

  const getSourceIcon = (source: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'Bleeping Computer': <div className="w-6 h-6 bg-red-500 rounded-sm flex items-center justify-center text-white text-sm">!</div>,
      'The Hacker News': <div className="w-6 h-6 bg-orange-500 rounded-sm flex items-center justify-center text-white text-sm">H</div>,
      'Dark Reading': <div className="w-6 h-6 bg-purple-500 rounded-sm flex items-center justify-center text-white text-sm">👁</div>,
      'CrowdStrike Blog': <div className="w-6 h-6 bg-red-600 rounded-sm flex items-center justify-center text-white text-sm">🐦</div>,
      'Unit 42': <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center text-white text-sm">🛡</div>,
      'The DFIR Report': <div className="w-6 h-6 bg-green-600 rounded-sm flex items-center justify-center text-white text-sm">🔍</div>,
    };

    return iconMap[source] || <div className="w-6 h-6 bg-slate-600 rounded-sm flex items-center justify-center text-white text-sm">📰</div>;
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const articleDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - articleDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Card className="bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors group overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getSourceIcon(article.source)}
            <span 
              className="text-sm font-medium text-slate-300" 
              data-testid={`text-source-${article.id}`}
            >
              {article.source}
            </span>
            <Badge 
              className={`text-xs px-2 py-1 rounded-full ${getThreatLevelColor(article.threatLevel)}`}
              data-testid={`badge-threat-level-${article.id}`}
            >
              {article.threatLevel}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <span 
              className="text-sm text-slate-400"
              data-testid={`text-publish-time-${article.id}`}
            >
              {formatTimeAgo(article.publishedAt)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className={`p-1 transition-colors ${
                isBookmarked ? 'text-cyber-cyan' : 'text-slate-400 hover:text-cyber-cyan'
              }`}
              onClick={() => bookmarkMutation.mutate()}
              disabled={bookmarkMutation.isPending}
              data-testid={`button-bookmark-${article.id}`}
              title={isBookmarked ? "Remove bookmark" : "Bookmark article"}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
        
        <h2 className={`font-semibold text-slate-100 mb-3 group-hover:text-cyber-cyan transition-colors line-clamp-2 ${
          isFeatured ? 'text-xl' : 'text-lg'
        }`} data-testid={`text-title-${article.id}`}>
          {article.title}
        </h2>
        
        <p className={`text-slate-300 text-sm leading-relaxed mb-4 ${
          isFeatured ? 'line-clamp-3' : 'line-clamp-2'
        }`} data-testid={`text-summary-${article.id}`}>
          {article.summary}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Eye className="w-4 h-4" />
              <span data-testid={`text-read-time-${article.id}`}>{article.readTime} min read</span>
            </div>
            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center space-x-1">
                {article.tags.slice(0, 3).map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs bg-slate-700 text-slate-300 px-2 py-1"
                    data-testid={`badge-tag-${article.id}-${index}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onReadHere && (
              <Button
                variant="outline"
                size="sm"
                className="text-cyber-cyan border-cyber-cyan hover:bg-cyber-cyan hover:text-slate-900 text-sm font-medium px-3 py-1"
                onClick={() => onReadHere(article.url)}
                data-testid={`button-read-here-${article.id}`}
              >
                <BookOpen className="w-3 h-3 mr-1" />
                Read Here
              </Button>
            )}
            <Button
              variant="link"
              size="sm"
              className="text-slate-400 hover:text-slate-300 text-sm font-medium p-0"
              onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
              data-testid={`button-read-article-${article.id}`}
            >
              Read {isFeatured ? 'Full Article' : 'More'} 
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
