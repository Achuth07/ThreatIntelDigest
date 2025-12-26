import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { useState } from "react";
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

function IndustryWidget() {
    const { data: industries, isLoading } = useQuery<IndustryStat[]>({
        queryKey: ["/api/stats/industries"],
    });

    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;

    // Find max value for bar scaling
    const maxVal = Math.max(...(industries?.map(i => i.value) || [0]));

    return (
        <Card className="bg-slate-800 border-slate-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
                <CardTitle className="text-slate-100">Targeted Industries (Victimology)</CardTitle>
                <CardDescription className="text-slate-400">
                    Sectors most frequently targeted in analyzed threat reports.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {industries?.map((industry) => (
                        <div key={industry.name} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-200">{industry.name}</span>
                                <span className="text-slate-400 font-mono">{industry.value}</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(industry.value / maxVal) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {!industries?.length && (
                        <p className="text-slate-500 text-center py-4">No industry data available yet.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

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
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
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
                            <>
                                <Card className="bg-slate-800 border-slate-700 backdrop-blur-sm shadow-xl">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-slate-100">Top 25 CWEs</CardTitle>
                                                <CardDescription className="text-slate-400">
                                                    Most prevalent weaknesses based on CVE counts, including KEV correlation.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
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
                                                                <td className="px-6 py-4 font-mono text-blue-400">{cwe.cweId}</td>
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

                                {/* Targeted Industries Widget */}
                                <IndustryWidget />
                            </>
                        )}
                    </div>
                </main>
            </div >
        </div >
    );
}
