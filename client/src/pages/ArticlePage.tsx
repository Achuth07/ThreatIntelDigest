import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Clock, Calendar, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import logoImage from '@/assets/logo/android-chrome-512x512.png';

interface Article {
    id: string;
    title: string;
    summary: string;
    url: string;
    source: string;
    sourceIcon?: string;
    publishedAt: string;
    threatLevel: string;
    tags: string[];
    readTime: number;
}

interface ArticleContent {
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string;
    siteName: string;
    lang: string;
}

export default function ArticlePage() {
    const [, params] = useRoute("/article/:id");
    const id = params?.id;
    const [, setLocation] = useLocation();

    // Fetch article metadata
    const { data: article, isLoading: isArticleLoading, error: articleError } = useQuery<Article>({
        queryKey: ['article', id],
        queryFn: async () => {
            const res = await fetch(`/api/articles?id=${id}`);
            if (!res.ok) throw new Error('Failed to fetch article');
            return res.json();
        },
        enabled: !!id
    });

    // Fetch full article content once we have the URL
    const { data: content, isLoading: isContentLoading, error: contentError } = useQuery<ArticleContent>({
        queryKey: ['article-content', article?.url],
        queryFn: async () => {
            if (!article?.url) return null;
            // Use our existing proxy endpoint that uses Mozilla Readability
            const res = await fetch(`/api/fetch-article?url=${encodeURIComponent(article.url)}`);
            if (!res.ok) throw new Error('Failed to fetch article content');
            return res.json();
        },
        enabled: !!article?.url
    });

    const getThreatColor = (level: string) => {
        switch (level?.toUpperCase()) {
            case 'CRITICAL': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'LOW': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    if (isArticleLoading) {
        return (
            <div className="min-h-screen bg-background pb-12">
                {/* Header Skeleton */}
                <header className="bg-whatcyber-dark border-b border-whatcyber-light-gray/30 sticky top-0 z-50 backdrop-blur-sm bg-whatcyber-dark/95 mb-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
                        <div className="flex items-center space-x-3">
                            <Skeleton className="w-8 h-8 rounded-lg" />
                            <div className="flex flex-col gap-1">
                                <Skeleton className="w-24 h-4" />
                                <Skeleton className="w-16 h-3" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="container max-w-4xl mx-auto px-4">
                    <div className="mb-6">
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <Skeleton className="h-12 w-3/4 mb-4" />
                    <div className="flex gap-4 mb-8">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-24" />
                    </div>
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }

    if (articleError || !article) {
        return (
            <div className="min-h-screen bg-background pb-12">
                {/* Header */}
                <header className="bg-whatcyber-dark border-b border-whatcyber-light-gray/30 sticky top-0 z-50 backdrop-blur-sm bg-whatcyber-dark/95 mb-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
                        <a href="https://www.whatcyber.com/threatfeed/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
                            <img src={logoImage} alt="WhatCyber Logo" className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg" />
                            <div className="flex flex-col">
                                <h1 className="text-lg lg:text-xl font-bold text-slate-100 leading-tight">WhatCyber</h1>
                                <span className="text-xs text-whatcyber-teal font-medium -mt-1">ThreatFeed</span>
                            </div>
                        </a>
                    </div>
                </header>

                <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
                    <h2 className="text-2xl font-bold mb-4">Article not found</h2>
                    <p className="text-muted-foreground mb-6">The article you are looking for could not be found or has been removed.</p>
                    <Button onClick={() => setLocation('/threatfeed')}>Return to Feed</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Header */}
            <header className="bg-whatcyber-dark border-b border-whatcyber-light-gray/30 sticky top-0 z-50 backdrop-blur-sm bg-whatcyber-dark/95 mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
                    <a href="https://www.whatcyber.com/threatfeed/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
                        <img src={logoImage} alt="WhatCyber Logo" className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg" />
                        <div className="flex flex-col">
                            <h1 className="text-lg lg:text-xl font-bold text-slate-100 leading-tight">WhatCyber</h1>
                            <span className="text-xs text-whatcyber-teal font-medium -mt-1">ThreatFeed</span>
                        </div>
                    </a>
                </div>
            </header>

            <div className="container max-w-4xl mx-auto px-4">
                {/* Navigation */}
                <Button
                    variant="ghost"
                    className="mb-6 pl-0 hover:pl-2 transition-all"
                    onClick={() => setLocation('/threatfeed')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Feed
                </Button>

                {/* Article Header */}
                <div className="mb-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline" className={getThreatColor(article.threatLevel)}>
                            <ShieldAlert className="mr-1 h-3 w-3" />
                            {article.threatLevel}
                        </Badge>
                        <Badge variant="secondary" className="bg-secondary/50">
                            {article.source}
                        </Badge>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight text-foreground">
                        {article.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-b border-border pb-6">
                        <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4" />
                            {format(new Date(article.publishedAt), 'MMM d, yyyy • h:mm a')}
                        </div>
                        <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            {article.readTime} min read
                        </div>
                        <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-primary hover:underline ml-auto"
                        >
                            Read Original <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                    </div>
                </div>

                {/* Article Content */}
                <Card className="border-none shadow-none bg-transparent">
                    <CardContent className="p-0">
                        {isContentLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-64 w-full mt-8" />
                            </div>
                        ) : contentError ? (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
                                <p className="text-destructive mb-4">Unable to load full content from source.</p>
                                <Button variant="outline" onClick={() => window.open(article.url, '_blank')}>
                                    Read on {article.source} <ExternalLink className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:rounded prose-code:px-1 prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-border prose-img:rounded-lg prose-img:border prose-img:border-border"
                                dangerouslySetInnerHTML={{ __html: content?.content || '' }}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
