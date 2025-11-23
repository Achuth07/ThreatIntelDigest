import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { ArticleCard } from '@/components/article-card';
import { ArticleViewer } from '@/components/article-viewer';
import { CVEList } from '@/components/cve-list';
import { FollowSourcesView } from '@/components/follow-sources-view';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getAuthenticatedUser } from '@/lib/auth';
import { SEO } from '@/components/seo';
import type { Article, Bookmark, RssSource } from '@shared/schema';
import { RSS_SOURCES } from '@/lib/rss-sources';
import { Helmet } from "react-helmet-async";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [selectedSource, setSelectedSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [timeFilter, setTimeFilter] = useState('all');
  const [threatFilters, setThreatFilters] = useState(['CRITICAL', 'HIGH', 'MEDIUM']);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showVulnerabilities, setShowVulnerabilities] = useState(false);
  const [showFollowSources, setShowFollowSources] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedArticleUrl, setSelectedArticleUrl] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const ARTICLES_PER_PAGE = 10;

  // Get authenticated user
  const user = getAuthenticatedUser();
  console.log('Home component - User:', user);

  // Fetch user sources
  // Fetch user sources
  const { data: fetchedSources = [] } = useQuery<RssSource[]>({
    queryKey: ['/api/sources'],
    // Ensure cache is invalidated when sources change
    staleTime: 0,
    // Disable fetching for guest users to prevent loading all sources
    enabled: !user?.isGuest
  });

  // Determine effective user sources (handle guest logic)
  let userSources: RssSource[] = fetchedSources;

  if (user?.isGuest) {
    const defaultGuestSourceNames = [
      "Microsoft Security Blog",
      "Palo Alto Unit 42",
      "CrowdStrike Blog",
      "US-Cert (Alerts)",
      "Bleeping Computer"
    ];

    userSources = RSS_SOURCES.filter(source =>
      defaultGuestSourceNames.includes(source.name)
    ).map((source, index) => ({
      ...source,
      id: `guest-source-${index}`,
      isActive: true,
      userId: 'guest',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastFetched: null
    })) as unknown as RssSource[];
  }

  // Fetch articles
  const { data: articles = [], isLoading: articlesLoading, refetch: refetchArticles } = useQuery<(Article & { isBookmarked?: boolean })[]>({
    queryKey: ['/api/articles', {
      source: selectedSource === 'all' ? undefined : selectedSource,
      search: searchQuery,
      sortBy,
      limit: showBookmarks ? '1000' : ARTICLES_PER_PAGE, // Increase limit significantly when viewing bookmarks
      offset: page * (showBookmarks ? 1000 : ARTICLES_PER_PAGE),
    }],
  });

  // Fetch bookmarks with automatic refetching
  const { data: bookmarks = [], refetch: refetchBookmarks, isLoading: bookmarksLoading, error: bookmarksError } = useQuery<Bookmark[]>({
    queryKey: ['/api/bookmarks'],
    enabled: !!user && !!user.token, // Only fetch bookmarks if user is authenticated and has a token
    // Refetch bookmarks every 30 seconds to ensure count is accurate
    refetchInterval: 30000,
    // Also refetch on window focus
    refetchOnWindowFocus: true,
    // Disable caching to ensure we always get fresh data
    staleTime: 0,
  });

  // Fetch bookmarked articles when in bookmarks view
  const { data: bookmarkedArticles = [], isLoading: bookmarkedArticlesLoading } = useQuery<any[]>({
    queryKey: ['/api/bookmarks', { withArticles: true }],
    enabled: !!user && !!user.token && showBookmarks, // Only fetch when user is authenticated and viewing bookmarks
    staleTime: 0,
  });
  console.log('Home component - Bookmarks:', bookmarks, 'Loading:', bookmarksLoading, 'Error:', bookmarksError, 'User:', user);

  // Refetch bookmarks when user changes
  useEffect(() => {
    if (user && user.token) {
      console.log('User authenticated, refetching bookmarks');
      refetchBookmarks();
    }
  }, [user, refetchBookmarks]);

  // Auto-fetch feeds on component mount
  const fetchFeedsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/fetch-feeds'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      // Also refetch bookmarks to ensure count is accurate after feed fetch
      if (user) {
        refetchBookmarks();
      }
    },
    onError: (error) => {
      console.error('Failed to fetch feeds:', error);
      // Don't show error toast on initial load failure
    },
  });

  // Auto-fetch feeds when component mounts
  useEffect(() => {
    fetchFeedsMutation.mutate();
  }, []);

  // Refetch bookmarks when user changes or when showBookmarks changes
  useEffect(() => {
    if (user && user.token) {
      console.log('User or bookmarks view changed, refetching bookmarks');
      refetchBookmarks();
    }
  }, [user, showBookmarks, refetchBookmarks]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(0); // Reset pagination when searching
  };

  const handleSourceSelect = (source: string) => {
    // Exit bookmark page when selecting a source
    if (showBookmarks) {
      setShowBookmarks(false);
    }
    // Exit vulnerabilities page when selecting a source
    if (showVulnerabilities) {
      setShowVulnerabilities(false);
    }
    // Exit follow sources page when selecting a source
    if (showFollowSources) {
      setShowFollowSources(false);
    }
    setSelectedSource(source);
    setPage(0); // Reset pagination when changing source
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

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleBookmarksClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view your bookmarks",
        variant: "destructive",
      });
      return;
    }
    setShowBookmarks(!showBookmarks);
    // Refetch bookmarks when toggling bookmarks view
    refetchBookmarks();
  };

  const handleReadHere = (articleUrl: string) => {
    setSelectedArticleUrl(articleUrl);
  };

  const handleCloseArticleViewer = () => {
    setSelectedArticleUrl(null);
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const handleVulnerabilitiesClick = () => {
    setShowVulnerabilities(true);
    setShowBookmarks(false);
    handleSidebarClose(); // Auto-close sidebar on mobile
  };

  const handleVulnerabilitiesClose = () => {
    setShowVulnerabilities(false);
  };

  const handleFollowSourcesClick = () => {
    setShowFollowSources(true);
    handleSidebarClose(); // Auto-close sidebar on mobile
  };

  const handleFollowSourcesBack = () => {
    setShowFollowSources(false);
  };

  const handleBookmarksSidebarClick = () => {
    handleBookmarksClick();
    handleSidebarClose(); // Auto-close sidebar on mobile
  };

  // Filter articles based on current filters
  const filteredArticles = articles.filter(article => {
    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const articleDate = new Date(article.publishedAt);
      const diffInDays = Math.floor((now.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24));

      switch (timeFilter) {
        case 'today':
          if (diffInDays > 0) return false;
          break;
        case 'week':
          if (diffInDays > 7) return false;
          break;
        case 'month':
          if (diffInDays > 30) return false;
          break;
      }
    }

    // Threat level filter
    if (!threatFilters.includes(article.threatLevel)) {
      return false;
    }

    return true;
  });

  // Show bookmarked articles if bookmarks view is active
  // When showing bookmarks, we should display ALL bookmarked articles regardless of current filters
  const displayArticles = showBookmarks
    ? (bookmarkedArticles as any[]).map(item => ({
      ...item.article,
      isBookmarked: true
    }))
    : filteredArticles;

  // Log a warning if we're in bookmarks view but not all bookmarks are displayed
  if (showBookmarks) {
    const bookmarkCount = (bookmarks as Bookmark[]).length;
    const displayedBookmarkCount = displayArticles.length;
    if (bookmarkCount !== displayedBookmarkCount) {
      console.warn(`Bookmark count mismatch: ${bookmarkCount} bookmarks exist but only ${displayedBookmarkCount} are displayed`);
    }
  }

  console.log('Display articles count:', displayArticles.length, 'Show bookmarks:', showBookmarks);
  console.log('Bookmarks count:', (bookmarks as Bookmark[]).length);
  console.log('Bookmarks:', bookmarks);
  console.log('Articles:', articles.map(a => a.id));

  // Log filtering details when in bookmarks view
  if (showBookmarks) {
    console.log('Filtering details:');
    console.log('- Time filter:', timeFilter);
    console.log('- Threat filters:', threatFilters);
    console.log('- Selected source:', selectedSource);
    console.log('- Total articles:', articles.length);
    console.log('- Filtered articles:', filteredArticles.length);
    console.log('- Bookmarked articles:', displayArticles.length);
  }

  const lastUpdated = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="min-h-screen bg-whatcyber-darker text-slate-100 flex flex-col">
      <SEO
        title="Live Cybersecurity News Feed | WhatCyber"
        description="Your live, aggregated feed of the latest cybersecurity news. Stay updated on vulnerabilities, threat intel, and breaking stories from around the web."
        keywords="cybersecurity news, threat intelligence, vulnerability feed, security alerts, cyber threats, security updates"
      />
      <Header
        onSearch={handleSearch}
        bookmarkCount={(bookmarks as Bookmark[]).length}
        onBookmarksClick={handleBookmarksClick}
        onSidebarToggle={handleSidebarToggle}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={handleSidebarClose}
          />
        )}

        {/* Sidebar */}
        <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed left-0 top-16 h-[calc(100vh-4rem)] z-30 lg:relative lg:translate-x-0 lg:z-10 lg:top-0 lg:h-full transition-transform duration-300 ease-in-out`}>
          <Sidebar
            selectedSource={selectedSource}
            onSourceSelect={(source) => {
              handleSourceSelect(source);
              handleSidebarClose(); // Auto-close on mobile after selection
            }}
            timeFilter={timeFilter}
            onTimeFilterChange={handleTimeFilterChange}
            threatFilters={threatFilters}
            onThreatFilterChange={handleThreatFilterChange}
            onClose={handleSidebarClose}
            onVulnerabilitiesClick={handleVulnerabilitiesClick}
            onFollowSourcesClick={handleFollowSourcesClick}
            onBookmarksClick={handleBookmarksSidebarClick} // Add this prop
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-whatcyber-darker">
          {showVulnerabilities ? (
            <CVEList onClose={handleVulnerabilitiesClose} />
          ) : showFollowSources ? (
            <FollowSourcesView
              userSources={userSources}
              onBack={handleFollowSourcesBack}
            />
          ) : (
            <div className="max-w-4xl mx-auto p-4 lg:p-6">
              {/* Content Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-slate-100 mb-2" data-testid="text-page-title">
                    {showBookmarks ? 'Bookmarked Articles' : 'Latest Threat Intelligence'}
                  </h1>
                  <p className="text-sm lg:text-base text-slate-400" data-testid="text-page-description">
                    {showBookmarks
                      ? user
                        ? 'Your saved articles for later reading'
                        : 'Please log in to view your bookmarks'
                      : 'Stay updated with the latest cybersecurity threats and vulnerabilities'
                    }
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span data-testid="text-last-updated">Last updated: {lastUpdated}</span>
                  </div>
                  {!showBookmarks && (
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100 w-full sm:w-auto" data-testid="select-sort">
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
                <div className="grid gap-6">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-6 h-6 rounded-sm" />
                          <Skeleton className="w-24 h-4" />
                          <Skeleton className="w-16 h-6 rounded-full" />
                        </div>
                        <Skeleton className="w-20 h-4" />
                      </div>
                      <Skeleton className="w-full h-6 mb-3" />
                      <Skeleton className="w-full h-4 mb-2" />
                      <Skeleton className="w-3/4 h-4 mb-4" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="w-20 h-4" />
                          <div className="flex space-x-1">
                            <Skeleton className="w-16 h-6 rounded-full" />
                            <Skeleton className="w-20 h-6 rounded-full" />
                          </div>
                        </div>
                        <Skeleton className="w-24 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Articles Grid */}
              {!articlesLoading && (
                <>
                  {showBookmarks && !user ? (
                    <div className="text-center py-12">
                      <div className="text-slate-400 text-lg mb-2" data-testid="text-no-articles">
                        Please log in to view your bookmarks
                      </div>
                      <p className="text-slate-500 text-sm" data-testid="text-no-articles-description">
                        Your bookmarked articles will appear here once you log in
                      </p>
                    </div>
                  ) : displayArticles.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-slate-400 text-lg mb-2" data-testid="text-no-articles">
                        {showBookmarks
                          ? "No bookmarked articles yet"
                          : searchQuery
                            ? "No articles found matching your search"
                            : "No articles available"
                        }
                      </div>
                      <p className="text-slate-500 text-sm" data-testid="text-no-articles-description">
                        {showBookmarks
                          ? "Bookmark articles to read them later"
                          : searchQuery
                            ? "Try adjusting your search terms or filters"
                            : "Articles will appear here once feeds are loaded. Try adjusting your Time range filter."
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {displayArticles.map((article, index) => (
                        <ArticleCard
                          key={article.id}
                          article={{
                            ...article,
                            isBookmarked: showBookmarks ? true : bookmarks.some(bookmark => bookmark.articleId === article.id)
                          }}
                          isFeatured={index === 0 && !showBookmarks && !searchQuery}
                          onReadHere={handleReadHere}
                        />
                      ))}
                    </div>
                  )}

                  {/* Load More Button */}
                  {!showBookmarks && displayArticles.length > 0 && displayArticles.length >= ARTICLES_PER_PAGE && (
                    <div className="flex justify-center mt-8">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600"
                        data-testid="button-load-more"
                      >
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Load More Articles
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Article Viewer */}
      <ArticleViewer
        articleUrl={selectedArticleUrl}
        onClose={handleCloseArticleViewer}
      />
    </div>
  );
}