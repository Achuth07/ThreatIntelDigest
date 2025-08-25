import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ArticleContent {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string | null;
  dir: string | null;
  siteName: string | null;
  lang: string | null;
}

interface ArticleViewerProps {
  articleUrl: string | null;
  onClose: () => void;
}

export function ArticleViewer({ articleUrl, onClose }: ArticleViewerProps) {
  const { data: article, isLoading, error } = useQuery<ArticleContent>({
    queryKey: ['article', articleUrl],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/fetch-article?url=${encodeURIComponent(articleUrl!)}`);
      return response.json();
    },
    enabled: !!articleUrl,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const estimateReadTime = (text: string) => {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };

  return (
    <Sheet open={!!articleUrl} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="bg-slate-900 border-slate-700 overflow-y-auto"
        style={{
          width: '70vw',
          maxWidth: '70vw',
          minWidth: '600px'
        }}
      >
        <SheetHeader className="border-b border-slate-700 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 p-2"
              data-testid="button-close-article-viewer"
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              {articleUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(articleUrl, '_blank', 'noopener,noreferrer')}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                  data-testid="button-open-original"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open Original
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 bg-slate-700" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-slate-700" />
                <Skeleton className="h-4 w-5/6 bg-slate-700" />
                <Skeleton className="h-4 w-4/5 bg-slate-700" />
              </div>
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full bg-slate-700" />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                Failed to Load Article
              </h3>
              <p className="text-slate-400 max-w-md mb-4">
                {(error as any)?.message || 
                 'Unable to fetch the article content. The article may be behind a paywall or the website may be blocking automated requests.'}
              </p>
              {articleUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(articleUrl, '_blank', 'noopener,noreferrer')}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Read on Original Site
                </Button>
              )}
            </div>
          )}

          {article && (
            <article className="space-y-6">
              <header className="space-y-4">
                <SheetTitle className="text-2xl font-bold text-slate-100 leading-tight">
                  {article.title}
                </SheetTitle>
                
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  {article.byline && (
                    <span>By {article.byline}</span>
                  )}
                  {article.siteName && (
                    <span>• {article.siteName}</span>
                  )}
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{estimateReadTime(article.textContent)} min read</span>
                  </div>
                </div>

                {article.excerpt && (
                  <p className="text-slate-300 text-lg leading-relaxed italic border-l-4 border-cyber-cyan pl-4">
                    {article.excerpt}
                  </p>
                )}
              </header>

              <div 
                className="prose prose-invert prose-slate max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-a:text-cyber-cyan prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-200 prose-em:text-slate-300 prose-blockquote:border-l-cyber-cyan prose-blockquote:text-slate-300 prose-code:text-cyber-cyan prose-code:bg-slate-800 prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700"
                dangerouslySetInnerHTML={{ __html: article.content }}
                data-testid="article-content"
              />
            </article>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}