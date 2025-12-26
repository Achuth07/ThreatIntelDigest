import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { useState, useMemo } from "react";
import Tree from 'react-d3-tree';
import * as React from "react";

// Types
interface AttackVectorStat {
    name: string;
    value: number;
    category: string;
}

// Tree Data Interface
interface TreeNode {
    name: string;
    attributes?: Record<string, string | number>;
    children?: TreeNode[];
}

export default function Dashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const { data: stats, isLoading } = useQuery<AttackVectorStat[]>({
        queryKey: ["/api/stats/attack-vectors"],
        refetchOnWindowFocus: false
    });

    // Transform Data for Tree
    const treeData = useMemo<TreeNode[] | undefined>(() => {
        if (!stats || stats.length === 0) return undefined;

        // Group by Category
        const categories: Record<string, TreeNode[]> = {};

        stats.forEach(stat => {
            if (!categories[stat.category]) {
                categories[stat.category] = [];
            }
            categories[stat.category].push({
                name: stat.name, // CWE Name
                attributes: {
                    "Count": stat.value
                }
            });
        });

        // Create Root Node
        const rootChildren: TreeNode[] = Object.entries(categories).map(([category, children]) => ({
            name: category,
            children: children,
            attributes: {
                "Total": children.reduce((sum, child) => sum + (child.attributes?.Count as number || 0), 0)
            }
        }));

        return [{
            name: "Attack Vectors",
            children: rootChildren
        }];
    }, [stats]);


    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
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

                <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700">
                    <div className="max-w-7xl mx-auto space-y-8">

                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                                    Threat Intelligence Dashboard
                                </h1>
                                <p className="text-gray-400 mt-2">
                                    Visualizing the global threat landscape and attack vectors.
                                </p>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">

                                {/* Attack Vectors Tree Visualization */}
                                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm shadow-xl">
                                    <CardHeader>
                                        <CardTitle>Attack Types Taxonomy (Tidy Tree)</CardTitle>
                                        <CardDescription>
                                            Hierarchical view of software weaknesses (CWE). Click nodes to expand/collapse.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[600px] bg-slate-900/50 rounded-lg border border-slate-700/50 mx-4 mb-4 p-0 overflow-hidden relative">
                                        {treeData && (
                                            <div style={{ width: '100%', height: '100%' }}>
                                                <Tree
                                                    data={treeData}
                                                    orientation="horizontal"
                                                    pathFunc="step" // Clean step lines
                                                    translate={{ x: 100, y: 300 }} // Initial centering
                                                    zoomable={true}
                                                    draggable={true}
                                                    rootNodeClassName="node__root"
                                                    branchNodeClassName="node__branch"
                                                    leafNodeClassName="node__leaf"
                                                    renderCustomNodeElement={(rd3tProps) => {
                                                        const { nodeDatum, toggleNode } = rd3tProps;
                                                        const isRoot = nodeDatum.name === "Attack Vectors";
                                                        const isCategory = nodeDatum.children && !isRoot;

                                                        return (
                                                            <g>
                                                                <circle
                                                                    r={isRoot ? 20 : 10}
                                                                    fill={isRoot ? "#10b981" : isCategory ? "#3b82f6" : "#f59e0b"}
                                                                    onClick={toggleNode}
                                                                    className="cursor-pointer hover:stroke-white stroke-2"
                                                                />
                                                                <text
                                                                    fill="white"
                                                                    strokeWidth="0.5"
                                                                    x="20"
                                                                    dy="5"
                                                                    className="text-xs font-sans pointer-events-none select-none"
                                                                >
                                                                    {nodeDatum.name}
                                                                    {nodeDatum.attributes?.Count ? ` (Vulns: ${nodeDatum.attributes.Count})` : nodeDatum.attributes?.Total ? ` (Total: ${nodeDatum.attributes.Total})` : ''}
                                                                </text>
                                                            </g>
                                                        )
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Summary Stats Table */}
                                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle>Top Prevalent Weaknesses</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {stats?.slice(0, 9).map((stat, i) => (
                                                <div key={i} className="flex flex-col p-4 rounded-lg bg-gray-700/30 border border-gray-700 hover:border-blue-500/50 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-mono text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">{stat.category}</span>
                                                        <span className="text-xl font-bold text-white">{stat.value}</span>
                                                    </div>
                                                    <span className="text-sm text-slate-300 line-clamp-2" title={stat.name}>{stat.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
