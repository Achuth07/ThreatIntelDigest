import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { AppShell } from '@/components/layout/app-shell';
import { VulnsSidebar } from '@/components/layout/sidebars/vulns-sidebar';
import { SEO } from '@/components/seo';
import { Cvss3Panel } from '@/components/cvss3-panel';
import { Cvss4Panel } from '@/components/cvss4-panel';
import { SEVERITY_STYLE } from '@/components/cvss-shared';
import { STATIC_PAGE_META } from '@/lib/page-meta';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { CVSS_VIEW_TEXT, cvssPath, faqFor, isCvssVersionSlug, type CvssView } from '@/lib/cvss-content';
import { DEFAULT_METRICS, SEVERITY_RANGES, parseVector, toVectorString, type CvssVersion, type Metrics } from '@/lib/cvss';
import { DEFAULT_METRICS_4, parseVector4, toVectorString4, type Metrics4 } from '@/lib/cvss4';

type Tab = '4' | '3';

const TABS: { id: Tab; label: string }[] = [
  { id: '4', label: 'CVSS 4.0' },
  { id: '3', label: 'CVSS 3.1' },
];

const TAB_PATH: Record<Tab, CvssView> = { '4': '4-0', '3': '3-1' };

/** The view an address stands for: a version page, or the overview (also for an unknown version). */
function viewOf(version: string | undefined): CvssView {
  return isCvssVersionSlug(version) ? version : 'overview';
}

/** What the address asks for: its version page and ?vector=... (whose version picks the tab on the overview). */
function readUrl(view: CvssView): { tab: Tab; metrics3: Metrics; version3: CvssVersion; metrics4: Metrics4 } {
  const state = { tab: (view === '3-1' ? '3' : '4') as Tab, metrics3: DEFAULT_METRICS, version3: '3.1' as CvssVersion, metrics4: DEFAULT_METRICS_4 };
  if (typeof window === 'undefined') return state;
  const vector = new URLSearchParams(window.location.search).get('vector');
  const parsed4 = vector ? parseVector4(vector) : null;
  const parsed3 = vector ? parseVector(vector) : null;
  if (parsed4) {
    state.metrics4 = parsed4;
    if (view !== '3-1') state.tab = '4';
  }
  if (parsed3) {
    state.metrics3 = parsed3.metrics;
    state.version3 = parsed3.version;
    if (view !== '4-0' && !parsed4) state.tab = '3';
  }
  return state;
}

export default function CvssCalculatorPage() {
  const params = useParams<{ version?: string }>();
  const view = viewOf(params.version);
  const [, navigate] = useLocation();
  const initial = useMemo(() => readUrl(view), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [overviewTab, setOverviewTab] = useState<Tab>(initial.tab);
  const tab: Tab = view === '3-1' ? '3' : view === '4-0' ? '4' : overviewTab;
  const [metrics3, setMetrics3] = useState<Metrics>(initial.metrics3);
  const [version3, setVersion3] = useState<CvssVersion>(initial.version3);
  const [metrics4, setMetrics4] = useState<Metrics4>(initial.metrics4);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ '4': null, '3': null });

  // No data to wait for, so the server-written copy can go as soon as the app is up.
  useSsrHandoff(true);

  // The address always holds the vector on screen, so a result can be shared as a link. On the
  // overview a clean address stays clean until the visitor changes something.
  const vector = tab === '4' ? toVectorString4(metrics4) : toVectorString(metrics3, version3);
  const firstRun = useRef(true);
  // A link to the overview or to the wrong version with a vector goes to the page of that vector's version.
  const redirectOnArrival = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const wanted = new URLSearchParams(window.location.search).get('vector');
    if (!wanted) return null;
    const target: CvssView | null = parseVector4(wanted) ? '4-0' : parseVector(wanted) ? '3-1' : null;
    return target && target !== view ? `${cvssPath(target)}?vector=${encodeURIComponent(wanted)}` : null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const first = firstRun.current;
    firstRun.current = false;
    if (first && (redirectOnArrival || (view === 'overview' && !window.location.search))) return;
    try {
      window.history.replaceState(null, '', `${cvssPath(view)}?vector=${encodeURIComponent(vector)}`);
    } catch {
      /* the address is a convenience only */
    }
  }, [vector, view]);

  useEffect(() => {
    if (redirectOnArrival) navigate(redirectOnArrival, { replace: true });
    // only on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Switch version: the address changes with the tab (and the back button undoes it). */
  const goTab = useCallback(
    (next: Tab, nextVector: string) => {
      setOverviewTab(next);
      navigate(`${cvssPath(TAB_PATH[next])}?vector=${encodeURIComponent(nextVector)}`);
    },
    [navigate],
  );

  const set3 = useCallback((metrics: Metrics, version: CvssVersion) => {
    setMetrics3(metrics);
    setVersion3(version);
  }, []);

  /** A vector typed into one calculator that belongs to the other version: load it there and switch the tab. */
  const loadOtherVersion = useCallback((text: string): boolean => {
    const parsed4 = parseVector4(text);
    if (parsed4) {
      setMetrics4(parsed4);
      goTab('4', text);
      return true;
    }
    const parsed3 = parseVector(text);
    if (parsed3) {
      setMetrics3(parsed3.metrics);
      setVersion3(parsed3.version);
      goTab('3', text);
      return true;
    }
    return false;
  }, [goTab]);

  const onTabKey = (event: React.KeyboardEvent, current: Tab) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next: Tab = event.key === 'Home' ? TABS[0].id : event.key === 'End' ? TABS[TABS.length - 1].id : current === '4' ? '3' : '4';
    goTab(next, next === '4' ? toVectorString4(metrics4) : toVectorString(metrics3, version3));
    tabRefs.current[next]?.focus();
  };

  return (
    <AppShell activeTab="vulnerabilities" sidebar={<VulnsSidebar />}>
      <SEO {...STATIC_PAGE_META[cvssPath(view)]} />
      <div className="mx-auto max-w-5xl space-y-10 p-4 pb-20 lg:p-8">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-100 lg:text-3xl">{CVSS_VIEW_TEXT[view].h1}</h1>
          <p className="max-w-3xl text-slate-400">{CVSS_VIEW_TEXT[view].answer}</p>
          <p className="text-sm text-slate-500">
            {view === 'overview' ? (
              <>
                Each version has its own page:{' '}
                <Link href={cvssPath('4-0')} className="text-whatcyber-teal hover:underline">CVSS 4.0 calculator</Link> and{' '}
                <Link href={cvssPath('3-1')} className="text-whatcyber-teal hover:underline">CVSS 3.1 calculator</Link>.
              </>
            ) : (
              <>
                Need the other version?{' '}
                <Link href={cvssPath(view === '4-0' ? '3-1' : '4-0')} className="text-whatcyber-teal hover:underline">
                  Open the CVSS {view === '4-0' ? '3.1' : '4.0'} calculator
                </Link>
                .
              </>
            )}
          </p>
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
                  onClick={() => goTab(id, id === '4' ? toVectorString4(metrics4) : toVectorString(metrics3, version3))}
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
            {faqFor(view).map(({ question, answer }) => (
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
