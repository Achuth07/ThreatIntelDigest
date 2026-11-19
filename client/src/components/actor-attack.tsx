import { useState } from "react";
import { Bug, ExternalLink, Layers, Package, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cveUrl } from "@/lib/urls";

// Sections of the threat actor page built from MITRE ATT&CK and news links (WHA-55).

export interface ActorTechnique { attackId: string; name: string; tactics: string[]; isSubtechnique: boolean; procedure: string }
export interface ActorSoftwareItem { attackId: string; name: string; type: "malware" | "tool"; aliases: string[]; procedure: string }
export interface ActorCve {
    cveId: string;
    source: "attack" | "news";
    confidence: "high" | "low";
    evidence: string;
    evidenceUrl: string | null;
    evidenceCount: number;
    inKev: boolean;
    cvssV3Score: number | null;
    cvssV3Severity: string | null;
}

// ATT&CK v20 matrix order. Tactics not listed here sort after these.
const TACTICS: [string, string][] = [
    ["reconnaissance", "Reconnaissance"], ["resource-development", "Resource Development"], ["initial-access", "Initial Access"],
    ["execution", "Execution"], ["persistence", "Persistence"], ["privilege-escalation", "Privilege Escalation"],
    ["stealth", "Stealth"], ["defense-impairment", "Defense Impairment"], ["defense-evasion", "Defense Evasion"],
    ["credential-access", "Credential Access"], ["discovery", "Discovery"], ["lateral-movement", "Lateral Movement"],
    ["collection", "Collection"], ["command-and-control", "Command and Control"], ["exfiltration", "Exfiltration"], ["impact", "Impact"],
];

const tacticName = (id: string) => TACTICS.find(([key]) => key === id)?.[1] ?? id.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const tacticRank = (id: string) => { const i = TACTICS.findIndex(([key]) => key === id); return i === -1 ? TACTICS.length : i; };
const techniqueUrl = (attackId: string) => `https://attack.mitre.org/techniques/${attackId.replace(".", "/")}/`;

const SEVERITY_STYLE: Record<string, string> = {
    CRITICAL: "border-red-500/40 text-red-400",
    HIGH: "border-orange-500/40 text-orange-400",
    MEDIUM: "border-yellow-500/40 text-yellow-400",
    LOW: "border-green-500/40 text-green-400",
};

export function ActorCves({ cves, actorName }: { cves: ActorCve[]; actorName: string }) {
    const [showAll, setShowAll] = useState(false);
    if (cves.length === 0) return null;
    const visible = showAll ? cves : cves.slice(0, 10);
    const confirmed = cves.filter(cve => cve.confidence === "high").length;

    return (
        <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                <Bug className="w-5 h-5 text-whatcyber-teal" />
                Exploited vulnerabilities
                <span className="text-sm font-normal text-slate-500">({cves.length})</span>
            </h2>
            <p className="text-sm text-slate-400">
                {confirmed > 0 && <>{confirmed} reported by MITRE ATT&CK. </>}
                {cves.length > confirmed && <>Others are named alongside {actorName} in news, which is not a confirmed attribution.</>}
            </p>
            <div className="space-y-3">
                {visible.map(cve => (
                    <div key={cve.cveId} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <a href={cveUrl(cve.cveId)} className="font-mono text-sm font-semibold text-whatcyber-teal hover:underline">{cve.cveId}</a>
                            {cve.cvssV3Severity && (
                                <Badge variant="outline" className={`text-[11px] ${SEVERITY_STYLE[cve.cvssV3Severity] ?? ""}`}>
                                    {cve.cvssV3Severity}{cve.cvssV3Score !== null ? ` ${cve.cvssV3Score.toFixed(1)}` : ""}
                                </Badge>
                            )}
                            {cve.inKev && (
                                <Badge variant="outline" className="border-red-500/40 text-[11px] text-red-400">
                                    <ShieldAlert className="mr-1 h-3 w-3" />CISA KEV
                                </Badge>
                            )}
                            <span className={`ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium ${cve.confidence === "high" ? "bg-whatcyber-teal/10 text-whatcyber-teal" : "bg-slate-700/60 text-slate-300"}`}>
                                {cve.confidence === "high" ? "MITRE ATT&CK" : "Named in news"}
                            </span>
                        </div>
                        {cve.evidence && (
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                {cve.confidence === "high" ? <>&ldquo;{cve.evidence}&rdquo;</> : cve.evidence}
                                {cve.evidenceUrl && (
                                    <a href={cve.evidenceUrl} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center text-slate-500 hover:text-slate-300" aria-label="Source">
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                                {cve.confidence === "low" && cve.evidenceCount > 1 && <span className="text-slate-500"> (+{cve.evidenceCount - 1} more articles)</span>}
                            </p>
                        )}
                    </div>
                ))}
            </div>
            {cves.length > visible.length && (
                <button type="button" onClick={() => setShowAll(true)} className="text-sm text-whatcyber-teal hover:underline">
                    Show all {cves.length}
                </button>
            )}
        </section>
    );
}

export function ActorTechniques({ techniques }: { techniques: ActorTechnique[] }) {
    if (techniques.length === 0) return null;
    // A technique can serve several tactics; it is listed under each.
    const byTactic = new Map<string, ActorTechnique[]>();
    for (const technique of techniques) {
        for (const tactic of technique.tactics.length ? technique.tactics : ["other"]) {
            byTactic.set(tactic, [...(byTactic.get(tactic) ?? []), technique]);
        }
    }
    const tactics = [...byTactic.keys()].sort((a, b) => tacticRank(a) - tacticRank(b));

    return (
        <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-5 h-5 text-whatcyber-teal" />
                ATT&CK techniques
                <span className="text-sm font-normal text-slate-500">({techniques.length})</span>
            </h2>
            <div className="space-y-2">
                {tactics.map(tactic => (
                    <details key={tactic} className="group rounded-lg border border-border bg-card">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-200">
                            {tacticName(tactic)}
                            <span className="text-xs text-slate-500">{byTactic.get(tactic)!.length}</span>
                        </summary>
                        <ul className="divide-y divide-border border-t border-border">
                            {byTactic.get(tactic)!.map(technique => (
                                <li key={technique.attackId} className="px-4 py-3">
                                    <a href={techniqueUrl(technique.attackId)} target="_blank" rel="noreferrer" className="text-sm text-slate-200 hover:text-whatcyber-teal">
                                        <span className="mr-2 font-mono text-xs text-slate-500">{technique.attackId}</span>
                                        {technique.name}
                                    </a>
                                    {technique.procedure && <p className="mt-1 text-xs leading-relaxed text-slate-400">{technique.procedure}</p>}
                                </li>
                            ))}
                        </ul>
                    </details>
                ))}
            </div>
        </section>
    );
}

export function ActorSoftware({ software }: { software: ActorSoftwareItem[] }) {
    const [showAll, setShowAll] = useState(false);
    if (software.length === 0) return null;
    const visible = showAll ? software : software.slice(0, 12);
    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                    <Package className="w-4 h-4 text-whatcyber-teal" />
                    Malware and tools
                    <span className="text-sm font-normal text-slate-500">({software.length})</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {visible.map(item => (
                        <li key={item.attackId} className="flex items-center justify-between gap-2 text-sm" title={item.procedure || undefined}>
                            <a href={`https://attack.mitre.org/software/${item.attackId}/`} target="_blank" rel="noreferrer" className="truncate text-slate-200 hover:text-whatcyber-teal">
                                {item.name}
                            </a>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${item.type === "malware" ? "bg-red-500/10 text-red-400" : "bg-slate-700/60 text-slate-300"}`}>
                                {item.type}
                            </span>
                        </li>
                    ))}
                </ul>
                {software.length > visible.length && (
                    <button type="button" onClick={() => setShowAll(true)} className="mt-3 text-sm text-whatcyber-teal hover:underline">
                        Show all {software.length}
                    </button>
                )}
            </CardContent>
        </Card>
    );
}
