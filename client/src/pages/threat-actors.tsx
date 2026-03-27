
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Loader2, Users, AlertTriangle, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { SEO } from "@/components/seo";
import { getAuthenticatedUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Bookmark } from "@shared/schema";

export default function ThreatActorsPage() {
    const [, setLocation] = useLocation();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { toast } = useToast();

    // Sidebar state dummies (since we aren't using the sidebar for filtering here yet)
    const [selectedSource, setSelectedSource] = useState('all');
    const [timeFilter, setTimeFilter] = useState('all');
    const [threatFilters, setThreatFilters] = useState(['CRITICAL', 'HIGH', 'MEDIUM']);

    const user = getAuthenticatedUser();

    // Fetch bookmarks count for header
    const { data: bookmarks = [] } = useQuery<Bookmark[]>({
        queryKey: ['/api/bookmarks'],
        enabled: !!user && !!user.token,
    });

    const { data, isLoading, isError } = useQuery({
        queryKey: ["/api/threat-groups", page, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });
            if (search) params.append("search", search);

            const res = await fetch(`/api/threat-groups/?${params}`);
            if (!res.ok) throw new Error("Failed to fetch threat groups");
            return res.json();
        }
    });

    const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);
    const handleSidebarClose = () => setIsSidebarOpen(false);

    // Navigation handlers for sidebar
    const handleNavigation = (path: string) => {
        setLocation(path);
        handleSidebarClose();
    };

    return (
        <div className="min-h-screen bg-whatcyber-darker text-slate-100 flex flex-col">
            <SEO
                title="Threat Actors Directory | WhatCyber"
                description="Explore known threat groups, intrusion sets, and APTs. Data sourced from MITRE ATT&CK and enriched with real-time news."
            />
            <Header
                onSearch={() => { }} // Search in header is global, might need adjustment or ignore for this page
                bookmarkCount={(bookmarks as Bookmark[]).length}
                onBookmarksClick={() => handleNavigation('/threatfeed')} // Redirect to home/bookmarks
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
                        onSourceSelect={(source) => handleNavigation(`/threatfeed?source=${encodeURIComponent(source)}`)}
                        timeFilter={timeFilter}
                        onTimeFilterChange={(filter) => handleNavigation(`/threatfeed?timeFilter=${filter}`)}
                        threatFilters={threatFilters}
                        onThreatFilterChange={(filters) => handleNavigation(`/threatfeed?threatFilters=${filters.join(',')}`)}
                        onClose={handleSidebarClose}
                        onVulnerabilitiesClick={() => handleNavigation('/threatfeed?view=cveList')}

                        onFollowSourcesClick={() => handleNavigation('/threatfeed?view=followSources')}
                        onBookmarksClick={() => handleNavigation('/threatfeed?view=bookmarks')}
                    />
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-whatcyber-darker">
                    <div className="container mx-auto p-4 lg:p-8 space-y-6">
                        <div className="flex flex-col gap-4">
                            <h1 className="text-3xl font-bold font-heading text-slate-100 flex items-center gap-3">
                                <Users className="w-8 h-8 text-whatcyber-teal" />
                                Threat Actor Directory
                            </h1>
                            <p className="text-slate-400 max-w-2xl">
                                Explore known threat groups, intrusion sets, and APTs. Data sourced from MITRE ATT&CK and enriched with real-time news.
                            </p>
                        </div>

                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, alias, or ID..."
                                className="pl-10 bg-slate-900 border-slate-700 text-slate-100"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1); // Reset to page 1 on search
                                }}
                            />
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-whatcyber-teal" />
                            </div>
                        ) : isError ? (
                            <div className="flex flex-col items-center justify-center py-20 text-red-400 gap-2">
                                <AlertTriangle className="w-10 h-10" />
                                <p>Failed to load threat groups. Please try again later.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {data?.data?.map((group: any) => (
                                        <Card
                                            key={group.id}
                                            className="bg-whatcyber-darker border-slate-700 hover:border-whatcyber-teal/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-whatcyber-teal/10 transition-all duration-300 cursor-pointer group h-full"
                                            onClick={() => setLocation(`/threat-actors/${group.id}/`)}
                                        >
                                            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                                                <div className="w-12 h-12 rounded-md bg-slate-800 shrink-0 border border-slate-700 overflow-hidden flex items-center justify-center">
                                                    <img 
                                                        src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(group.name)}`} 
                                                        alt={`${group.name} identicon`}
                                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                    />
                                                </div>
                                                <div className="flex flex-col flex-1">
                                                    <CardTitle className="text-slate-100 group-hover:text-whatcyber-teal transition-colors text-lg">
                                                        {group.name}
                                                    </CardTitle>
                                                    <CardDescription className="text-slate-400 text-xs mt-1">
                                                        Last updated {formatDistanceToNow(new Date(group.lastUpdated), { addSuffix: true })}
                                                    </CardDescription>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                {group.aliases && group.aliases.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {group.aliases.slice(0, 3).map((alias: string, i: number) => (
                                                            <span key={i} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full border border-slate-700">
                                                                {alias}
                                                            </span>
                                                        ))}
                                                        {group.aliases.length > 3 && (
                                                            <span className="text-xs text-slate-500 px-1 py-1">
                                                                +{group.aliases.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {!data?.data?.length && (
                                    <div className="text-center py-20 text-slate-500">
                                        No threat groups found matching your search.
                                    </div>
                                )}

                                {/* Pagination */}
                                {data?.pagination && (
                                    <div className="flex justify-between items-center mt-6">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-slate-400 text-sm">
                                            Page {page} of {data.pagination.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page >= data.pagination.totalPages}
                                            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
