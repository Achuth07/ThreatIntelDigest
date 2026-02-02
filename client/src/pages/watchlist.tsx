
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Trash2, Plus, Newspaper, ShieldAlert, Activity, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ArticleCard } from "@/components/article-card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QueryBuilder } from "@/components/query-builder";
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { SEO } from '@/components/seo';
import type { Bookmark } from '@shared/schema';
import { getAuthenticatedUser } from '@/lib/auth';

import { ArticleViewer } from '@/components/article-viewer';

interface WatchlistItem {
    id: string;
    keyword: string;
    createdAt: string;
}

interface WatchlistFeed {
    articles: any[];
    cves: any[];
    kevs: any[];
}

export default function WatchlistPage() {
    const [newKeyword, setNewKeyword] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();

    // Layout state
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedArticleUrl, setSelectedArticleUrl] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    // Sidebar dummy state (since this page focuses on watchlist, these are just for display/compatibility)
    const [selectedSource] = useState('all');
    const [timeFilter, setTimeFilter] = useState('all');
    const [threatFilters, setThreatFilters] = useState(['CRITICAL', 'HIGH', 'MEDIUM']);

    const user = getAuthenticatedUser();

    // Queries
    const { data: watchlistItems, isLoading: isLoadingItems } = useQuery<WatchlistItem[]>({
        queryKey: ["/api/watchlist"],
    });

    const { data: feed, isLoading: isLoadingFeed } = useQuery<WatchlistFeed>({
        queryKey: ["/api/watchlist/feed"],
        enabled: !!watchlistItems && watchlistItems.length > 0,
    });

    const { data: bookmarks = [] } = useQuery<Bookmark[]>({
        queryKey: ['/api/bookmarks'],
        enabled: !!user && !!user.token,
    });

    // Mutations
    const addMutation = useMutation({
        mutationFn: async (keyword: string) => {
            const res = await apiRequest("POST", "/api/watchlist", { keyword });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
            queryClient.invalidateQueries({ queryKey: ["/api/watchlist/feed"] });
            setNewKeyword("");
            setIsAddDialogOpen(false);
            toast({
                title: "Keyword added",
                description: "Your watchlist has been updated.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to add keyword. Please try again.",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/watchlist/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
            queryClient.invalidateQueries({ queryKey: ["/api/watchlist/feed"] });
            toast({
                title: "Keyword removed",
                description: "Item removed from your watchlist.",
            });
        },
    });

    // Handlers
    const handleAddKeyword = () => {
        if (!newKeyword.trim()) return;
        addMutation.mutate(newKeyword.trim());
    };

    // Navigation Handlers (Redirect to Threat Feed)
    const handleSourceSelect = (source: string) => {
        setLocation(`/threatfeed?source=${source}`);
    };

    const handleBookmarksClick = () => {
        setLocation('/threatfeed?view=bookmarks');
    };

    const handleVulnerabilitiesClick = () => {
        setLocation('/threatfeed?view=cve');
    };

    const handleFollowSourcesClick = () => {
        setLocation('/threatfeed?view=follow');
    }

    const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);
    const handleSidebarClose = () => setIsSidebarOpen(false);

    const handleReadHere = (articleUrl: string) => {
        setSelectedArticleUrl(articleUrl);
    };

    const handleCloseArticleViewer = () => {
        setSelectedArticleUrl(null);
    };

    const seoProps = {
        title: "My Watchlist | WhatCyber",
        description: "Track specific keywords across articles, vulnerabilities, and exploited threats.",
        keywords: "watchlist, keyword tracking, threat intelligence, cybersecurity"
    };

    return (
        <div className="min-h-screen bg-whatcyber-darker text-slate-100 flex flex-col">
            <SEO {...seoProps} />
            <Header
                onSearch={(query) => setLocation(`/?search=${query}`)}
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
                        onSourceSelect={handleSourceSelect}
                        timeFilter={timeFilter}
                        onTimeFilterChange={setTimeFilter}
                        threatFilters={threatFilters}
                        onThreatFilterChange={setThreatFilters}
                        onClose={handleSidebarClose}
                        onVulnerabilitiesClick={handleVulnerabilitiesClick}
                        onFollowSourcesClick={handleFollowSourcesClick}
                        onBookmarksClick={handleBookmarksClick}
                    />
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-whatcyber-darker">
                    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-8">
                        {/* Page Header */}
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3">
                                My Watchlist
                                <Badge variant="outline" className="text-xs border-whatcyber-teal text-whatcyber-teal py-0 h-5">Beta</Badge>
                            </h1>
                            <p className="text-sm lg:text-base text-slate-400">
                                Track specific keywords across articles, vulnerabilities, and exploited threats.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            {/* Keywords Management */}
                            <Card className="md:col-span-1 h-fit glass-card border border-whatcyber-light-gray/20">
                                <CardHeader>
                                    <CardTitle>Keywords</CardTitle>
                                    <CardDescription>Manage your tracked terms</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="w-full bg-whatcyber-teal hover:bg-emerald-600 text-white">
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create New Watchlist Item
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Add Watchlist Item</DialogTitle>
                                                <DialogDescription className="text-slate-400">
                                                    Construct a query using AND, OR, and NOT logic.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4">
                                                <QueryBuilder onQueryChange={setNewKeyword} />
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    onClick={handleAddKeyword}
                                                    disabled={addMutation.isPending || !newKeyword.trim()}
                                                    className="w-full bg-whatcyber-teal hover:bg-emerald-600"
                                                >
                                                    {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                    Add to Watchlist
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    <div className="space-y-2 pt-2">
                                        {isLoadingItems ? (
                                            <div className="flex justify-center p-4">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : watchlistItems?.length === 0 ? (
                                            <div className="text-center p-4 text-sm text-muted-foreground">
                                                No keywords added yet.
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {watchlistItems?.map((item) => (
                                                    <Badge key={item.id} variant="secondary" className="px-3 py-1 flex items-center gap-2 bg-slate-800 hover:bg-slate-700">
                                                        {item.keyword}
                                                        <button
                                                            onClick={() => deleteMutation.mutate(item.id)}
                                                            disabled={deleteMutation.isPending}
                                                            className="hover:text-destructive transition-colors"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Feed Results */}
                            <Card className="md:col-span-2 glass-card border border-whatcyber-light-gray/20">
                                <CardHeader>
                                    <CardTitle>Matches Found</CardTitle>
                                    <CardDescription>Content matching your keywords</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isLoadingFeed ? (
                                        <div className="flex justify-center p-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : !watchlistItems?.length ? (
                                        <div className="text-center p-12 text-muted-foreground">
                                            Add keywords to see matching content.
                                        </div>
                                    ) : (
                                        <Tabs defaultValue="articles" className="w-full">
                                            <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                                                <TabsTrigger value="articles" className="flex items-center gap-2">
                                                    <Newspaper className="h-4 w-4" /> Articles ({feed?.articles?.length || 0})
                                                </TabsTrigger>
                                                <TabsTrigger value="cves" className="flex items-center gap-2">
                                                    <ShieldAlert className="h-4 w-4" /> CVEs ({feed?.cves?.length || 0})
                                                </TabsTrigger>
                                                <TabsTrigger value="kevs" className="flex items-center gap-2">
                                                    <Activity className="h-4 w-4" /> KEVs ({feed?.kevs?.length || 0})
                                                </TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="articles" className="mt-4">
                                                <ScrollArea className="h-[600px] pr-4">
                                                    <div className="space-y-4">
                                                        {feed?.articles?.length === 0 ? (
                                                            <div className="text-center py-8 text-muted-foreground">No matching articles found.</div>
                                                        ) : (
                                                            feed?.articles?.map((article) => (
                                                                <div key={article.id} className="mb-4">
                                                                    <ArticleCard article={article} onReadHere={handleReadHere} />
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </TabsContent>

                                            <TabsContent value="cves" className="mt-4">
                                                <ScrollArea className="h-[600px] pr-4">
                                                    {feed?.cves?.length === 0 ? (
                                                        <div className="text-center py-8 text-muted-foreground">No matching CVEs found.</div>
                                                    ) : (
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="border-slate-700 hover:bg-slate-800/50">
                                                                    <TableHead className="text-slate-400">ID</TableHead>
                                                                    <TableHead className="text-slate-400">Severity</TableHead>
                                                                    <TableHead className="text-slate-400">Published</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {feed?.cves?.map((cve) => (
                                                                    <TableRow key={cve.id} className="border-slate-700 hover:bg-slate-800/50">
                                                                        <TableCell className="font-medium text-slate-200">
                                                                            <Link href={`/vulnerabilities/${cve.id}`} className="text-whatcyber-teal hover:underline">
                                                                                {cve.id}
                                                                            </Link>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge variant={
                                                                                cve.cvssV3Severity === 'CRITICAL' ? 'destructive' :
                                                                                    cve.cvssV3Severity === 'HIGH' ? 'destructive' :
                                                                                        cve.cvssV3Severity === 'MEDIUM' ? 'default' : 'secondary'
                                                                            }>
                                                                                {cve.cvssV3Severity || 'N/A'}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-slate-400">{cve.publishedDate ? formatDistanceToNow(new Date(cve.publishedDate), { addSuffix: true }) : 'N/A'}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    )}
                                                </ScrollArea>
                                            </TabsContent>

                                            <TabsContent value="kevs" className="mt-4">
                                                <ScrollArea className="h-[600px] pr-4">
                                                    {feed?.kevs?.length === 0 ? (
                                                        <div className="text-center py-8 text-muted-foreground">No matching KEVs found.</div>
                                                    ) : (
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="border-slate-700 hover:bg-slate-800/50">
                                                                    <TableHead className="text-slate-400">CVE ID</TableHead>
                                                                    <TableHead className="text-slate-400">Product</TableHead>
                                                                    <TableHead className="text-slate-400">Date Added</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {feed?.kevs?.map((kev) => (
                                                                    <TableRow key={kev.cveID} className="border-slate-700 hover:bg-slate-800/50">
                                                                        <TableCell className="font-medium text-slate-200">
                                                                            <Link href={`/exploited-vulnerabilities/${kev.cveID}`} className="text-whatcyber-teal hover:underline">
                                                                                {kev.cveID}
                                                                            </Link>
                                                                        </TableCell>
                                                                        <TableCell className="text-slate-300">{kev.product}</TableCell>
                                                                        <TableCell className="text-slate-400">{kev.dateAdded ? formatDistanceToNow(new Date(kev.dateAdded), { addSuffix: true }) : 'N/A'}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    )}
                                                </ScrollArea>
                                            </TabsContent>
                                        </Tabs>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
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
