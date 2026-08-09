import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { FeedsSidebar, guestSources } from '@/components/layout/sidebars/feeds-sidebar';
import { ArticleCard } from '@/components/article-card';
import { ArticleViewer } from '@/components/article-viewer';
import { FollowSourcesView } from '@/components/follow-sources-view';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, Clock } from 'lucide-react';
import { getAuthenticatedUser } from '@/lib/auth';
import { SEO } from '@/components/seo';
import type { Article, Bookmark, RssSource } from '@shared/schema';

type FeedView = 'feed' | 'bookmarks' | 'follow';

function viewFromParams(params: URLSearchParams): FeedView {
  const view = params.get('view');
  if (view === 'bookmarks') return 'bookmarks';
  if (view === 'follow' || view === 'followSources') return 'follow';
  return 'feed';
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();

  const urlParams = new URLSearchParams(searchString || window.location.search);
  const [selectedSource, setSelectedSource] = useState(urlParams.get('source') || 'all');
  const [searchQuery, setSearchQuery] = useState(urlParams.get('search') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [timeFilter, setTimeFilter] = useState('all');
  const [threatFilters, setThreatFilters] = useState(['CRITICAL', 'HIGH', 'MEDIUM']);
  const [view, setView] = useState<FeedView>(viewFromParams(urlParams));
  const [page, setPage] = useState(0);
  const [selectedArticleUrl, setSelectedArticleUrl] = useState<string | null>(null);
  const ARTICLES_PER_PAGE = 10;

  const user = getAuthenticatedUser();

  // The CVE list moved to its own tab; keep old links working.
  useEffect(() => {
    const params = new URLSearchParams(searchString || window.location.search);
    const v = params.get('view');
    if (v === 'cve' || v === 'cveList') {
      setLocation('/vulnerabilities');
    }
  }, [location, searchString, setLocation]);

  // Fetch user sources (Follow Sources view needs them)
  const { data: fetchedSources = [] } = useQuery<RssSource[]>({
    queryKey: ['/api/sources'],
    enabled: !user?.isGuest,
  });
  const userSources: RssSource[] = user?.isGuest ? guestSources() : fetchedSources;

  const showBookmarks = view === 'bookmarks';

  // Fetch articles
  const { data: articles = [], isLoading: articlesLoading } = useQuery<
    (Article & { isBookmarked?: boolean })[]
  >({
    queryKey: [
      '/api/articles',
      {
        source: selectedSource === 'all' ? undefined : selectedSource,
        search: searchQuery,
        sortBy,
        limit: showBookmarks ? '1000' : ARTICLES_PER_PAGE,
        offset: page * (showBookmarks ? 1000 : ARTICLES_PER_PAGE),
        threatLevels: threatFilters.length === 3 ? undefined : threatFilters.join(','),
      },
    ],
  });

  // Fetch bookmarks
  const { data: bookmarks = [], refetch: refetchBookmarks } = useQuery<Bookmark[]>({
    queryKey: ['/api/bookmarks'],
    enabled: !!user && !!user.token,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch bookmarked articles when in bookmarks view
  const { data: bookmarkedArticles = [] } = useQuery<any[]>({
    queryKey: ['/api/bookmarks', { withArticles: true }],
    enabled: !!user && !!user.token && showBookmarks,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (user && user.token && showBookmarks) {
      refetchBookmarks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBookmarks]);

  // Sync state with URL parameters
  useEffect(() => {
    const params = new URLSearchParams(searchString || window.location.search);
    const source = params.get('source');
    const search = params.get('search');

    setView(viewFromParams(params));
    if (source) {
      setSelectedSource(source);
    } else if (!params.get('view') && !search) {
      setSelectedSource('all');
    }
    if (search) {
      setSearchQuery(search);
    }
    setPage(0);
  }, [location, searchString]);

  const handleSourceSelect = (source: string) => {
    setView('feed');
    setSelectedSource(source);
    setSearchQuery('');
    setPage(0);
  };

  const handleTimeFilterChange = (filter: string) => {
    setTimeFilter(filter);
    setPage(0);
  };

  const handleThreatFilterChange = (filters: string[]) => {
    setThreatFilters(filters);
    setPage(0);
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    setPage(0);
  };

  const handleNextPage = () => {
    setPage((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousPage = () => {
    if (page > 0) {
      setPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Time filter applies client-side
  const filteredArticles = articles.filter((article) => {
    if (timeFilter === 'all') return true;
    const now = new Date();
    const articleDate = new Date(article.publishedAt);
    const diffInDays = Math.floor((now.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24));
    switch (timeFilter) {
      case 'today':
        return diffInDays <= 0;
      case 'week':
        return diffInDays <= 7;
      case 'month':
        return diffInDays <= 30;
      default:
        return true;
    }
  });

  const displayArticles = showBookmarks
    ? (bookmarkedArticles as any[]).map((item) => ({ ...item.article, isBookmarked: true }))
    : filteredArticles;

  const lastUpdated = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const seoProps = {
    title: 'Live Cybersecurity News Feed | WhatCyber',
    description:
      'Your live, aggregated feed of the latest cybersecurity news. Stay updated on vulnerabilities, threat intel, and breaking stories from around the web.',
    keywords:
      'cybersecurity news, threat intelligence, vulnerability feed, security alerts, cyber threats, security updates',
  };

  return (
    <AppShell
      activeTab="feeds"
      sidebar={
        <FeedsSidebar
          selectedSource={selectedSource}
          onSourceSelect={handleSourceSelect}
          timeFilter={timeFilter}
          onTimeFilterChange={handleTimeFilterChange}
          threatFilters={threatFilters}
          onThreatFilterChange={handleThreatFilterChange}
          activeView={view}
        />
      }
    >
      <SEO {...seoProps} />

      {view === 'follow' ? (
        <FollowSourcesView userSources={userSources} onBack={() => setLocation('/threatfeed')} />
      ) : (
        <div className="mx-auto max-w-4xl p-4 lg:p-8">
          {/* Content Header */}
          <div className="mb-6 flex flex-col justify-between space-y-4 lg:flex-row lg:items-center lg:space-y-0">
            <div>
              <h1
                className="mb-1 font-display text-xl font-bold text-slate-100 lg:text-2xl"
                data-testid="text-page-title"
              >
                {showBookmarks ? 'Bookmarked Articles' : 'Latest Threat Intelligence'}
              </h1>
              <p className="text-sm text-slate-400 lg:text-base" data-testid="text-page-description">
                {showBookmarks
                  ? user
                    ? 'Your saved articles for later reading'
                    : 'Please log in to view your bookmarks'
                  : 'Stay updated with the latest cybersecurity threats and vulnerabilities'}
              </p>
            </div>
            <div className="flex flex-col items-start space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
              <div className="flex items-center space-x-2 font-mono text-xs text-slate-400">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span data-testid="text-last-updated">Updated {lastUpdated}</span>
              </div>
              {!showBookmarks && (
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger
                    className="h-9 w-full bg-card sm:w-auto"
                    data-testid="select-sort"
                    aria-label="Sort articles"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="relevance">Most Relevant</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Loading State */}
          {articlesLoading && (
            <div className="grid gap-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-6 w-6 rounded-sm" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="mb-3 h-6 w-full" />
                  <Skeleton className="mb-2 h-4 w-full" />
                  <Skeleton className="mb-4 h-4 w-3/4" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-20" />
                      <div className="flex space-x-1">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Articles */}
          {!articlesLoading && (
            <>
              {showBookmarks && !user ? (
                <div className="py-12 text-center">
                  <div className="mb-2 text-lg text-slate-400" data-testid="text-no-articles">
                    Please log in to view your bookmarks
                  </div>
                  <p className="text-sm text-slate-500" data-testid="text-no-articles-description">
                    Your bookmarked articles will appear here once you log in
                  </p>
                </div>
              ) : displayArticles.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-2 text-lg text-slate-400" data-testid="text-no-articles">
                    {showBookmarks
                      ? 'No bookmarked articles yet'
                      : searchQuery
                        ? 'No articles found matching your search'
                        : 'No articles available'}
                  </div>
                  <p className="text-sm text-slate-500" data-testid="text-no-articles-description">
                    {showBookmarks
                      ? 'Bookmark articles to read them later'
                      : searchQuery
                        ? 'Try adjusting your search terms or filters'
                        : 'Articles will appear here once feeds are loaded. Try adjusting your Time range filter.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-5">
                  {displayArticles.map((article, index) => (
                    <ArticleCard
                      key={article.id}
                      article={{
                        ...article,
                        isBookmarked: showBookmarks
                          ? true
                          : bookmarks.some((bookmark) => bookmark.articleId === article.id),
                      }}
                      isFeatured={index === 0 && !showBookmarks && !searchQuery}
                      onReadHere={setSelectedArticleUrl}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!showBookmarks && displayArticles.length > 0 && (
                <div className="mt-8 flex items-center justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={handlePreviousPage}
                    disabled={page === 0}
                    data-testid="button-previous-page"
                  >
                    <ChevronDown className="mr-2 h-4 w-4 rotate-90" />
                    Previous
                  </Button>
                  <span className="font-mono text-sm text-slate-400">Page {page + 1}</span>
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={displayArticles.length < ARTICLES_PER_PAGE}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronDown className="ml-2 h-4 w-4 -rotate-90" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ArticleViewer articleUrl={selectedArticleUrl} onClose={() => setSelectedArticleUrl(null)} />
    </AppShell>
  );
}
