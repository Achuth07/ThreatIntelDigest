import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Check, Copy } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { SEO } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STATIC_PAGE_META } from '@/lib/page-meta';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { CVSS4_ANSWER, CVSS4_FAQ, CVSS4_TOOL_PATH, CVSS_TOOL_PATH } from '@/lib/cvss-content';
import { SEVERITY_RANGES, type Severity } from '@/lib/cvss';
import {
  DEFAULT_METRICS_4,
  EXAMPLES_4,
  METRICS4,
  calculate4,
  parseVector4,
  toVectorString4,
  type Group4,
  type Metric4Def,
  type Metric4Key,
  type Metrics4,
} from '@/lib/cvss4';

const SEVERITY_STYLE: Record<Severity, { ring: string; text: string }> = {
  None: { ring: 'border-slate-500', text: 'text-slate-300' },
  Low: { ring: 'border-green-500', text: 'text-green-400' },
  Medium: { ring: 'border-yellow-500', text: 'text-yellow-400' },
  High: { ring: 'border-orange-500', text: 'text-orange-400' },
  Critical: { ring: 'border-red-500', text: 'text-red-400' },
};

function vectorFromUrl(): Metrics4 | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('vector');
  return raw ? parseVector4(raw) : null;
}

/** One metric: its question, the choices as radio buttons and what the chosen value means. */
function MetricField({ def, value, onChange }: { def: Metric4Def; value: string; onChange: (code: string) => void }) {
  const selected = def.values.find((v) => v.code === value);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-slate-200">
        {def.name} <span className="font-normal text-slate-500">({def.key})</span>
      </legend>
      <p className="text-xs text-slate-500">{def.question}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={def.name}>
        {def.values.map((v) => {
          const on = v.code === value;
          return (
            <button
              key={v.code}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(v.code)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                on ? 'border-whatcyber-teal bg-whatcyber-teal/15 text-whatcyber-teal' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500'
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
      {selected && <p className="text-sm text-slate-400">{selected.description}</p>}
    </fieldset>
  );
}

/** The metrics of one group, split under their sub-headings. */
function MetricGroup({ group, metrics, onChange }: { group: Group4; metrics: Metrics4; onChange: (key: Metric4Key, code: string) => void }) {
  const defs = METRICS4.filter((m) => m.group === group);
  const subgroups = Array.from(new Set(defs.map((d) => d.subgroup ?? '')));
  return (
    <div className="space-y-6">
      {subgroups.map((sub) => (
        <div key={sub} className="space-y-5">
          {sub && <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{sub}</h3>}
          {defs
            .filter((d) => (d.subgroup ?? '') === sub)
            .map((def) => (
              <MetricField key={def.key} def={def} value={metrics[def.key]} onChange={(code) => onChange(def.key, code)} />
            ))}
        </div>
      ))}
    </div>
  );
}

export default function Cvss4CalculatorPage() {
  const initial = useMemo(vectorFromUrl, []);
  const [metrics, setMetrics] = useState<Metrics4>(initial ?? DEFAULT_METRICS_4);
  const [vectorText, setVectorText] = useState(toVectorString4(initial ?? DEFAULT_METRICS_4));
  const [vectorError, setVectorError] = useState('');
  const [otherVersion, setOtherVersion] = useState<string | null>(null);
  const [copied, setCopied] = useState<'vector' | 'link' | null>(null);

  // No data to wait for, so the server-written copy can go as soon as the app is up.
  useSsrHandoff(true);

  const result = useMemo(() => calculate4(metrics), [metrics]);
  const style = SEVERITY_STYLE[result.severity];
  const vector = toVectorString4(metrics);

  useEffect(() => {
    setVectorText(vector);
    setVectorError('');
    setOtherVersion(null);
    try {
      window.history.replaceState(null, '', `${CVSS4_TOOL_PATH}?vector=${encodeURIComponent(vector)}`);
    } catch {
      /* the address is a convenience only */
    }
  }, [vector]);

  const choose = (key: Metric4Key, code: string) => setMetrics((current) => ({ ...current, [key]: code }));

  const applyVectorText = (text: string) => {
    setVectorText(text);
    const parsed = parseVector4(text);
    if (parsed) {
      setMetrics(parsed);
      setVectorError('');
      setOtherVersion(null);
    } else if (/^CVSS:3\.[01]\//i.test(text.trim())) {
      setOtherVersion(text.trim());
      setVectorError('This is a CVSS v3 vector, which has a different scoring model.');
    } else {
      setOtherVersion(null);
      setVectorError('Not a complete CVSS v4.0 vector. It needs the eleven base metrics, for example CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N');
    }
  };

  const copy = async (what: 'vector' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'vector' ? vector : `${window.location.origin}${CVSS4_TOOL_PATH}?vector=${encodeURIComponent(vector)}`);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard can be blocked; nothing to do */
    }
  };

  const baseDefs = METRICS4.filter((m) => m.group === 'base');

  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO {...STATIC_PAGE_META[CVSS4_TOOL_PATH]} />
      <div className="mx-auto max-w-5xl space-y-10 p-4 pb-20 lg:p-8">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">CVSS 4.0 calculator</h1>
          <p className="max-w-3xl text-slate-400">{CVSS4_ANSWER}</p>
          <p className="text-sm text-slate-500">
            Scoring an older flaw? The{' '}
            <Link href={CVSS_TOOL_PATH} className="text-whatcyber-teal hover:underline">
              CVSS 3.1 calculator
            </Link>{' '}
            scores v3.1 and v3.0 vectors and loads the vector of any published CVE.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <section aria-labelledby="v4-base" className="space-y-5">
              <h2 id="v4-base" className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">
                Base metrics
              </h2>
              <MetricGroup group="base" metrics={metrics} onChange={choose} />
            </section>

            <section aria-labelledby="v4-threat" className="space-y-5">
              <h2 id="v4-threat" className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">
                Threat metric
              </h2>
              <MetricGroup group="threat" metrics={metrics} onChange={choose} />
            </section>

            <details className="group rounded-lg border border-slate-700 bg-slate-900/30 p-4">
              <summary className="cursor-pointer text-lg font-bold text-slate-100">Environmental metrics (optional)</summary>
              <div className="mt-4 space-y-5">
                <p className="text-sm text-slate-400">
                  These adjust the score for your own environment. They follow the method of FIRST&apos;s reference calculator; published CVE scores almost never use them, so they could not be
                  checked against real data.
                </p>
                <MetricGroup group="environmental" metrics={metrics} onChange={choose} />
              </div>
            </details>

            <details className="group rounded-lg border border-slate-700 bg-slate-900/30 p-4">
              <summary className="cursor-pointer text-lg font-bold text-slate-100">Supplemental metrics (optional)</summary>
              <div className="mt-4 space-y-5">
                <p className="text-sm text-slate-400">These describe a flaw further. They are kept in the vector string but never change the score.</p>
                <MetricGroup group="supplemental" metrics={metrics} onChange={choose} />
              </div>
            </details>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
              <div className="flex items-center gap-4">
                <div className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 bg-slate-900 ${style.ring}`} aria-live="polite">
                  <span className={`font-mono text-3xl font-bold ${style.text}`}>{result.score.toFixed(1)}</span>
                </div>
                <div>
                  <div className={`text-xl font-bold ${style.text}`}>{result.severity}</div>
                  <div className="text-xs text-slate-400">{result.label} score</div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">Equivalence group {result.macrovector}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="cvss4-vector" className="text-sm font-semibold text-slate-200">
                Vector string
              </label>
              <Input id="cvss4-vector" value={vectorText} onChange={(e) => applyVectorText(e.target.value)} className="bg-card font-mono text-xs" spellCheck={false} aria-invalid={!!vectorError} />
              {vectorError && (
                <p className="text-xs text-red-400">
                  {vectorError}{' '}
                  {otherVersion && (
                    <Link href={`${CVSS_TOOL_PATH}?vector=${encodeURIComponent(otherVersion)}`} className="text-whatcyber-teal hover:underline">
                      Open it in the CVSS 3.1 calculator.
                    </Link>
                  )}
                </p>
              )}
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
          </aside>
        </div>

        <section className="space-y-3">
          <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">Worked examples</h2>
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
            {EXAMPLES_4.map((example) => {
              const parsed = parseVector4(example.vector)!;
              const score = calculate4(parsed);
              return (
                <li key={example.vector} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-300">{example.name}</div>
                    <div className="break-all font-mono text-xs text-slate-500">{example.vector}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-lg font-bold ${SEVERITY_STYLE[score.severity].text}`}>{score.score.toFixed(1)}</span>
                    <Button type="button" variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={() => applyVectorText(example.vector)}>
                      Load
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">The base metrics</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {baseDefs.map((metric) => (
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

        <section aria-labelledby="cvss4-faq" className="space-y-4">
          <h2 id="cvss4-faq" className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">
            Frequently asked questions
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {CVSS4_FAQ.map(({ question, answer }) => (
              <div key={question}>
                <h3 className="text-base font-semibold text-slate-200">{question}</h3>
                <p className="mt-1 text-sm text-slate-400">{answer}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="border-t border-slate-800 pt-4 text-xs text-slate-500">
          Scoring: the{' '}
          <a href="https://www.first.org/cvss/v4.0/specification-document" target="_blank" rel="noopener noreferrer" className="text-whatcyber-teal hover:underline">
            FIRST CVSS v4.0 specification
          </a>{' '}
          and its{' '}
          <a href="https://github.com/FIRSTdotorg/cvss-v4-calculator" target="_blank" rel="noopener noreferrer" className="text-whatcyber-teal hover:underline">
            reference calculator
          </a>{' '}
          (BSD-2-Clause, FIRST.ORG, Inc. and Red Hat). To see which flaws are being exploited, open the{' '}
          <Link href="/cisa-kev" className="text-whatcyber-teal hover:underline">
            CISA KEV catalog
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
