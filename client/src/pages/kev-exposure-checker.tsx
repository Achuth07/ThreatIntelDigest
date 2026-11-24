import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Download, Link2, Plus, Search, X } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { SEO } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STATIC_PAGE_META } from '@/lib/page-meta';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { EXPOSURE_ANSWER, EXPOSURE_FAQ, EXPOSURE_TOOL_PATH } from '@/lib/exposure-content';
import { cveUrl } from '@/lib/urls';
import {
  daysBetween,
  dueStatus,
  parseStack,
  sortEntries,
  stackItemKey,
  summarize,
  toCsv,
  NEW_DAYS,
  type DueStatus,
  type ExposureEntry,
  type ExposureSort,
  type StackItem,
} from '@/lib/exposure';

interface CatalogVendor {
  vendor: string;
  count: number;
  products: { product: string; count: number }[];
}

/** The ?item= values of the address, as a stack. */
function readStack(): StackItem[] {
  if (typeof window === 'undefined') return [];
  return parseStack(new URLSearchParams(window.location.search).getAll('item'));
}

const DUE_STYLE: Record<DueStatus, string> = {
  past: 'border-red-500/40 bg-red-500/10 text-red-300',
  soon: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  later: 'border-slate-600 bg-slate-800/50 text-slate-300',
  none: 'border-slate-700 bg-slate-800/30 text-slate-500',
};

function dueLabel(due: string | null, status: DueStatus, now: Date): string {
  if (!due) return 'No due date';
  const days = daysBetween(due, now);
  if (status === 'past') return `${due} (${-days} day${days === -1 ? '' : 's'} past)`;
  if (days === 0) return `${due} (today)`;
  return `${due} (in ${days} day${days === 1 ? '' : 's'})`;
}

const EXAMPLE_STACK: StackItem[] = [
  { vendor: 'Microsoft', product: '' },
  { vendor: 'Cisco', product: '' },
  { vendor: 'Fortinet', product: '' },
];

export default function KevExposureCheckerPage() {
  const [stack, setStack] = useState<StackItem[]>(readStack);
  const [catalog, setCatalog] = useState<CatalogVendor[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [entries, setEntries] = useState<ExposureEntry[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [ransomwareOnly, setRansomwareOnly] = useState(false);
  const [sort, setSort] = useState<ExposureSort>('due');
  const [copied, setCopied] = useState(false);
  const now = useMemo(() => new Date(), []);

  // The page has no data to wait for before it can show, so the server copy goes right away.
  useSsrHandoff(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/kev/catalog')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('catalog'))))
      .then((data) => !cancelled && setCatalog(data.vendors ?? []))
      .catch(() => !cancelled && setCatalogError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // The address holds the stack, so a result can be shared as a link.
  useEffect(() => {
    try {
      const params = new URLSearchParams();
      stack.forEach((item) => params.append('item', stackItemKey(item)));
      const search = params.toString();
      window.history.replaceState(null, '', `${EXPOSURE_TOOL_PATH}${search ? `?${search}` : ''}`);
    } catch {
      /* the address is a convenience only */
    }
  }, [stack]);

  const stackKey = stack.map(stackItemKey).join('\n');
  useEffect(() => {
    if (stack.length === 0) {
      setEntries([]);
      setTruncated(false);
      setError('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    stack.forEach((item) => params.append('item', stackItemKey(item)));
    fetch(`/api/kev/exposure?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('exposure'))))
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries ?? []);
        setTruncated(!!data.truncated);
      })
      .catch(() => !cancelled && setError('Could not load the KEV entries. Try again in a moment.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stackKey]);

  const add = useCallback((item: StackItem) => {
    setStack((current) => parseStack([...current.map(stackItemKey), stackItemKey(item)]));
    setQuery('');
  }, []);
  const remove = (item: StackItem) => setStack((current) => current.filter((c) => stackItemKey(c) !== stackItemKey(item)));

  /** What the search box offers: matching vendors (all products) and "vendor product" pairs. */
  const suggestions = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!catalog || text.length < 1) return [];
    const taken = new Set(stack.map((s) => stackItemKey(s).toLowerCase()));
    const out: { item: StackItem; label: string; count: number }[] = [];
    for (const v of catalog) {
      const vendorHit = v.vendor.toLowerCase().includes(text);
      if (vendorHit && !taken.has(v.vendor.toLowerCase())) out.push({ item: { vendor: v.vendor, product: '' }, label: `${v.vendor} (all products)`, count: v.count });
      for (const p of v.products) {
        const pair = `${v.vendor} ${p.product}`.toLowerCase();
        if (pair.includes(text) && (!vendorHit || text.length > v.vendor.length) && !taken.has(`${v.vendor}|${p.product}`.toLowerCase())) {
          out.push({ item: { vendor: v.vendor, product: p.product }, label: `${v.vendor} · ${p.product}`, count: p.count });
        }
      }
      if (out.length >= 40) break;
    }
    return out.slice(0, 8);
  }, [catalog, query, stack]);

  const popular = useMemo(() => (catalog ?? []).slice(0, 10), [catalog]);

  const shown = useMemo(() => sortEntries(ransomwareOnly ? entries.filter((e) => e.ransomware) : entries, sort), [entries, ransomwareOnly, sort]);
  const summary = useMemo(() => summarize(entries, now), [entries, now]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard can be blocked; nothing to do */
    }
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(shown)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kev-exposure-${now.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO {...STATIC_PAGE_META[EXPOSURE_TOOL_PATH]} />
      <div className="mx-auto max-w-5xl space-y-10 p-4 pb-20 lg:p-8">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">KEV exposure checker</h1>
          <p className="max-w-3xl text-slate-400">{EXPOSURE_ANSWER}</p>
        </div>

        <section aria-labelledby="stack-heading" className="space-y-4">
          <h2 id="stack-heading" className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">
            What do you run?
          </h2>
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && suggestions[0]) {
                  e.preventDefault();
                  add(suggestions[0].item);
                }
              }}
              placeholder="Search a vendor or product, such as Microsoft or Fortinet FortiOS"
              aria-label="Search a vendor or product"
              className="bg-card pl-9"
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="stack-suggestions"
              autoComplete="off"
              spellCheck={false}
            />
            {suggestions.length > 0 && (
              <ul id="stack-suggestions" role="listbox" className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
                {suggestions.map(({ item, label, count }) => (
                  <li key={stackItemKey(item)} role="option" aria-selected={false}>
                    <button type="button" onClick={() => add(item)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800">
                      <span className="flex min-w-0 items-center gap-2">
                        <Plus className="h-3.5 w-3.5 shrink-0 text-whatcyber-teal" aria-hidden />
                        <span className="truncate">{label}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">{count} KEV</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {catalogError && <p className="mt-2 text-xs text-red-400">The vendor list could not be loaded. Reload the page to try again.</p>}
          </div>

          {stack.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Your vendors and products">
              {stack.map((item) => (
                <li key={stackItemKey(item)} className="flex items-center gap-1 rounded-full border border-whatcyber-teal/40 bg-whatcyber-teal/10 py-1 pl-3 pr-1 text-sm text-whatcyber-teal">
                  <span>{item.product ? `${item.vendor} · ${item.product}` : item.vendor}</span>
                  <button type="button" onClick={() => remove(item)} aria-label={`Remove ${item.vendor}${item.product ? ` ${item.product}` : ''}`} className="rounded-full p-1 hover:bg-whatcyber-teal/20">
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => setStack([])} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-300">
                  Clear all
                </button>
              </li>
            </ul>
          ) : (
            <div className="space-y-2 text-sm text-slate-400">
              <p>
                Add one or more vendors or products.{' '}
                <button type="button" onClick={() => setStack(EXAMPLE_STACK)} className="text-whatcyber-teal hover:underline">
                  Try an example
                </button>{' '}
                or start from a vendor with many exploited flaws:
              </p>
              <div className="flex flex-wrap gap-2">
                {popular.map((v) => (
                  <button
                    key={v.vendor}
                    type="button"
                    onClick={() => add({ vendor: v.vendor, product: '' })}
                    className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-slate-300 transition-colors hover:border-slate-500"
                  >
                    {v.vendor} <span className="text-xs text-slate-500">{v.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {stack.length > 0 && (
          <section aria-labelledby="results-heading" className="space-y-5">
            <h2 id="results-heading" className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">
              Exploited vulnerabilities in your stack
            </h2>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {!error && (
              <>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5" aria-live="polite">
                  {[
                    { label: 'In KEV', value: summary.total, tone: 'text-slate-100' },
                    { label: 'Past CISA due date', value: summary.pastDue, tone: summary.pastDue ? 'text-red-300' : 'text-slate-100' },
                    { label: `Due in 14 days`, value: summary.dueSoon, tone: summary.dueSoon ? 'text-orange-300' : 'text-slate-100' },
                    { label: `Added in ${NEW_DAYS} days`, value: summary.addedRecently, tone: 'text-slate-100' },
                    { label: 'Used in ransomware', value: summary.ransomware, tone: summary.ransomware ? 'text-red-300' : 'text-slate-100' },
                  ].map((tile) => (
                    <div key={tile.label} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                      <dt className="text-xs text-slate-500">{tile.label}</dt>
                      <dd className={`font-mono text-2xl font-bold ${tile.tone}`}>{loading ? '…' : tile.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                    <label className="flex items-center gap-2">
                      Sort by
                      <select value={sort} onChange={(e) => setSort(e.target.value as ExposureSort)} className="rounded-md border border-slate-700 bg-card px-2 py-1 text-sm">
                        <option value="due">CISA due date</option>
                        <option value="added">Date added</option>
                        <option value="score">CVSS score</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={ransomwareOnly} onChange={(e) => setRansomwareOnly(e.target.checked)} />
                      Ransomware use only
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={copyLink} className="border-slate-600 text-slate-300">
                      <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      {copied ? 'Link copied' : 'Copy link'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={shown.length === 0} className="border-slate-600 text-slate-300">
                      <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Export CSV
                    </Button>
                  </div>
                </div>

                {!loading && shown.length === 0 && <p className="text-sm text-slate-400">{entries.length === 0 ? 'No KEV entries match these names. Pick them from the list so they match the names CISA uses.' : 'No entries match the filter.'}</p>}

                <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
                  {shown.map((entry) => {
                    const status = dueStatus(entry.dueDate, now);
                    return (
                      <li key={entry.cveId} className="space-y-1.5 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Link href={cveUrl(entry.cveId)} className="font-mono text-sm font-semibold text-whatcyber-teal hover:underline">
                            {entry.cveId}
                          </Link>
                          <span className="text-xs text-slate-500">
                            {entry.vendor} · {entry.product}
                          </span>
                          {entry.ransomware && <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">Ransomware use</span>}
                        </div>
                        <p className="text-sm text-slate-300">{entry.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={`rounded-md border px-2 py-0.5 ${DUE_STYLE[status]}`}>Due {dueLabel(entry.dueDate, status, now)}</span>
                          <span className="text-slate-500">Added {entry.dateAdded ?? 'unknown'}</span>
                          {entry.cvssScore != null && <span className="text-slate-500">CVSS {entry.cvssScore.toFixed(1)}</span>}
                          {entry.epss != null && <span className="text-slate-500">EPSS {(entry.epss * 100).toFixed(1)}%</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {truncated && <p className="text-xs text-slate-500">Showing the first 1,000 entries. Narrow the list to a product to see the rest.</p>}
                <p className="text-xs text-slate-500">
                  This is every exploited flaw CISA lists for these names, not the ones missing on your systems. Check each against the versions you run.
                </p>
              </>
            )}
          </section>
        )}

        <section aria-labelledby="exposure-faq" className="space-y-4">
          <h2 id="exposure-faq" className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">
            Frequently asked questions
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {EXPOSURE_FAQ.map(({ question, answer }) => (
              <div key={question}>
                <h3 className="text-base font-semibold text-slate-200">{question}</h3>
                <p className="mt-1 text-sm text-slate-400">{answer}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="border-t border-slate-800 pt-4 text-xs text-slate-500">
          Data: the{' '}
          <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer" className="text-whatcyber-teal hover:underline">
            CISA Known Exploited Vulnerabilities catalog
          </a>
          , with scores from the National Vulnerability Database and FIRST EPSS. Browse the full list in the{' '}
          <Link href="/cisa-kev" className="text-whatcyber-teal hover:underline">
            KEV catalog
          </Link>{' '}
          or by{' '}
          <Link href="/vendors" className="text-whatcyber-teal hover:underline">
            vendor
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
