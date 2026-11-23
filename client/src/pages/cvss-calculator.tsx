import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Check, Copy, Loader2, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { SEO } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STATIC_PAGE_META } from '@/lib/page-meta';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { CVSS4_TOOL_PATH, CVSS_ANSWER, CVSS_FAQ, CVSS_TOOL_PATH } from '@/lib/cvss-content';
import { DEFAULT_METRICS, EXAMPLES, METRICS, SEVERITY_RANGES, calculate, parseVector, toVectorString, type CvssVersion, type Metrics, type Severity } from '@/lib/cvss';
import { CVE_ID_PATTERN, cveUrl } from '@/lib/urls';

const SEVERITY_STYLE: Record<Severity, { ring: string; text: string }> = {
  None: { ring: 'border-slate-500', text: 'text-slate-300' },
  Low: { ring: 'border-green-500', text: 'text-green-400' },
  Medium: { ring: 'border-yellow-500', text: 'text-yellow-400' },
  High: { ring: 'border-orange-500', text: 'text-orange-400' },
  Critical: { ring: 'border-red-500', text: 'text-red-400' },
};

/** The vector in the address (?vector=...), so a result can be shared as a link. */
function vectorFromUrl() {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('vector');
  return raw ? parseVector(raw) : null;
}

export default function CvssCalculatorPage() {
  const initial = useMemo(vectorFromUrl, []);
  const [metrics, setMetrics] = useState<Metrics>(initial?.metrics ?? DEFAULT_METRICS);
  const [version, setVersion] = useState<CvssVersion>(initial?.version ?? '3.1');
  const [vectorText, setVectorText] = useState(toVectorString(initial?.metrics ?? DEFAULT_METRICS, initial?.version ?? '3.1'));
  const [vectorError, setVectorError] = useState('');
  const [copied, setCopied] = useState<'vector' | 'link' | null>(null);

  const [cveInput, setCveInput] = useState('');
  const [cveState, setCveState] = useState<{ status: 'idle' | 'loading' | 'error' | 'done'; id?: string; message?: string; published?: number | null }>({ status: 'idle' });

  // The page has no data to wait for, so the server-written copy can go as soon as the app is up.
  useSsrHandoff(true);

  const result = useMemo(() => calculate(metrics, version), [metrics, version]);
  const style = SEVERITY_STYLE[result.severity];
  const vector = toVectorString(metrics, version);

  // Keep the box and the address in step with the choices.
  useEffect(() => {
    setVectorText(vector);
    setVectorError('');
    try {
      window.history.replaceState(null, '', `${CVSS_TOOL_PATH}?vector=${encodeURIComponent(vector)}`);
    } catch {
      /* the address is a convenience only */
    }
  }, [vector]);

  const choose = (key: keyof Metrics, code: string) => setMetrics((current) => ({ ...current, [key]: code }));

  const applyVectorText = (text: string) => {
    setVectorText(text);
    const parsed = parseVector(text);
    if (parsed) {
      setMetrics(parsed.metrics);
      setVersion(parsed.version);
      setVectorError('');
    } else {
      setVectorError(
        /^CVSS:4\.0\//i.test(text.trim())
          ? 'This is a CVSS v4.0 vector. Open it in the CVSS 4.0 calculator.'
          : 'Not a complete CVSS v3 base vector. Example: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
      );
    }
  };

  const copy = async (what: 'vector' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'vector' ? vector : `${window.location.origin}${CVSS_TOOL_PATH}?vector=${encodeURIComponent(vector)}`);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard can be blocked; nothing to do */
    }
  };

  const loadCve = async (rawId: string) => {
    const id = rawId.trim().toUpperCase();
    if (!CVE_ID_PATTERN.test(id)) {
      setCveState({ status: 'error', message: 'Enter a CVE ID such as CVE-2024-3400.' });
      return;
    }
    setCveInput(id);
    setCveState({ status: 'loading', id });
    try {
      const res = await fetch(`/api/vulnerabilities/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      const nvd = data?.nvd ?? data;
      const parsed = nvd?.cvssVector ? parseVector(nvd.cvssVector) : null;
      if (!parsed) {
        setCveState({ status: 'error', id, message: `${id} has no CVSS v3 vector on record, so there is nothing to load.` });
        return;
      }
      setMetrics(parsed.metrics);
      setVersion(parsed.version);
      const published = nvd?.cvssV3Score != null ? Number(nvd.cvssV3Score) : null;
      setCveState({ status: 'done', id, published: Number.isFinite(published as number) ? published : null });
    } catch {
      setCveState({ status: 'error', id, message: `Could not find ${id}.` });
    }
  };

  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO {...STATIC_PAGE_META[CVSS_TOOL_PATH]} />
      <div className="mx-auto max-w-5xl space-y-10 p-4 pb-20 lg:p-8">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">CVSS calculator</h1>
          <p className="max-w-3xl text-slate-400">{CVSS_ANSWER}</p>
          <p className="text-sm text-slate-500">
            Scoring a CVSS v4.0 vector? Use the{' '}
            <Link href={CVSS4_TOOL_PATH} className="text-whatcyber-teal hover:underline">
              CVSS 4.0 calculator
            </Link>
            .
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Metrics */}
          <div className="space-y-6">
            {METRICS.map((metric) => {
              const selected = metric.values.find((v) => v.code === metrics[metric.key]);
              return (
                <fieldset key={metric.key} className="space-y-2">
                  <legend className="text-sm font-semibold text-slate-200">
                    {metric.name} <span className="font-normal text-slate-500">({metric.key})</span>
                  </legend>
                  <p className="text-xs text-slate-500">{metric.question}</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={metric.name}>
                    {metric.values.map((value) => {
                      const on = metrics[metric.key] === value.code;
                      return (
                        <button
                          key={value.code}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => choose(metric.key, value.code)}
                          className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                            on ? 'border-whatcyber-teal bg-whatcyber-teal/15 text-whatcyber-teal' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {value.label}
                        </button>
                      );
                    })}
                  </div>
                  {selected && <p className="text-sm text-slate-400">{selected.description}</p>}
                </fieldset>
              );
            })}
          </div>

          {/* Result */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
              <div className="flex items-center gap-4">
                <div className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 bg-slate-900 ${style.ring}`} aria-live="polite">
                  <span className={`font-mono text-3xl font-bold ${style.text}`}>{result.base.toFixed(1)}</span>
                </div>
                <div>
                  <div className={`text-xl font-bold ${style.text}`}>{result.severity}</div>
                  <div className="text-xs text-slate-400">CVSS v{version} base score</div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-slate-500">Exploitability</dt>
                  <dd className="font-mono text-slate-200">{result.exploitability.toFixed(1)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Impact</dt>
                  <dd className="font-mono text-slate-200">{result.impact.toFixed(1)}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-2">
              <label htmlFor="cvss-vector" className="text-sm font-semibold text-slate-200">
                Vector string
              </label>
              <Input id="cvss-vector" value={vectorText} onChange={(e) => applyVectorText(e.target.value)} className="bg-card font-mono text-xs" spellCheck={false} aria-invalid={!!vectorError} />
              {vectorError && <p className="text-xs text-red-400">{vectorError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => copy('vector')} className="border-slate-600 text-slate-300">
                  {copied === 'vector' ? <Check className="mr-1.5 h-3.5 w-3.5 text-green-400" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                  Copy vector
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => copy('link')} className="border-slate-600 text-slate-300">
                  {copied === 'link' ? <Check className="mr-1.5 h-3.5 w-3.5 text-green-400" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                  Copy link
                </Button>
              </div>
            </div>

            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                loadCve(cveInput);
              }}
            >
              <label htmlFor="cvss-cve" className="text-sm font-semibold text-slate-200">
                Load a published CVE
              </label>
              <div className="flex gap-2">
                <Input id="cvss-cve" value={cveInput} onChange={(e) => setCveInput(e.target.value)} placeholder="CVE-2024-3400" className="bg-card font-mono text-sm" spellCheck={false} />
                <Button type="submit" size="sm" disabled={cveState.status === 'loading'} aria-label="Load CVE">
                  {cveState.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {cveState.status === 'error' && <p className="text-xs text-red-400">{cveState.message}</p>}
              {cveState.status === 'done' && cveState.id && (
                <p className="text-xs text-slate-400">
                  Loaded the vector of{' '}
                  <Link href={cveUrl(cveState.id)} className="text-whatcyber-teal hover:underline">
                    {cveState.id}
                  </Link>
                  .{' '}
                  {cveState.published != null &&
                    (Math.abs(cveState.published - result.base) < 0.001
                      ? `The published score is ${cveState.published.toFixed(1)}, the same as the calculation.`
                      : `The published score is ${cveState.published.toFixed(1)}; the calculation gives ${result.base.toFixed(1)}.`)}
                </p>
              )}
            </form>
          </aside>
        </div>

        {/* Worked examples */}
        <section className="space-y-3">
          <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">Worked examples</h2>
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
            {EXAMPLES.map((example) => {
              const parsed = parseVector(example.vector)!;
              const score = calculate(parsed.metrics, parsed.version);
              return (
                <li key={example.cveId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={cveUrl(example.cveId)} className="font-mono text-sm text-whatcyber-teal hover:underline">
                      {example.cveId}
                    </Link>
                    <span className="ml-2 text-sm text-slate-300">{example.name}</span>
                    <div className="break-all font-mono text-xs text-slate-500">{example.vector}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-lg font-bold ${SEVERITY_STYLE[score.severity].text}`}>{score.base.toFixed(1)}</span>
                    <Button type="button" variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={() => applyVectorText(example.vector)}>
                      Load
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Reference */}
        <section className="space-y-4">
          <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">The eight base metrics</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {METRICS.map((metric) => (
              <div key={metric.key}>
                <h3 className="text-base font-semibold text-slate-200">
                  {metric.name} ({metric.key})
                </h3>
                <p className="text-sm text-slate-500">{metric.question}</p>
                <ul className="mt-1 space-y-1 text-sm text-slate-400">
                  {metric.values.map((value) => (
                    <li key={value.code}>
                      <span className="text-slate-200">{value.label}:</span> {value.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">Severity ratings</h2>
          <ul className="grid gap-2 sm:grid-cols-5">
            {SEVERITY_RANGES.map((band) => (
              <li key={band.severity} className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm">
                <div className={`font-semibold ${SEVERITY_STYLE[band.severity].text}`}>{band.severity}</div>
                <div className="font-mono text-xs text-slate-400">{band.range}</div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cvss-faq" className="space-y-4">
          <h2 id="cvss-faq" className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">
            Frequently asked questions
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {CVSS_FAQ.map(({ question, answer }) => (
              <div key={question}>
                <h3 className="text-base font-semibold text-slate-200">{question}</h3>
                <p className="mt-1 text-sm text-slate-400">{answer}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="border-t border-slate-800 pt-4 text-xs text-slate-500">
          Formulas: the{' '}
          <a href="https://www.first.org/cvss/v3.1/specification-document" target="_blank" rel="noopener noreferrer" className="text-whatcyber-teal hover:underline">
            FIRST CVSS v3.1 specification
          </a>
          . To see which flaws are being exploited, open the{' '}
          <Link href="/cisa-kev" className="text-whatcyber-teal hover:underline">
            CISA KEV catalog
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
