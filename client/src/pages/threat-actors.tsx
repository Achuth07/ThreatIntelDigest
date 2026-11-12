import { actorUrl } from '@/lib/urls';
import { Pagination } from '@/components/pagination';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Loader2, Users, AlertTriangle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { usePageParam } from "@/hooks/use-page-param";
import { formatDistanceToNow } from "date-fns";
import { AppShell } from "@/components/layout/app-shell";
import { ActorsSidebar } from "@/components/layout/sidebars/actors-sidebar";
import { SEO } from "@/components/seo";
import { STATIC_PAGE_META } from "@/lib/page-meta";

export default function ThreatActorsPage() {
    const [, setLocation] = useLocation();
    const [search, setSearch] = useState("");
    const { page, setPage, hrefFor } = usePageParam();

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

    return (
        <AppShell activeTab="actors" sidebar={<ActorsSidebar />}>
            <SEO
                {...STATIC_PAGE_META['/threat-actors']}
            />
            <div className="container mx-auto p-4 lg:p-8 space-y-6">
                <div className="flex flex-col gap-4">
                    <h1 className="text-2xl lg:text-3xl font-bold font-display text-slate-100 flex items-center gap-3">
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
                        className="pl-10 bg-card"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {data?.data?.map((group: any) => (
                                <Card
                                    key={group.id}
                                    className="bg-card border-border hover:border-whatcyber-teal/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-whatcyber-teal/10 transition-all duration-300 cursor-pointer group h-full"
                                    onClick={() => setLocation(actorUrl(group))}
                                >
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                                        <div className="w-12 h-12 rounded-md bg-secondary shrink-0 border border-border overflow-hidden flex items-center justify-center">
                                            <img
                                                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(group.name)}`}
                                                alt={`${group.name} identicon`}
                                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                            />
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <CardTitle className="text-slate-100 group-hover:text-whatcyber-teal transition-colors text-lg">
                                                <Link
                                                    href={actorUrl(group)}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {group.name}
                                                </Link>
                                            </CardTitle>
                                            <CardDescription className="text-slate-400 text-xs mt-1 font-mono">
                                                Updated {formatDistanceToNow(new Date(group.lastUpdated), { addSuffix: true })}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {group.aliases && group.aliases.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {group.aliases.slice(0, 3).map((alias: string, i: number) => (
                                                    <span key={i} className="text-xs bg-secondary text-slate-300 px-2 py-1 rounded-full border border-border">
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

                        {/* Pagination: numbered plain links, so every page is reachable from the first */}
                        {data?.pagination && (
                            <Pagination
                                page={page}
                                totalPages={data.pagination.totalPages}
                                hrefFor={hrefFor}
                                label="Threat actor pages"
                            />
                        )}
                    </>
                )}
            </div>
        </AppShell>
    );
}
