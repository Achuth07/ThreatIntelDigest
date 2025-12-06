
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { KEVCard } from './kev-card';
import { Button } from '@/components/ui/button';
import { Shield, Activity, RefreshCw, X, Filter, Newspaper, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { KnownExploitedVulnerability, Article } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface KevDashboardProps {
    onClose?: () => void;
}

export function KevDashboard({ onClose }: KevDashboardProps) {
    const [page, setPage] = useState(1);
    const [vendorFilter, setVendorFilter] = useState<string>('all');
    const [ransomwareFilter, setRansomwareFilter] = useState<string>('all');
    const [sort, setSort] = useState<string>('newest');
    const [selectedCveForNews, setSelectedCveForNews] = useState<string | null>(null);

    // Fetch KEV data
    const { data: kevData, isLoading, refetch } = useQuery<{ data: KnownExploitedVulnerability[], page: number, limit: number }>({
        queryKey: ['/api/kev', { page, vendorFilter, ransomwareFilter, sort }],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
                sort
            });
            if (vendorFilter !== 'all') params.append('vendorProject', vendorFilter);
            if (ransomwareFilter !== 'all') params.append('knownRansomwareCampaignUse', ransomwareFilter);

            const res = await apiRequest('GET', `/api/kev?${params}`);
            return res.json();
        }
    });

    // Fetch Related News when a CVE is selected
    const { data: relatedNews, isLoading: isLoadingNews } = useQuery<Article[]>({
        queryKey: ['/api/articles', { search: selectedCveForNews }],
        queryFn: async () => {
            if (!selectedCveForNews) return [];
            const res = await apiRequest('GET', `/api/articles?search=${selectedCveForNews}&limit=10`);
            return res.json();
        },
        enabled: !!selectedCveForNews
    });

    // Fetch Vendors for filter
    const { data: vendorsData } = useQuery<{ vendorProject: string, count: number }[]>({
        queryKey: ['/api/kev/vendors'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/kev/vendors');
            return res.json();
        }
    });

    const handleNextPage = () => setPage(p => p + 1);
    const handlePrevPage = () => setPage(p => Math.max(1, p - 1));

    return (
        <div className="p-4 lg:p-6 pb-20 bg-whatcyber-darker text-slate-100 h-full overflow-y-auto w-full">
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center text-slate-100">
                            <Shield className="w-6 h-6 text-red-500 mr-2" />
                            Exploited Vulnerabilities (KEV)
                        </h1>
                        <p className="text-slate-400 mt-1">
                            CISA Known Exploited Vulnerabilities Catalog
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:text-slate-100 min-w-[100px]"
                            onClick={() => refetch()}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-100">
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex flex-col md:flex-row gap-4 items-center">
                    <div className="w-full md:w-auto flex items-center gap-2 text-slate-400 text-sm font-medium">
                        <Filter className="w-4 h-4" />
                        Filters:
                    </div>

                    <Select value={vendorFilter} onValueChange={(v) => { setVendorFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-full md:w-[200px] bg-slate-900 border-slate-700 text-slate-200">
                            <SelectValue placeholder="Vendor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Vendors</SelectItem>
                            {vendorsData?.map(v => (
                                <SelectItem key={v.vendorProject} value={v.vendorProject}>
                                    {v.vendorProject} ({v.count})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={ransomwareFilter} onValueChange={(v) => { setRansomwareFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-full md:w-[220px] bg-slate-900 border-slate-700 text-slate-200">
                            <SelectValue placeholder="Ransomware Used" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Known">Known Ransomware Use</SelectItem>
                            <SelectItem value="Unknown">Unknown</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
                        <SelectTrigger className="w-full md:w-[150px] bg-slate-900 border-slate-700 text-slate-200 md:ml-auto">
                            <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest Added</SelectItem>
                            <SelectItem value="oldest">Oldest Added</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-64 bg-slate-800/50 rounded-lg animate-pulse border border-slate-700/50" />
                        ))}
                    </div>
                ) : !kevData?.data?.length ? (
                    <div className="text-center py-20 text-slate-500">
                        <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg">No vulnerabilities found matching your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {kevData.data.map(kev => (
                            <KEVCard
                                key={kev.cveID}
                                kev={kev}
                                onRelatedNewsClick={(id) => setSelectedCveForNews(id)}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {kevData?.data && (
                    <div className="flex justify-center gap-4 mt-8">
                        <Button
                            variant="outline"
                            onClick={handlePrevPage}
                            disabled={page === 1}
                            className="border-slate-700 text-slate-300"
                        >
                            Previous
                        </Button>
                        <span className="flex items-center px-4 text-slate-400">Page {page}</span>
                        <Button
                            variant="outline"
                            onClick={handleNextPage}
                            disabled={kevData.data.length < 50}
                            className="border-slate-700 text-slate-300"
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>

            {/* News Sheet */}
            <Sheet open={!!selectedCveForNews} onOpenChange={(open) => !open && setSelectedCveForNews(null)}>
                <SheetContent className="bg-whatcyber-darker border-l border-slate-700 text-slate-100 sm:max-w-xl w-full overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="text-slate-100 flex items-center gap-2">
                            <Newspaper className="w-5 h-5 text-whatcyber-teal" />
                            Related News
                        </SheetTitle>
                        <SheetDescription className="text-slate-400">
                            Articles related to {selectedCveForNews}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                        {isLoadingNews ? (
                            <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                <Loader2 className="w-8 h-8 animate-spin text-whatcyber-teal" />
                                <p className="text-slate-500 text-sm">Searching latest intelligence...</p>
                            </div>
                        ) : !relatedNews?.length ? (
                            <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                                <p>No specific articles found for this CVE.</p>
                                <p className="text-xs mt-2">Try searching manually in the main feed.</p>
                            </div>
                        ) : (
                            relatedNews.map(article => (
                                <div key={article.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-whatcyber-teal/50 transition-colors">
                                    <h3 className="font-semibold text-slate-200 mb-2 line-clamp-2">
                                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-whatcyber-teal transition-colors">
                                            {article.title}
                                        </a>
                                    </h3>
                                    <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                                        <span className="flex items-center">
                                            {article.source}
                                        </span>
                                        <span>{format(new Date(article.publishedAt), 'MMM dd, yyyy')}</span>
                                    </div>
                                    <Button
                                        variant="link"
                                        className="px-0 text-whatcyber-teal text-xs mt-2 h-auto"
                                        onClick={() => window.open(article.url, '_blank')}
                                    >
                                        Read Article <ExternalLink className="w-3 h-3 ml-1" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
