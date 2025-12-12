
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Calendar, ExternalLink, Newspaper, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { KnownExploitedVulnerability } from '@shared/schema';

interface KEVCardProps {
    kev: KnownExploitedVulnerability;
    onRelatedNewsClick: (cveID: string) => void;
}

export function KEVCard({ kev, onRelatedNewsClick }: KEVCardProps) {
    // Determine due date status
    const isOverdue = kev.dueDate ? new Date(kev.dueDate) < new Date() : false;

    return (
        <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all duration-200">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg text-slate-100 font-mono">
                                {kev.cveID}
                            </CardTitle>
                            <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                Active Exploitation
                            </Badge>
                            {kev.knownRansomwareCampaignUse === 'Known' && (
                                <Badge variant="outline" className="text-orange-400 border-orange-400/30 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Ransomware Linked
                                </Badge>
                            )}
                        </div>
                        <CardDescription className="text-slate-400 font-medium">
                            {kev.vendorProject} - {kev.product}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-1">Vulnerability</h4>
                    <p className="text-sm text-slate-400">{kev.vulnerabilityName}</p>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-md border border-slate-700/50">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Required Action</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                        {kev.requiredAction}
                    </p>
                    <div className="flex items-center mt-3 text-xs">
                        <Calendar className={`w-3 h-3 mr-1 ${isOverdue ? 'text-red-400' : 'text-slate-500'}`} />
                        <span className={isOverdue ? 'text-red-400 font-medium' : 'text-slate-500'}>
                            Due: {kev.dueDate ? format(new Date(kev.dueDate), 'MMM dd, yyyy') : 'N/A'}
                        </span>
                    </div>
                </div>

                <div className="border-t border-slate-700/50 pt-3">
                    <p className="text-sm text-slate-400 line-clamp-2">
                        {kev.shortDescription}
                    </p>
                </div>
            </CardContent>

            <CardFooter className="pt-0 flex justify-between items-center">
                <div className="text-xs text-slate-500 flex items-center">
                    Added: {format(new Date(kev.dateAdded), 'MMM dd, yyyy')}
                </div>

                <Button
                    variant="secondary"
                    size="sm"
                    className="bg-whatcyber-teal/10 text-whatcyber-teal hover:bg-whatcyber-teal/20 hover:text-whatcyber-teal border border-whatcyber-teal/20"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRelatedNewsClick(kev.cveID);
                    }}
                >
                    <Newspaper className="w-3 h-3 mr-2" />
                    See Related News
                </Button>
            </CardFooter>
        </Card>
    );
}
