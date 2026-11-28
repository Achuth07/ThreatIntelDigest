import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { actorUrl } from "@/lib/urls";
import { useSsrHandoff } from "@/lib/ssr-handoff";
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
import { actorSeo } from "@/lib/seo-text";
import { ActorCves, ActorSoftware, ActorTechniques } from "@/components/actor-attack";
import { factsSummary, profileDescription, type ActorFacts } from "@/lib/actor-profile";

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

    useSsrHandoff(!isLoading);

    // Opened by the old id-based address? Move to the readable one (the server redirects too;
    // this covers in-app navigation).
    useEffect(() => {
        if (group?.slug && id && id !== group.slug) {
            setLocation(actorUrl(group), { replace: true });
        }
    }, [group, id, setLocation]);

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

    const description = group ? cleanDescription(group.description) : "";
    const facts: ActorFacts | null = group
        ? {
            name: group.name,
            attackId: group.attackId ?? null,
            aliases: group.aliases ?? [],
            techniques: group.techniques ?? [],
            software: group.software ?? [],
            cves: group.cves ?? [],
        }
        : null;

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
                <SEO title="Threat Actor Not Found | WhatCyber" description="This threat actor profile could not be loaded." noindex />
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
                {...actorSeo({ ...group, description: facts ? profileDescription(group.profile ?? null, facts, group.description) : group.description })}
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
                                    {group.attackId && (
                                        <a
                                            href={group.attackUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-slate-300 font-mono hover:text-whatcyber-teal"
                                        >
                                            {group.attackId}
                                        </a>
                                    )}
                                    {group.attackStatus && group.attackStatus !== "active" && (
                                        <span className="rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-yellow-400">
                                            {group.attackStatus === "revoked" ? `Merged into ${group.revokedBy ?? "another group"} by MITRE` : "Deprecated by MITRE"}
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
                        {/* Overview: the written profile when there is one, then what MITRE ATT&CK records. */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-whatcyber-teal" />
                                Overview
                            </h2>
                            <div className="space-y-4 bg-card p-6 rounded-xl border border-border text-slate-300">
                                {group.profile?.draft && (
                                    <p className="rounded border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
                                        Draft: this written profile has not been reviewed yet and is shown here only. It is not on the live site.
                                    </p>
                                )}
                                {group.profile && <p>{group.profile.summary}</p>}
                                {group.profile && (
                                    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
                                        <dt className="text-slate-500">Origin</dt>
                                        <dd>{group.profile.origin}</dd>
                                        <dt className="text-slate-500">Motivation</dt>
                                        <dd>{group.profile.motivation}</dd>
                                        <dt className="text-slate-500">Targets</dt>
                                        <dd>{group.profile.targets}</dd>
                                    </dl>
                                )}
                                {!group.profile && facts && factsSummary(facts) && <p>{factsSummary(facts)}</p>}
                                {description && (
                                    group.profile ? (
                                        <details className="text-sm">
                                            <summary className="cursor-pointer text-slate-400 hover:text-slate-200">MITRE ATT&CK description</summary>
                                            <p className="mt-2 whitespace-pre-wrap text-slate-400">{description}</p>
                                        </details>
                                    ) : (
                                        <div>
                                            <h3 className="mb-1 text-sm font-semibold text-slate-400">From MITRE ATT&CK</h3>
                                            <p className="whitespace-pre-wrap">{description}</p>
                                        </div>
                                    )
                                )}
                                {!group.profile && !description && !(facts && factsSummary(facts)) && <p>No description available.</p>}
                            </div>
                        </section>

                        <ActorCves cves={group.cves ?? []} actorName={group.name} />
                        <ActorTechniques techniques={group.techniques ?? []} />

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

                        <ActorSoftware software={group.software ?? []} />

                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="text-lg text-slate-200">Sources</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {(group.profile?.sources ?? []).filter((source: { url: string }) => source.url !== group.attackUrl).map((source: { label: string; url: string }) => (
                                    <a
                                        key={source.url}
                                        href={source.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-start gap-2 text-whatcyber-teal hover:underline text-sm"
                                    >
                                        <ExternalLink className="mt-0.5 w-4 h-4 shrink-0" />
                                        {source.label}
                                    </a>
                                ))}
                                {group.attackUrl && (
                                <a
                                    href={group.attackUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-whatcyber-teal hover:underline text-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View on MITRE ATT&CK
                                </a>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
