import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Loader2, AlertTriangle, ArrowLeft, Activity, Calendar, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ArticleCard } from "@/components/article-card";
import { AppShell } from "@/components/layout/app-shell";
import { ActorsSidebar } from "@/components/layout/sidebars/actors-sidebar";
import { SEO } from "@/components/seo";

export default function ThreatActorDetailPage() {
    const [, params] = useRoute("/threat-actors/:id");
    const [, setLocation] = useLocation();
    const id = params?.id;

    const { data: group, isLoading, isError } = useQuery({
        queryKey: ["/api/threat-groups", id],
        queryFn: async () => {
            const res = await fetch(`/api/threat-groups/${id}/`);
            if (!res.ok) throw new Error(`Failed to fetch threat group: ${res.status} ${res.statusText}`);
            return res.json();
        },
        enabled: !!id
    });

    // Helper function to clean up Markdown links and citations from text
    const cleanDescription = (text: string) => {
        if (!text) return "";

        // Remove Markdown links but keep the link text
        let cleanedText = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

        // Remove citation references like (Citation: ...)
        cleanedText = cleanedText.replace(/\(Citation: [^\)]+\)/g, '');

        // Clean up extra whitespace
        cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

        return cleanedText;
    };

    if (isLoading) {
        return (
            <AppShell activeTab="actors" sidebar={<ActorsSidebar />}>
                <div className="flex justify-center items-center py-32">
                    <Loader2 className="w-10 h-10 animate-spin text-whatcyber-teal" />
                </div>
            </AppShell>
        );
    }

    if (isError || !group) {
        return (
            <AppShell activeTab="actors" sidebar={<ActorsSidebar />}>
                <div className="container mx-auto p-8 flex flex-col items-center justify-center text-red-400 gap-4 py-24">
                    <AlertTriangle className="w-12 h-12" />
                    <h2 className="text-xl font-bold">Failed to load threat actor</h2>
                    <Button onClick={() => setLocation("/threat-actors")} variant="outline">
                        Back to Directory
                    </Button>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell activeTab="actors" sidebar={<ActorsSidebar />}>
            <SEO
                title={`${group.name} | Threat Actor Profile`}
                description={`Threat intelligence profile for ${group.name}. Aliases: ${group.aliases?.join(', ') || 'None'}.`}
            />
            <div className="container mx-auto p-4 lg:p-8 space-y-8 max-w-5xl">
                {/* Header */}
                <div className="space-y-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-100 pl-0 gap-2"
                        onClick={() => setLocation("/threat-actors")}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Directory
                    </Button>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-4 sm:gap-6">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-secondary shrink-0 border border-border overflow-hidden flex items-center justify-center">
                                <img
                                    src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(group.name)}`}
                                    alt={`${group.name} identicon`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold font-display text-slate-100 mb-2">
                                    {group.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                                    {group.stixId && (
                                        <span className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-slate-300 font-mono">
                                            {group.stixId}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        Updated {format(new Date(group.lastUpdated), "PPP")}
                                    </span>
                                </div>
                            </div>
                        </div>
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
                            <div className="prose dark:prose-invert max-w-none text-slate-300 bg-card p-6 rounded-xl border border-border">
                                <p className="whitespace-pre-wrap">{cleanDescription(group.description) || "No description available."}</p>
                            </div>
                        </section>

                        {/* Activity Stream */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-whatcyber-teal" />
                                Live Activity Stream
                            </h2>
                            {group.recentArticles && group.recentArticles.length > 0 ? (
                                <div className="space-y-4">
                                    {group.recentArticles.map((article: any) => (
                                        <ArticleCard
                                            key={article.id}
                                            article={{
                                                ...article,
                                                sourceIcon: article.sourceIcon || undefined,
                                                tags: []
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-card/50 rounded-xl border border-border border-dashed text-slate-500">
                                    No recent activity detected for this group.
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="text-lg text-slate-200">Aliases</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {group.aliases && group.aliases.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {group.aliases.map((alias: string, i: number) => (
                                            <Badge key={i} variant="secondary">
                                                {alias}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-500 italic">None listed</span>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
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
        </AppShell>
    );
}
