import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CopyButtons, ScoreCard, SEVERITY_STYLE } from '@/components/cvss-shared';
import { CVSS_TOOL_PATH } from '@/lib/cvss-content';
import { EXAMPLES_4, METRICS4, calculate4, parseVector4, toVectorString4, type Group4, type Metric4Def, type Metric4Key, type Metrics4 } from '@/lib/cvss4';

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

/** The CVSS v4.0 calculator (WHA-29). State lives in the page so the tabs keep it. */
export function Cvss4Panel({
  metrics,
  onChange,
  onOtherVersion,
}: {
  metrics: Metrics4;
  onChange: (metrics: Metrics4) => void;
  /** Called with a pasted vector this panel cannot score but another version can; the page switches tabs. */
  onOtherVersion: (vector: string) => boolean;
}) {
  const vector = toVectorString4(metrics);
  const result = calculate4(metrics);

  const [vectorText, setVectorText] = useState(vector);
  const [vectorError, setVectorError] = useState('');

  useEffect(() => {
    setVectorText(vector);
    setVectorError('');
  }, [vector]);

  const applyVectorText = (text: string) => {
    setVectorText(text);
    const parsed = parseVector4(text);
    if (parsed) {
      onChange(parsed);
      setVectorError('');
    } else if (!onOtherVersion(text)) {
      setVectorError('Not a complete CVSS v4.0 vector. It needs the eleven base metrics, for example CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N');
    }
  };

  const baseDefs = METRICS4.filter((m) => m.group === 'base');
  const choose = (key: Metric4Key, code: string) => onChange({ ...metrics, [key]: code });

  return (
    <div className="space-y-10">
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
          <ScoreCard score={result.score} severity={result.severity} caption={`CVSS v4.0 ${result.label} score`}>
            <p className="mt-4 text-xs text-slate-500">Equivalence group {result.macrovector}</p>
          </ScoreCard>

          <div className="space-y-2">
            <label htmlFor="cvss4-vector" className="text-sm font-semibold text-slate-200">
              Vector string
            </label>
            <Input id="cvss4-vector" value={vectorText} onChange={(e) => applyVectorText(e.target.value)} className="bg-card font-mono text-xs" spellCheck={false} aria-invalid={!!vectorError} />
            {vectorError && <p className="text-xs text-red-400">{vectorError}</p>}
            <CopyButtons vector={vector} link={`${typeof window === 'undefined' ? '' : window.location.origin}${CVSS_TOOL_PATH}?vector=${encodeURIComponent(vector)}`} />
          </div>
        </aside>
      </div>

      <section className="space-y-3">
        <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">CVSS 4.0 worked examples</h2>
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
          {EXAMPLES_4.map((example) => {
            const score = calculate4(parseVector4(example.vector)!);
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
        <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">The CVSS 4.0 base metrics</h2>
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
    </div>
  );
}
