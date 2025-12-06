
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Loader2, AlertTriangle, ArrowLeft, Globe, Calendar, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ArticleCard } from "@/components/article-card";

export default function ThreatActorDetailPage() {
    const params = useParams();
    const [, setLocation] = useLocation();
    const id = params.id;

    const { data: group, isLoading, isError } = useQuery({
        queryKey: ["/api/threat-groups", id],
        queryFn: async () => {
            const res = await fetch(`/api/threat-groups/${id}`);
            if (!res.ok) throw new Error("Failed to fetch threat group");
            return res.json();
        },
        enabled: !!id
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-100px)]">
                <Loader2 className="w-10 h-10 animate-spin text-whatcyber-teal" />
            </div>
        );
    }

    if (isError || !group) {
        return (
            <div className="container mx-auto p-8 flex flex-col items-center justify-center text-red-400 gap-4">
                <AlertTriangle className="w-12 h-12" />
                <h2 className="text-xl font-bold">Failed to load threat actor</h2>
                <Button onClick={() => setLocation("/threat-actors")} variant="outline" className="border-slate-700">
                    Back to Directory
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 lg:p-8 space-y-8 max-w-5xl">
            {/* Header */}
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white pl-0 gap-2"
                    onClick={() => setLocation("/threat-actors")}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Directory
                </Button>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold font-heading text-slate-100 mb-2">
                            {group.name}
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono">
                                {group.stixId}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Updated {format(new Date(group.lastUpdated), "PPP")}
                            </span>
                        </div>
                    </div>
                    {/* Could add share or extra actions here */}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Description */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-whatcyber-teal" />
                            Overview
                        </h2>
                        <div className="prose prose-invert max-w-none text-slate-300 bg-slate-900/50 p-6 rounded-lg border border-slate-800/50">
                            <p className="whitespace-pre-wrap">{group.description || "No description available."}</p>
                        </div>
                    </section>

                    {/* Activity Stream */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-400" />
                            Live Activity Stream
                        </h2>
                        {group.recentArticles && group.recentArticles.length > 0 ? (
                            <div className="space-y-4">
                                {group.recentArticles.map((article: any) => (
                                    <ArticleCard
                                        key={article.id}
                                        article={{
                                            ...article,
                                            // Ensure optional fields match expected type
                                            sourceIcon: article.sourceIcon || undefined,
                                            tags: [] // Tags might not be fetched in join but component needs it
                                        }}
                                        compact={false}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-slate-900/30 rounded-lg border border-slate-800 border-dashed text-slate-500">
                                No recent activity detected for this group.
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="bg-whatcyber-darker border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-200">Aliases</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {group.aliases && group.aliases.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {group.aliases.map((alias: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-700">
                                            {alias}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-slate-500 italic">None listed</span>
                            )}
                        </CardContent>
                    </Card>

                    {/* External Links / Resources could go here */}
                    <Card className="bg-whatcyber-darker border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-200">Resources</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <a
                                href={`https://attack.mitre.org/groups/${group.stixId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-whatcyber-teal hover:underline text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View on MITRE ATT&CK
                            </a>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
