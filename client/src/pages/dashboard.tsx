import { useQuery } from "@tanstack/react-query";
import { ArticleViewer } from "@/components/article-viewer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { useState } from "react";
import { IndustryNewsList } from "@/components/industry-news-list";
import { MalwareNewsList } from "@/components/malware-news-list";
import { GlobalThreatMap } from "@/components/global-threat-map";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Types
interface TopCWE {
    cweId: string;
    name: string;
    cveCount: number;
    kevCount: number;
    kevToCveRatio: number;
}

interface IndustryStat {
    name: string;
    value: number;
}

interface IndustryWidgetProps {
    onArticleClick: (url: string) => void;
}

function IndustryWidget({ onArticleClick }: IndustryWidgetProps) {
    const { data: industries, isLoading } = useQuery<IndustryStat[]>({
        queryKey: ["/api/stats/industries"],
    });

    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;

    // Calculate total for percentages
    const total = industries?.reduce((sum, item) => sum + item.value, 0) || 0;
    // Find max value for bar scaling (still useful solely for relative bar width if we want)
    // But for percentage representation, we might want the bar width to be the percentage itself or relative to the max percentage.
    // Let's keep bar width relative to the highest percentage for better visual scaling, 
    // but display the percentage text.
    const maxVal = Math.max(...(industries?.map(i => i.value) || [0]));

    return (
        <Card className="bg-slate-800 border-slate-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
                <CardTitle className="text-slate-100">Targeted Industries</CardTitle>
                <CardDescription className="text-slate-400">
                    Sectors most frequently targeted in analyzed threat reports and articles.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {industries?.map((industry) => {
                        const percentage = total > 0 ? ((industry.value / total) * 100).toFixed(1) : "0.0";
                        return (
                            <div key={industry.name} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-200">{industry.name}</span>
                                    <span className="text-slate-400 font-mono">{percentage}%</span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${(industry.value / maxVal) * 100}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {!industries?.length && (
                        <p className="text-slate-500 text-center py-4">No industry data available yet.</p>
                    )}
                </div>

                {industries && industries.length > 0 && (
                    <div className="mt-8 space-y-6">
                        <h3 className="text-lg font-semibold text-slate-100 border-b border-slate-700 pb-2">Top Industry News</h3>
                        <div className="grid gap-6 md:grid-cols-2">
                            {industries.slice(0, 10).map((industry) => (
                                <IndustryNewsList
                                    key={industry.name}
                                    industry={industry.name}
                                    onArticleClick={onArticleClick}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface MalwareStat {
    name: string;
    value: number;
}

interface MalwareWidgetProps {
    onArticleClick: (url: string) => void;
}

function MalwareWidget({ onArticleClick }: MalwareWidgetProps) {
    const [timeRange, setTimeRange] = useState("7");

    const { data: malwareStats, isLoading } = useQuery<MalwareStat[]>({
        queryKey: [`/api/stats/top-malware?days=${timeRange}`],
    });

    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;

    return (
        <Card className="bg-slate-800 border-slate-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-slate-100">Top Active Malware</CardTitle>
                        <CardDescription className="text-slate-400">
                            Most active malware families detected in the selected period (Source: MalwareBazaar).
                        </CardDescription>
                    </div>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700 text-slate-200">
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 3 months</SelectItem>
                            <SelectItem value="365">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full mb-8 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={malwareStats}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={true} opacity={0.3} />
                            <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#94a3b8"
                                tick={{ fill: '#94a3b8' }}
                                width={100}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                itemStyle={{ color: '#f1f5f9' }}
                                cursor={{ fill: '#334155', opacity: 0.2 }}
                                formatter={(value: number) => [value.toLocaleString(), 'Sample Count']}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {malwareStats?.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="#10b981" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {malwareStats && malwareStats.length > 0 && (
                    <div className="mt-8 space-y-6">
                        <h3 className="text-lg font-semibold text-slate-100 border-b border-slate-700 pb-2">Recent News on Top Threats</h3>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                            {malwareStats.slice(0, 4).map((malware) => (
                                <MalwareNewsList
                                    key={malware.name}
                                    malwareFamily={malware.name}
                                    onArticleClick={onArticleClick}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedArticleUrl, setSelectedArticleUrl] = useState<string | null>(null);

    const { data: topCwes, isLoading } = useQuery<TopCWE[]>({
        queryKey: ["/api/stats/top-cwes"],
        refetchOnWindowFocus: false
    });

    return (
        <div className="flex h-screen bg-whatcyber-darker text-slate-100 overflow-hidden">
            <Sidebar
                selectedSource="all"
                onSourceSelect={() => { }}
                timeFilter="all"
                onTimeFilterChange={() => { }}
                threatFilters={[]}
                onThreatFilterChange={() => { }}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex-1 flex flex-col overflow-hidden relative transition-all duration-300">
                <Header
                    onSearch={() => { }}
                    bookmarkCount={0}
                    onBookmarksClick={() => { }}
                    onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
                    isSidebarOpen={sidebarOpen}
                />

                <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700 bg-whatcyber-darker">
                    <div className="max-w-7xl mx-auto space-y-8">

                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500">
                                    Threat Intelligence Dashboard
                                </h1>
                                <p className="text-slate-400 mt-2">
                                    Visualizing the global threat landscape and top weaknesses.
                                </p>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        ) : (
                            <Tabs defaultValue="map" className="space-y-6">
                                <TabsList className="bg-slate-800 border-slate-700">
                                    <TabsTrigger value="map" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Global Threat Map</TabsTrigger>
                                    <TabsTrigger value="cwe" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">CWE</TabsTrigger>
                                    <TabsTrigger value="industries" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Targeted Industries</TabsTrigger>
                                    <TabsTrigger value="malware" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Malware Landscape</TabsTrigger>
                                </TabsList>

                                <TabsContent value="map">
                                    <GlobalThreatMap />
                                </TabsContent>

                                <TabsContent value="cwe" className="space-y-6">
                                    <Card className="bg-slate-800 border-slate-700 backdrop-blur-sm shadow-xl">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-slate-100">Top 25 CWEs</CardTitle>
                                                    <CardDescription className="text-slate-400">
                                                        Most prevalent weaknesses based on CVE counts (past 1 year), including KEV correlation.
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-[400px] w-full mb-8 mt-2">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={topCwes?.slice(0, 15)} // Show top 15 for better visibility in chart
                                                        layout="vertical"
                                                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={true} opacity={0.3} />
                                                        <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                                                        <YAxis
                                                            type="category"
                                                            dataKey="cweId"
                                                            stroke="#94a3b8"
                                                            tick={{ fill: '#94a3b8' }}
                                                            width={70}
                                                            tickLine={false}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                                            itemStyle={{ color: '#f1f5f9' }}
                                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                                            formatter={(value: number) => [value.toLocaleString(), 'CVE Count']}
                                                        />
                                                        <Bar dataKey="cveCount" radius={[0, 4, 4, 0]} barSize={20}>
                                                            {topCwes?.slice(0, 15).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill="#10b981" />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left text-slate-300">
                                                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                                                        <tr>
                                                            <th className="px-6 py-3 rounded-tl-lg">Rank</th>
                                                            <th className="px-6 py-3">CWE-ID</th>
                                                            <th className="px-6 py-3">Name / Description</th>
                                                            <th className="px-6 py-3 text-right">CVE Count</th>
                                                            <th className="px-6 py-3 text-right">KEV Count</th>
                                                            <th className="px-6 py-3 text-right rounded-tr-lg">KEV/CVE Ratio</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {topCwes && topCwes.length > 0 ? (
                                                            topCwes.map((cwe, index) => (
                                                                <tr key={cwe.cweId} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                                                                    <td className="px-6 py-4 font-medium text-slate-100">#{index + 1}</td>
                                                                    <td className="px-6 py-4 font-mono text-emerald-400">{cwe.cweId}</td>
                                                                    <td className="px-6 py-4 font-medium text-slate-200">{cwe.name}</td>
                                                                    <td className="px-6 py-4 text-right font-mono">{cwe.cveCount.toLocaleString()}</td>
                                                                    <td className="px-6 py-4 text-right font-mono text-amber-400">{cwe.kevCount.toLocaleString()}</td>
                                                                    <td className="px-6 py-4 text-right font-mono">
                                                                        {(cwe.kevToCveRatio * 100).toFixed(2)}%
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                                                    No data available
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="industries">
                                    <IndustryWidget onArticleClick={setSelectedArticleUrl} />
                                </TabsContent>

                                <TabsContent value="malware">
                                    <MalwareWidget onArticleClick={setSelectedArticleUrl} />
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>
                </main>
            </div >
            <ArticleViewer
                articleUrl={selectedArticleUrl}
                onClose={() => setSelectedArticleUrl(null)}
            />
        </div >
    );
}
