
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Calendar, ExternalLink, Newspaper, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { KnownExploitedVulnerability } from '@shared/schema';

interface KEVCardProps {
    kev: KnownExploitedVulnerability & { cvssV3Score?: number | null; cvssV3Severity?: string | null };
    onRelatedNewsClick: (cveID: string) => void;
}

export function KEVCard({ kev, onRelatedNewsClick }: KEVCardProps) {
    // Determine CVSS score color
    const getScoreColor = (score: number | null) => {
        if (!score) return 'text-slate-500 border-slate-500';
        if (score >= 9.0) return 'text-red-500 border-red-500'; // Critical
        if (score >= 7.0) return 'text-orange-500 border-orange-500'; // High
        if (score >= 4.0) return 'text-yellow-500 border-yellow-500'; // Medium
        return 'text-green-500 border-green-500'; // Low
    };

    const score = kev.cvssV3Score || 0;
    const scoreColorClass = getScoreColor(kev.cvssV3Score ?? null);

    // Circular progress calculation
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 10) * circumference;

    return (
        <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all duration-200 h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-xl text-slate-100 font-mono tracking-tight hover:underline decoration-whatcyber-teal/50 underline-offset-4 cursor-pointer">
                            {kev.cveID}
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-medium line-clamp-1">
                            {kev.vendorProject} - {kev.product}
                        </CardDescription>
                    </div>

                    {/* Circular CVSS Indicator */}
                    <div className="relative flex items-center justify-center w-14 h-14">
                        <svg className="transform -rotate-90 w-full h-full">
                            <circle
                                className="text-slate-700"
                                strokeWidth="4"
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx="28"
                                cy="28"
                            />
                            <circle
                                className={`transition-all duration-1000 ease-out ${scoreColorClass.split(' ')[0]}`}
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx="28"
                                cy="28"
                            />
                        </svg>
                        <span className={`absolute text-sm font-bold ${scoreColorClass.split(' ')[0]}`}>
                            {kev.cvssV3Score ? kev.cvssV3Score.toFixed(1) : 'N/A'}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-grow py-2 space-y-3">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 flex items-center gap-1 text-[10px] px-2 py-0.5 h-6">
                        <Activity className="w-3 h-3" />
                        Active Exploitation
                    </Badge>
                    {kev.knownRansomwareCampaignUse === 'Known' && (
                        <Badge variant="outline" className="text-orange-400 border-orange-400/30 bg-orange-500/5 flex items-center gap-1 text-[10px] px-2 py-0.5 h-6">
                            <AlertTriangle className="w-3 h-3" />
                            Ransomware
                        </Badge>
                    )}
                </div>
            </CardContent>

            <CardFooter className="pt-2 pb-4 flex justify-between items-center border-t border-slate-700/50 mt-auto">
                <div className="text-xs text-slate-500 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(kev.dateAdded), 'MMM dd, yyyy')}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-whatcyber-teal hover:text-whatcyber-teal hover:bg-whatcyber-teal/10 px-2"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRelatedNewsClick(kev.cveID);
                    }}
                >
                    <Newspaper className="w-3 h-3 mr-1.5" />
                    Related News
                </Button>
            </CardFooter>
        </Card>
    );
}
