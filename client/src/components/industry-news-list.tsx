
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ExternalLink, Calendar, Shield, Building } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Article {
    id: string;
    title: string;
    summary: string;
    url: string;
    source: string;
    threatLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    readTime: number;
    publishedAt: string;
}

interface IndustryNewsListProps {
    industry: string;
}

export function IndustryNewsList({ industry }: IndustryNewsListProps) {
    const { data: articles, isLoading, error } = useQuery<Article[]>({
        queryKey: [`/api/articles?industry=${encodeURIComponent(industry)}&limit=5`],
        refetchOnWindowFocus: false,
    });

    if (isLoading) {
        return (
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-6 flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </CardContent>
            </Card>
        );
    }

    if (error || !articles || articles.length === 0) {
        return (
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-emerald-400" />
                        <CardTitle className="text-base text-slate-200">{industry}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-sm text-slate-500 py-2">No recent news found for this industry.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600 transition-colors">
            <CardHeader className="pb-3 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-emerald-400" />
                        <CardTitle className="text-base font-medium text-emerald-50">{industry} News</CardTitle>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">Top 5</span>
                </div>
            </CardHeader>
            <CardContent className="pt-3">
                <div className="space-y-4">
                    {articles.map((article) => (
                        <div key={article.id} className="group relative pl-4 border-l-2 border-slate-700 hover:border-emerald-500 transition-colors">
                            <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block space-y-1"
                            >
                                <h4 className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition-colors line-clamp-1">
                                    {article.title}
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Shield className="h-3 w-3" />
                                        {article.source}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                                    </span>
                                </div>
                            </a>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
