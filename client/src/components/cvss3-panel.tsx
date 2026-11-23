import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CopyButtons, ScoreCard, SEVERITY_STYLE } from '@/components/cvss-shared';
import { CVSS_TOOL_PATH } from '@/lib/cvss-content';
import { EXAMPLES, METRICS, calculate, parseVector, toVectorString, type CvssVersion, type Metrics } from '@/lib/cvss';
import { CVE_ID_PATTERN, cveUrl } from '@/lib/urls';

/** The CVSS v3.1 / v3.0 calculator (WHA-29). State lives in the page so the tabs keep it. */
export function Cvss3Panel({
  metrics,
  version,
  onChange,
  onOtherVersion,
}: {
  metrics: Metrics;
  version: CvssVersion;
  onChange: (metrics: Metrics, version: CvssVersion) => void;
  /** Called with a pasted vector this panel cannot score but another version can; the page switches tabs. */
  onOtherVersion: (vector: string) => boolean;
}) {
  const vector = toVectorString(metrics, version);
  const result = calculate(metrics, version);

  const [vectorText, setVectorText] = useState(vector);
  const [vectorError, setVectorError] = useState('');
  const [cveInput, setCveInput] = useState('');
  const [cveState, setCveState] = useState<{ status: 'idle' | 'loading' | 'error' | 'done'; id?: string; message?: string; published?: number | null }>({ status: 'idle' });

  // Keep the box in step with the choices.
  useEffect(() => {
    setVectorText(vector);
    setVectorError('');
  }, [vector]);

  const applyVectorText = (text: string) => {
    setVectorText(text);
    const parsed = parseVector(text);
    if (parsed) {
      onChange(parsed.metrics, parsed.version);
      setVectorError('');
    } else if (!onOtherVersion(text)) {
      setVectorError('Not a complete CVSS v3 base vector. Example: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
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
      onChange(parsed.metrics, parsed.version);
      const published = nvd?.cvssV3Score != null ? Number(nvd.cvssV3Score) : null;
      setCveState({ status: 'done', id, published: Number.isFinite(published as number) ? published : null });
    } catch {
      setCveState({ status: 'error', id, message: `Could not find ${id}.` });
    }
  };

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
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
                        onClick={() => onChange({ ...metrics, [metric.key]: value.code }, version)}
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

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <ScoreCard score={result.base} severity={result.severity} caption={`CVSS v${version} base score`}>
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
          </ScoreCard>

          <div className="space-y-2">
            <label htmlFor="cvss-vector" className="text-sm font-semibold text-slate-200">
              Vector string
            </label>
            <Input id="cvss-vector" value={vectorText} onChange={(e) => applyVectorText(e.target.value)} className="bg-card font-mono text-xs" spellCheck={false} aria-invalid={!!vectorError} />
            {vectorError && <p className="text-xs text-red-400">{vectorError}</p>}
            <CopyButtons vector={vector} link={`${typeof window === 'undefined' ? '' : window.location.origin}${CVSS_TOOL_PATH}?vector=${encodeURIComponent(vector)}`} />
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

      <section className="space-y-3">
        <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">CVSS 3.1 worked examples</h2>
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

      <section className="space-y-4">
        <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">The eight CVSS 3.1 base metrics</h2>
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
    </div>
  );
}
