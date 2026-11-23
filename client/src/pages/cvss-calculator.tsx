import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { SEO } from '@/components/seo';
import { Cvss3Panel } from '@/components/cvss3-panel';
import { Cvss4Panel } from '@/components/cvss4-panel';
import { SEVERITY_STYLE } from '@/components/cvss-shared';
import { STATIC_PAGE_META } from '@/lib/page-meta';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { CVSS_ANSWER, CVSS_FAQ, CVSS_TOOL_PATH } from '@/lib/cvss-content';
import { DEFAULT_METRICS, SEVERITY_RANGES, parseVector, toVectorString, type CvssVersion, type Metrics } from '@/lib/cvss';
import { DEFAULT_METRICS_4, parseVector4, toVectorString4, type Metrics4 } from '@/lib/cvss4';

type Tab = '4' | '3';

const TABS: { id: Tab; label: string }[] = [
  { id: '4', label: 'CVSS 4.0' },
  { id: '3', label: 'CVSS 3.1' },
];

/** What the address asks for: ?vector=... (its version picks the tab) or ?version=3 or ?version=4. */
function readUrl(): { tab: Tab; metrics3: Metrics; version3: CvssVersion; metrics4: Metrics4 } {
  const state = { tab: '4' as Tab, metrics3: DEFAULT_METRICS, version3: '3.1' as CvssVersion, metrics4: DEFAULT_METRICS_4 };
  if (typeof window === 'undefined') return state;
  const params = new URLSearchParams(window.location.search);
  const vector = params.get('vector');
  const parsed4 = vector ? parseVector4(vector) : null;
  const parsed3 = vector ? parseVector(vector) : null;
  if (parsed4) return { ...state, tab: '4', metrics4: parsed4 };
  if (parsed3) return { ...state, tab: '3', metrics3: parsed3.metrics, version3: parsed3.version };
  const version = params.get('version');
  if (version === '3' || version === '3.1' || version === '3.0') state.tab = '3';
  return state;
}

export default function CvssCalculatorPage() {
  const initial = useMemo(readUrl, []);
  const [tab, setTab] = useState<Tab>(initial.tab);
  const [metrics3, setMetrics3] = useState<Metrics>(initial.metrics3);
  const [version3, setVersion3] = useState<CvssVersion>(initial.version3);
  const [metrics4, setMetrics4] = useState<Metrics4>(initial.metrics4);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ '4': null, '3': null });

  // No data to wait for, so the server-written copy can go as soon as the app is up.
  useSsrHandoff(true);

  // The address always holds the vector on screen, so a result can be shared as a link.
  const vector = tab === '4' ? toVectorString4(metrics4) : toVectorString(metrics3, version3);
  useEffect(() => {
    try {
      window.history.replaceState(null, '', `${CVSS_TOOL_PATH}?vector=${encodeURIComponent(vector)}`);
    } catch {
      /* the address is a convenience only */
    }
  }, [vector]);

  const set3 = useCallback((metrics: Metrics, version: CvssVersion) => {
    setMetrics3(metrics);
    setVersion3(version);
  }, []);

  /** A vector typed into one calculator that belongs to the other version: load it there and switch the tab. */
  const loadOtherVersion = useCallback((text: string): boolean => {
    const parsed4 = parseVector4(text);
    if (parsed4) {
      setMetrics4(parsed4);
      setTab('4');
      return true;
    }
    const parsed3 = parseVector(text);
    if (parsed3) {
      setMetrics3(parsed3.metrics);
      setVersion3(parsed3.version);
      setTab('3');
      return true;
    }
    return false;
  }, []);

  const onTabKey = (event: React.KeyboardEvent, current: Tab) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next: Tab = event.key === 'Home' ? TABS[0].id : event.key === 'End' ? TABS[TABS.length - 1].id : current === '4' ? '3' : '4';
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO {...STATIC_PAGE_META[CVSS_TOOL_PATH]} />
      <div className="mx-auto max-w-5xl space-y-10 p-4 pb-20 lg:p-8">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">CVSS calculator</h1>
          <p className="max-w-3xl text-slate-400">{CVSS_ANSWER}</p>
        </div>

        <div className="space-y-8">
          <div role="tablist" aria-label="CVSS version" className="inline-flex rounded-lg border border-slate-700 bg-slate-900/60 p-1">
            {TABS.map(({ id, label }) => {
              const on = tab === id;
              return (
                <button
                  key={id}
                  ref={(el) => {
                    tabRefs.current[id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`cvss-tab-${id}`}
                  aria-selected={on}
                  aria-controls={`cvss-panel-${id}`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setTab(id)}
                  onKeyDown={(e) => onTabKey(e, id)}
                  className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${
                    on ? 'bg-whatcyber-teal/15 text-whatcyber-teal' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={`cvss-panel-${tab}`} aria-labelledby={`cvss-tab-${tab}`}>
            {tab === '4' ? (
              <Cvss4Panel metrics={metrics4} onChange={setMetrics4} onOtherVersion={loadOtherVersion} />
            ) : (
              <Cvss3Panel metrics={metrics3} version={version3} onChange={set3} onOtherVersion={loadOtherVersion} />
            )}
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="border-b border-slate-700 pb-2 text-lg font-bold text-slate-100">Severity ratings</h2>
          <p className="text-sm text-slate-400">Both versions use the same bands.</p>
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
          . CVSS v4.0: the{' '}
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
