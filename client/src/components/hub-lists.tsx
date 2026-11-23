import { Link } from 'wouter';
import { cveUrl } from '@/lib/urls';
import { longDate } from '@/lib/cve-summary';
import type { HubCve, HubKev, HubNews, SeverityCounts } from '../../../server/services/hub-data';

/** Shared pieces of the vendor and CWE pages (WHA-24). */

const severityTone: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-green-500/15 text-green-400 border-green-500/30',
};

export function SeverityStrip({ severity }: { severity: SeverityCounts }) {
  const total = severity.CRITICAL + severity.HIGH + severity.MEDIUM + severity.LOW;
  if (!total) return null;
  return (
    <div className="flex flex-wrap gap-2" aria-label="CVEs by severity">
      {(Object.keys(severity) as (keyof SeverityCounts)[]).map((level) => (
        <span key={level} className={`rounded-md border px-3 py-1 text-sm ${severityTone[level]}`}>
          {severity[level].toLocaleString('en-US')} {level.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

export function HubCveList({ rows }: { rows: HubCve[] }) {
  return (
    <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
      {rows.map((cve) => (
        <li key={cve.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <Link href={cveUrl(cve.id)} className="font-mono text-sm text-whatcyber-teal hover:underline">
            {cve.id}
          </Link>
          <span className="flex items-center gap-3 text-xs text-slate-400">
            {cve.severity && (
              <span className={`rounded border px-2 py-0.5 ${severityTone[cve.severity.toUpperCase()] ?? 'border-slate-600 text-slate-300'}`}>
                {cve.severity}
                {cve.score != null ? ` ${cve.score}` : ''}
              </span>
            )}
            {cve.publishedDate && <span>{longDate(cve.publishedDate)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function HubKevList({ rows }: { rows: HubKev[] }) {
  return (
    <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
      {rows.map((entry) => (
        <li key={entry.cveId} className="space-y-1 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={cveUrl(entry.cveId)} className="font-mono text-sm text-whatcyber-teal hover:underline">
              {entry.cveId}
            </Link>
            {entry.knownRansomwareCampaignUse === 'Known' && (
              <span className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-xs text-orange-400">Ransomware linked</span>
            )}
            {entry.dateAdded && <span className="text-xs text-slate-500">added {longDate(entry.dateAdded)}</span>}
          </div>
          <p className="text-sm text-slate-300">
            {[entry.vendorProject, entry.product].filter(Boolean).join(' ')} &ndash; {entry.vulnerabilityName}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function HubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">{title}</h2>
      {children}
    </section>
  );
}

export function HubNewsList({ rows }: { rows: HubNews[] }) {
  return (
    <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
      {rows.map((item) => (
        <li key={item.url} className="px-4 py-3">
          <a href={item.url} target="_blank" rel="nofollow noopener noreferrer" className="text-sm font-medium text-slate-200 hover:text-whatcyber-teal">
            {item.title}
          </a>
          <div className="mt-1 text-xs text-slate-500">
            {item.source}
            {item.publishedAt ? ` · ${longDate(item.publishedAt)}` : ''}
          </div>
        </li>
      ))}
    </ul>
  );
}
