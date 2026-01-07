import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { ShareButton } from '@/components/share-button';

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
        className="bg-slate-900 border-slate-700 overflow-y-auto p-4 sm:p-6 [&>button]:hidden"
        style={{
          width: 'var(--sheet-width)',
          maxWidth: 'var(--sheet-max-width)',
          minWidth: 'var(--sheet-min-width)',
        }}
      >
        <style>
          {`
            :root {
              --sheet-width: clamp(300px, 90vw, 70vw);
              --sheet-max-width: 70vw;
              --sheet-min-width: 300px;
            }
            
            @media (min-width: 640px) {
              :root {
                --sheet-min-width: 600px;
              }
            }
            
            @media (max-width: 768px) {
              .sheet-content-mobile {
                width: 100vw !important;
                max-width: 100vw !important;
                min-width: 100vw !important;
              }
            }
          `}
        </style>
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
              {article && articleUrl && (
                <ShareButton
                  articleUrl={articleUrl}
                  articleTitle={article.title}
                  className="text-slate-400 hover:text-slate-100"
                />
              )}
              {articleUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(articleUrl, '_blank', 'noopener,noreferrer')}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700 text-xs sm:text-sm"
                  data-testid="button-open-original"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  <span className="hidden xs:inline">Open Original</span>
                  <span className="xs:hidden">Open</span>
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4 bg-slate-700" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-slate-700" />
                <Skeleton className="h-4 w-5/6 bg-slate-700" />
                <Skeleton className="h-4 w-4/5 bg-slate-700" />
              </div>
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full bg-slate-700" />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                Failed to Load Article
              </h3>
              <p className="text-slate-400 text-sm sm:text-base max-w-md mb-4">
                {articleUrl?.includes('checkpoint.com')
                  ? 'Checkpoint Research articles are often protected and cannot be accessed directly. Please read the article on the Checkpoint website.'
                  : (error as any)?.message === 'Access denied - the website may be blocking automated requests'
                    ? 'This website is blocking automated access to its content. Please read the article directly on the original site.'
                    : (error as any)?.message ||
                    'Unable to fetch the article content. The article may be behind a paywall or the website may be blocking automated requests.'}
              </p>
              {articleUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(articleUrl, '_blank', 'noopener,noreferrer')}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700 text-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Read on Original Site
                </Button>
              )}
            </div>
          )}

          {article && (
            <article className="space-y-6">
              <header className="space-y-3">
                <SheetTitle className="text-xl sm:text-2xl font-bold text-slate-100 leading-tight">
                  {article.title}
                </SheetTitle>

                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-400">
                  {article.byline && (
                    <span>By {article.byline}</span>
                  )}
                  {article.siteName && (
                    <span className="hidden sm:inline">• {article.siteName}</span>
                  )}
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{estimateReadTime(article.textContent)} min read</span>
                  </div>
                </div>

                {article.excerpt && (
                  <p className="text-slate-300 text-base sm:text-lg leading-relaxed italic border-l-4 border-cyber-cyan pl-4">
                    {article.excerpt}
                  </p>
                )}
              </header>

              <div
                className="prose prose-invert prose-slate max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-a:text-cyber-cyan prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-200 prose-em:text-slate-300 prose-blockquote:border-l-cyber-cyan prose-blockquote:text-slate-300 prose-code:text-cyber-cyan prose-code:bg-slate-800 prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700 prose-img:rounded-lg prose-img:w-full prose-img:h-auto"
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