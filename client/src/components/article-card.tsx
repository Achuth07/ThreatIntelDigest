import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Eye, ExternalLink, Clock, BookOpen } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getAuthenticatedUser } from '@/lib/auth';
import { getFaviconUrl } from '@/lib/favicon-utils';
import type { ArticleWithSource } from '@shared/schema';
import { ShareButton } from '@/components/share-button';

interface ArticleCardProps {
  article: ArticleWithSource;
  isFeatured?: boolean;
  onReadHere?: (articleUrl: string) => void;
}

export function ArticleCard({ article, isFeatured = false, onReadHere }: ArticleCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBookmarked, setIsBookmarked] = useState(article.isBookmarked || false);

  // Update local state when article prop changes
  useEffect(() => {
    setIsBookmarked(article.isBookmarked || false);
  }, [article.isBookmarked]);

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const user = getAuthenticatedUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      if (isBookmarked) {
        // Use path parameter for DELETE request for better compatibility
        return apiRequest('DELETE', `/api/bookmarks/${article.id}`);
      } else {
        return apiRequest('POST', '/api/bookmarks', { articleId: article.id });
      }
    },
    onSuccess: () => {
      setIsBookmarked(!isBookmarked);
      // Invalidate all queries related to bookmarks to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      // Also invalidate articles query to update bookmark status in article list
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      toast({
        title: isBookmarked ? "Bookmark Removed" : "Article Bookmarked",
        description: isBookmarked ?
          "Article removed from bookmarks" :
          "Article saved to bookmarks for later reading",
      });
    },
    onError: (error: any) => {
      if (error.message === 'Authentication required') {
        toast({
          title: "Authentication Required",
          description: "Please log in to bookmark articles",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update bookmark. Please try again.",
          variant: "destructive",
        });
      }
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
    <Card className="glass-card border border-whatcyber-light-gray/20 hover:border-whatcyber-teal/30 transition-all duration-300 group hover:shadow-lg hover:shadow-whatcyber-teal/5">
      <div className="p-4 lg:p-6 flex flex-col min-h-0">
        <div className="flex items-start justify-between mb-3 lg:mb-4">
          <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <img
                src={getFaviconUrl(article.sourceUrl, 32)}
                alt={`${article.source} favicon`}
                className="w-6 h-6 rounded-sm"
                onError={(e) => {
                  // Fallback to generic RSS icon if favicon fails to load
                  e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/></svg>')}`;
                }}
              />
            </div>
            <span
              className="text-xs lg:text-sm font-medium text-slate-300 truncate"
              data-testid={`text-source-${article.id}`}
            >
              {article.source}
            </span>
            <Badge
              className={`text-xs px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full flex-shrink-0 ${getThreatLevelColor(article.threatLevel)}`}
              data-testid={`badge-threat-level-${article.id}`}
            >
              {article.threatLevel}
            </Badge>
          </div>
          <div className="flex items-center space-x-1 lg:space-x-2 flex-shrink-0 ml-2">
            <span
              className="text-xs lg:text-sm text-slate-400 hidden sm:block"
              data-testid={`text-publish-time-${article.id}`}
            >
              {formatTimeAgo(article.publishedAt)}
            </span>
            <ShareButton
              articleUrl={article.url}
              articleTitle={article.title}
              className="text-slate-400 hover:text-whatcyber-teal transition-colors"
            />
            <Button
              variant="ghost"
              size="sm"
              className={`p-1.5 lg:p-1 transition-colors touch-manipulation ${isBookmarked ? 'text-whatcyber-teal' : 'text-slate-400 hover:text-whatcyber-teal'
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

        {/* Mobile time display */}
        <div className="sm:hidden mb-2">
          <span
            className="text-xs text-slate-400"
            data-testid={`text-publish-time-mobile-${article.id}`}
          >
            {formatTimeAgo(article.publishedAt)}
          </span>
        </div>

        <h2 className={`font-semibold text-slate-100 mb-2 lg:mb-3 group-hover:text-whatcyber-teal transition-colors line-clamp-2 ${isFeatured ? 'text-lg lg:text-xl' : 'text-base lg:text-lg'
          }`} data-testid={`text-title-${article.id}`}>
          {article.title}
        </h2>

        <p className={`text-slate-300 text-sm leading-relaxed mb-3 lg:mb-4 ${isFeatured ? 'line-clamp-3' : 'line-clamp-2'
          }`} data-testid={`text-summary-${article.id}`}>
          {article.summary}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-auto pt-2">
          <div className="flex items-center gap-3 min-w-0 max-w-full">
            <div className="flex items-center gap-1.5 text-xs lg:text-sm text-slate-400 flex-shrink-0">
              <Eye className="w-3 lg:w-4 h-3 lg:h-4" />
              <span data-testid={`text-read-time-${article.id}`}>{article.readTime} min read</span>
            </div>
            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto min-w-0 no-scrollbar">
                {article.tags.slice(0, 2).map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs bg-slate-700 text-slate-300 px-1.5 lg:px-2 py-0.5 flex-shrink-0"
                    data-testid={`badge-tag-${article.id}-${index}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {onReadHere && (
              <Button
                variant="outline"
                size="sm"
                className="text-whatcyber-teal border-whatcyber-teal hover:bg-whatcyber-teal hover:text-whatcyber-dark text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 touch-manipulation h-8"
                onClick={() => onReadHere(article.url)}
                data-testid={`button-read-here-${article.id}`}
              >
                <BookOpen className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Read Here</span>
                <span className="sm:hidden">Read</span>
              </Button>
            )}
            <Button
              variant="link"
              size="sm"
              className="text-slate-400 hover:text-slate-300 text-xs lg:text-sm font-medium p-0 touch-manipulation h-8"
              onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
              data-testid={`button-read-article-${article.id}`}
            >
              <span className="hidden sm:inline">{isFeatured ? 'Full Article' : 'More'}</span>
              <span className="sm:hidden">View</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}