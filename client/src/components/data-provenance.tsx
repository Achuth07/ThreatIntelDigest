import { longDate } from '@/lib/cve-summary';
import { cveSources, sourcesFor, type HubKind, type Source } from '@/lib/provenance';

/**
 * When the page's data last changed and where it comes from (WHA-28). Shown at the foot of every
 * hub page, with the same wording as the server-rendered copy.
 */

function SourceLinks({ sources }: { sources: Source[] }) {
  return (
    <>
      {sources.map((source, i) => (
        <span key={source.url}>
          {i > 0 && ', '}
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-whatcyber-teal hover:underline">
            {source.name}
          </a>
        </span>
      ))}
    </>
  );
}

export function DataProvenance({ kind, latest, label = 'Latest entry' }: { kind: HubKind; latest?: unknown; label?: string }) {
  const date = latest ? longDate(latest) : '';
  return (
    <p className="mt-10 border-t border-slate-800 pt-4 text-xs text-slate-500">
      {date ? `${label}: ${date}. ` : ''}Sources: <SourceLinks sources={sourcesFor(kind)} />.
    </p>
  );
}

/** Primary sources for one CVE: NVD, the CISA catalog entry when listed, and the CVE Program record. */
export function CveSources({ cveId, isKev }: { cveId: string; isKev: boolean }) {
  return (
    <p className="text-xs text-slate-500">
      Primary sources: <SourceLinks sources={cveSources(cveId, isKev)} />.
    </p>
  );
}
