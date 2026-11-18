import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { SEO } from '@/components/seo';
import { STATIC_PAGE_META } from '@/lib/page-meta';
import { LANDING_FAQ, landingJsonLd } from '@/lib/jsonld';
import { useSsrHandoff } from '@/lib/ssr-handoff';
import { getAuthenticatedUser } from '@/lib/auth';
import { ACTORS_HUB, CVE_HUB, KEV_HUB, cveUrl } from '@/lib/urls';
import './landing-page.css';

/*
 * Landing page, concept D (Nov 2026 redesign).
 *
 * Built with the sumi design plugin from four Awwwards Sites of the Day, plus concept A's motion:
 * a cursor-reactive "+" field behind the hero, a CVE marquee, a pinned sideways platform rail with
 * a live list of the newest CISA KEV entries, scroll reveals and a crosshair cursor. Styles live in
 * landing-page.css under .wcl. Everything readable is in the HTML at rest; motion only adds to it,
 * and it is switched off for visitors who prefer reduced motion.
 *
 * Keep the headline, sections and FAQ in step with the server copy in
 * server/services/page-body.ts (renderLandingBody), which crawlers read.
 */

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800&family=Geist:wght@400;500&display=swap';

const THREAT_FEED = '/threatfeed';

type KevRow = { cveID: string; vendorProject: string; product: string; dateAdded: string; cvssV3Score?: number | null };

/** Shown until the live list loads, or if it cannot load. Real KEV entries with their CISA dates. */
const FALLBACK_KEVS: KevRow[] = [
  { cveID: 'CVE-2024-23897', vendorProject: 'Jenkins', product: 'Jenkins Command Line Interface', dateAdded: '2024-08-19' },
  { cveID: 'CVE-2024-3400', vendorProject: 'Palo Alto Networks', product: 'PAN-OS', dateAdded: '2024-04-12' },
  { cveID: 'CVE-2024-1709', vendorProject: 'ConnectWise', product: 'ScreenConnect', dateAdded: '2024-02-22' },
  { cveID: 'CVE-2024-21762', vendorProject: 'Fortinet', product: 'FortiOS', dateAdded: '2024-02-09' },
  { cveID: 'CVE-2023-46805', vendorProject: 'Ivanti', product: 'Connect Secure and Policy Secure', dateAdded: '2024-01-10' },
  { cveID: 'CVE-2023-4966', vendorProject: 'Citrix', product: 'NetScaler ADC and Gateway', dateAdded: '2023-10-18' },
  { cveID: 'CVE-2023-20198', vendorProject: 'Cisco', product: 'IOS XE Web UI', dateAdded: '2023-10-16' },
  { cveID: 'CVE-2023-34362', vendorProject: 'Progress', product: 'MOVEit Transfer', dateAdded: '2023-06-02' },
];

const MARQUEE = [
  ['CVE-2021-44228', 'Log4Shell'],
  ['CVE-2023-4966', 'Citrix Bleed'],
  ['CVE-2024-3400', 'PAN-OS'],
  ['CVE-2023-34362', 'MOVEit'],
  ['CVE-2024-21762', 'FortiOS'],
];

const INDEX_ROWS = [
  { href: THREAT_FEED, count: '(20,000+)', title: 'News', text: 'Cybersecurity news from trusted sources such as Bleeping Computer, Unit 42 and Dark Reading, aggregated in real time.' },
  { href: CVE_HUB, count: '(215,000+)', title: 'CVEs', text: 'Every CVE from the National Vulnerability Database with CVSS and EPSS scores, affected products and references.' },
  { href: KEV_HUB, count: '(1,750+)', title: 'Exploited', text: 'The CISA Known Exploited Vulnerabilities catalog, so you patch what attackers already use.' },
  { href: ACTORS_HUB, count: '(175+)', title: 'Threat actors', text: 'Profiles built on MITRE ATT&CK, with aliases, targeted sectors, techniques and related news.' },
  { href: '/blog', count: '(Guides)', title: 'Blog', text: 'Analysis and guides on vulnerabilities, threat intelligence and security operations.' },
];

const STEPS = [
  { title: 'Discover', text: 'Real-time security news and newly exploited vulnerabilities, gathered in one feed.' },
  { title: 'Analyze', text: 'Look into the actors behind an attack and their techniques, mapped to MITRE ATT&CK.' },
  { title: 'Act', text: 'Patch what is being exploited before it reaches you.' },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

function Action({ size, label = 'Open the threat feed', className = '' }: { size?: 'lg'; label?: string; className?: string }) {
  return (
    <Link href={THREAT_FEED} className={`wcl-act ${size === 'lg' ? 'lg' : ''} ${className}`}>
      <b>{label}</b>
      <i aria-hidden="true">→</i>
    </Link>
  );
}

function Corners() {
  return (
    <>
      <span className="c tl" aria-hidden="true">+</span>
      <span className="c tr" aria-hidden="true">+</span>
      <span className="c bl" aria-hidden="true">+</span>
      <span className="c br" aria-hidden="true">+</span>
    </>
  );
}

/** Smooth-scrolls to an id on this page instead of changing the route. */
function scrollToId(e: React.MouseEvent, id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function Header() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(Boolean(getAuthenticatedUser()?.token)), []);

  const links = [
    { id: 'platform', count: '(1,750+)', label: 'KEV' },
    { id: 'library', count: '(215,000+)', label: 'CVEs' },
    { id: 'library', count: '(175+)', label: 'Actors' },
    { id: 'how', count: '(3)', label: 'Steps' },
  ];

  return (
    <header className="wcl-header">
      <div className="wcl-g wcl-grid wcl-hd">
        <a className="wcl-wm" href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); }}>
          <img src="/android-chrome-192x192.png" alt="" width={22} height={22} />
          <span>WhatCyber</span>
        </a>
        <nav className="wcl-ix" aria-label="Page sections">
          {links.map((l) => (
            <a key={l.label} href={`#${l.id}`} onClick={(e) => scrollToId(e, l.id)}>
              <span>{l.count}</span>{l.label}
            </a>
          ))}
        </nav>
        <div className="wcl-hd-right">
          {!signedIn && <Link className="wcl-signin" href="/login">Sign in</Link>}
          <button className="wcl-menu-btn" aria-expanded={open} aria-controls="wcl-menu" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : 'Menu'}
          </button>
          <Action label="Open the feed" />
        </div>
      </div>
      {open && (
        <nav id="wcl-menu" className="wcl-g wcl-menu" aria-label="Menu">
          <Link href={KEV_HUB}><span>(KEV)</span>CISA KEV catalog</Link>
          <Link href={CVE_HUB}><span>(CVE)</span>Latest CVEs</Link>
          <Link href={ACTORS_HUB}><span>(Actors)</span>Threat actors</Link>
          <Link href="/blog"><span>(Blog)</span>Blog</Link>
          <Link href="/about"><span>(About)</span>About</Link>
          {!signedIn && <Link href="/login"><span>(Account)</span>Sign in</Link>}
        </nav>
      )}
    </header>
  );
}

/** "+" registration marks behind the hero that lean toward the cursor, with a slow green scan line. */
function useHeroField(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const c = canvasRef.current;
    const host = c?.parentElement;
    const ctx = c?.getContext('2d');
    if (!c || !host || !ctx) return;
    const reduce = prefersReducedMotion();
    let w = 0, h = 0, mx = -999, my = -999, t = 0, raf = 0;
    const color = (name: string) => getComputedStyle(c).getPropertyValue(name).trim();

    const size = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * d; c.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const ink = color('--ink'), acc = color('--accent'), gap = 40, scan = ((t * 0.1) % (w + 240)) - 120;
      for (let x = gap / 2; x < w; x += gap) {
        for (let y = gap / 2; y < h; y += gap) {
          const dx = x - mx, dy = y - my;
          const near = Math.max(0, 1 - Math.hypot(dx, dy) / 200);
          const k = Math.max(near, Math.max(0, 1 - Math.abs(x - scan) / 80) * 0.7);
          const s = 2.5 + k * 4, ox = x - dx * near * 0.1, oy = y - dy * near * 0.1;
          ctx.globalAlpha = 0.1 + k * 0.75;
          ctx.strokeStyle = k > 0.06 ? acc : ink;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ox - s, oy); ctx.lineTo(ox + s, oy);
          ctx.moveTo(ox, oy - s); ctx.lineTo(ox, oy + s);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };
    const loop = () => { t += 16; draw(); raf = requestAnimationFrame(loop); };
    const onMove = (e: PointerEvent) => { const r = c.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; };
    const onLeave = () => { mx = my = -999; };
    const onResize = () => { size(); if (reduce) draw(); };

    size();
    window.addEventListener('resize', onResize);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    if (reduce) draw(); else loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [canvasRef]);
}

function Hero() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useHeroField(canvas);
  const now = new Date();
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, '0')).join('.');

  return (
    <section className="wcl-hero wcl-g">
      <canvas ref={canvas} className="wcl-field" aria-hidden="true" />
      <div className="wcl-grid">
        <div className="wcl-reg">
          <h1>Threat intelligence for security teams</h1>
          <span className="wcl-mu">WC /Edition {today}</span>
          <span className="wcl-mu">(CISA · NVD · ATT&amp;CK · EPSS)</span>
        </div>
        <p className="wcl-slogan wcl-disp">
          <span className="l"><span>Read the news.</span></span>
          <span className="l"><span>Track the exploit.</span></span>
          <span className="l"><span>Patch first.</span></span>
        </p>
        <div className="wcl-hero-low">
          <p className="wcl-lede">
            Track exploited vulnerabilities from the CISA KEV catalog, 215,000+ CVEs and threat actor profiles, with
            cybersecurity news from trusted sources, in one place. Free to read.
          </p>
          <div className="wcl-hero-act">
            <Action size="lg" />
            <small className="wcl-mu">No account needed · <Link href="/register">Create a free account</Link></small>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="wcl-mq" aria-hidden="true">
      <div className="wcl-track">
        {items.map(([id, name], i) => (
          <span key={i}>{id} <em>{name}</em></span>
        ))}
      </div>
    </div>
  );
}

/** The newest KEV entries, cycling oldest to newest so each new one drops in at the top. */
function useKevFeed() {
  const [rows, setRows] = useState<KevRow[]>(FALLBACK_KEVS);
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/kev?limit=12')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { data?: KevRow[]; total?: number }) => {
        if (cancelled) return;
        if (Array.isArray(json.data) && json.data.length >= 5) setRows(json.data);
        if (typeof json.total === 'number' && json.total > 0) setTotal(json.total);
      })
      .catch(() => { /* keep the fallback list */ });
    return () => { cancelled = true; };
  }, []);
  return { rows, total };
}

function KevTicker({ rows }: { rows: KevRow[] }) {
  // rows arrive newest first. Show the newest five, then replay the set oldest to newest.
  const [visible, setVisible] = useState<{ row: KevRow; key: string; isNew: boolean }[]>([]);
  useEffect(() => {
    setVisible(rows.slice(0, 5).map((row, i) => ({ row, key: `${row.cveID}-init-${i}`, isNew: false })));
    if (prefersReducedMotion() || rows.length < 6) return;
    const order = [...rows].reverse();
    let i = 0, n = 0;
    const timer = window.setInterval(() => {
      const row = order[i++ % order.length];
      n += 1;
      setVisible((v) => [{ row, key: `${row.cveID}-${n}`, isNew: true }, ...v].slice(0, 7));
    }, 2800);
    return () => window.clearInterval(timer);
  }, [rows]);

  return (
    <ol className="wcl-tick" aria-label="Recently added known exploited vulnerabilities">
      {visible.map(({ row, key, isNew }) => (
        <li key={key} className={isNew ? 'new' : undefined}>
          <Link className="wcl-m" href={cveUrl(row.cveID)}>{row.cveID}</Link>
          <span>{row.vendorProject} {row.product}</span>
          <em>{typeof row.cvssV3Score === 'number' ? row.cvssV3Score.toFixed(1) : shortDate(row.dateAdded)}</em>
        </li>
      ))}
    </ol>
  );
}

/** Pins the platform section and slides its rail sideways while the visitor scrolls. */
function useSidewaysRail(pinRef: React.RefObject<HTMLElement>, railRef: React.RefObject<HTMLDivElement>, count: number) {
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const pin = pinRef.current, rail = railRef.current;
    if (!pin || !rail) return;
    const narrow = window.matchMedia('(max-width: 820px)');
    const off = () => narrow.matches || prefersReducedMotion();
    const extra = () => Math.max(0, rail.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(rail).paddingLeft));
    const setup = () => {
      if (off()) { pin.style.height = ''; rail.style.transform = ''; return; }
      pin.style.height = `${window.innerHeight + extra()}px`;
    };
    const onScroll = () => {
      if (off()) return;
      const total = pin.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -pin.getBoundingClientRect().top / Math.max(1, total)));
      rail.style.transform = `translate3d(${-p * extra()}px,0,0)`;
      setProgress(p);
      setStep(Math.min(count, 1 + Math.round(p * (count - 1))));
    };
    const onResize = () => { setup(); onScroll(); };
    setup(); onScroll();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    narrow.addEventListener('change', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      narrow.removeEventListener('change', onResize);
      pin.style.height = '';
    };
  }, [pinRef, railRef, count]);
  return { step, progress };
}

const PANEL_COUNT = 5;

function Platform() {
  const pin = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const { step, progress } = useSidewaysRail(pin, rail, PANEL_COUNT);
  const { rows, total } = useKevFeed();

  return (
    <section ref={pin} className="wcl-pin" id="platform" aria-labelledby="wcl-platform-h">
      <div className="wcl-pin-sticky">
        <div className="wcl-g wcl-pin-head">
          <h2 id="wcl-platform-h" className="wcl-disp">The platform</h2>
          <div className="wcl-prog wcl-mu" aria-hidden="true">
            <span>({step}/{PANEL_COUNT})</span>
            <div className="wcl-bar"><i style={{ transform: `scaleX(${progress})` }} /></div>
          </div>
        </div>
        <div ref={rail} className="wcl-rail">
          <article className="wcl-pn wcl-pa">
            <Corners />
            <span className="wcl-m">(KEV) /Exploited in the wild</span>
            <div className="big wcl-disp">{total ? total.toLocaleString('en-US') : '1,750+'}</div>
            <p>vulnerabilities attackers are already using, from CISA's catalog, with the news behind each one.</p>
          </article>

          <article className="wcl-pn wcl-pb">
            <Corners />
            <span className="wcl-m wcl-live">(Latest from CISA) /Newest KEV entries</span>
            <KevTicker rows={rows} />
            <Link className="wcl-lnk" href={KEV_HUB}>Open the CISA KEV catalog →</Link>
          </article>

          <article className="wcl-pn wcl-pc">
            <Corners />
            <span className="wcl-m">(CVE) /Vulnerability intelligence</span>
            <h3 className="wcl-disp">Sort every CVE by what matters.</h3>
            <p>Search 215,000+ CVEs by vendor, product, CVSS score, EPSS probability and weakness.</p>
            <div className="wcl-chips">
              <span className="wcl-chip on">CVSS</span>
              <span className="wcl-chip">EPSS</span>
              <span className="wcl-chip">Vendor</span>
              <span className="wcl-chip">Product</span>
              <span className="wcl-chip">CWE</span>
              <span className="wcl-chip">In KEV</span>
            </div>
            <Link className="wcl-lnk" href={CVE_HUB}>Browse the latest CVEs →</Link>
          </article>

          <article className="wcl-pn wcl-pc">
            <Corners />
            <span className="wcl-m">(175+) /Threat actor directory</span>
            <h3 className="wcl-disp">Follow the groups, not only the bugs.</h3>
            <p>Profiles built from MITRE ATT&amp;CK, with aliases, targeted sectors, techniques and related news.</p>
            <div className="wcl-chips">
              <span className="wcl-chip on">APT29</span>
              <span className="wcl-chip">Lazarus Group</span>
              <span className="wcl-chip">FIN7</span>
              <span className="wcl-chip">Sandworm Team</span>
              <span className="wcl-chip">T1190</span>
              <span className="wcl-chip">T1566</span>
            </div>
            <Link className="wcl-lnk" href={ACTORS_HUB}>Explore threat actor profiles →</Link>
          </article>

          <article className="wcl-pn wcl-pa">
            <Corners />
            <span className="wcl-m">(Free) /No account needed</span>
            <h3 className="wcl-disp">Free to read. Built for defenders.</h3>
            <Action size="lg" className="inv" />
          </article>
        </div>
      </div>
    </section>
  );
}

function IndexSection() {
  return (
    <section className="wcl-lib wcl-g" id="library" aria-labelledby="wcl-index-h">
      <div className="wcl-grid">
        <div className="wcl-sec-h wcl-rv">
          <h2 id="wcl-index-h" className="wcl-disp">The index</h2>
          <span className="wcl-mu">({INDEX_ROWS.length}) Collections /Updated daily</span>
        </div>
        {INDEX_ROWS.map((row) => (
          <Link key={row.title} className="wcl-row wcl-rv" href={row.href}>
            <span className="cnt">{row.count}</span>
            <h3 className="wcl-disp">{row.title}</h3>
            <p>{row.text}</p>
            <span className="go" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section className="wcl-how wcl-g" id="how" aria-labelledby="wcl-how-h">
      <div className="wcl-grid">
        <div className="wcl-sec-h wcl-rv">
          <h2 id="wcl-how-h" className="wcl-disp">How it works</h2>
          <span className="wcl-mu">({STEPS.length}) Steps</span>
        </div>
        <div className="wcl-steps">
          {STEPS.map((s, i) => (
            <div key={s.title} className="wcl-st wcl-rv">
              <span className="wcl-mu">({i + 1})</span>
              <h3 className="wcl-disp">{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Same questions and answers as the FAQPage structured data (landingJsonLd). */
function Faq() {
  return (
    <section className="wcl-faq wcl-g" id="faq" aria-labelledby="wcl-faq-h">
      <div className="wcl-grid">
        <h2 id="wcl-faq-h" className="wcl-disp wcl-rv">Questions</h2>
        <div className="qs wcl-rv">
          {LANDING_FAQ.map(({ question, answer }, i) => (
            <details key={question} open={i === 0}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="wcl-footer">
      <div className="wcl-g wcl-grid">
        <p className="wcl-f-big wcl-disp wcl-rv" aria-hidden="true">Patch<br /><span>first.</span></p>
        <div className="wcl-f-row">
          <Action size="lg" />
          <span className="wcl-mu">Free to read. Create an account to bookmark articles and keep a watchlist.</span>
        </div>
        <div className="wcl-f-cols">
          <div>
            <span className="wcl-mu">(Platform)</span>
            <ul>
              <li><Link href={THREAT_FEED}>Security news feed</Link></li>
              <li><Link href={CVE_HUB}>Latest CVEs</Link></li>
              <li><Link href={KEV_HUB}>CISA KEV catalog</Link></li>
              <li><Link href={ACTORS_HUB}>Threat actors</Link></li>
            </ul>
          </div>
          <div>
            <span className="wcl-mu">(Company)</span>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/report-bugs">Report a bug</Link></li>
            </ul>
          </div>
          <div>
            <span className="wcl-mu">(Follow)</span>
            <ul>
              <li><a href="https://www.linkedin.com/company/whatcyber/" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a href="https://x.com/WhatCyber_" target="_blank" rel="noopener noreferrer">X (Twitter)</a></li>
              <li><a href="mailto:contact@whatcyber.com">contact@whatcyber.com</a></li>
            </ul>
          </div>
          <div>
            <span className="wcl-mu">(Legal)</span>
            <ul>
              <li><Link href="/privacy">Privacy policy</Link></li>
              <li><Link href="/terms">Terms of service</Link></li>
            </ul>
          </div>
        </div>
        <div className="wcl-f-bot wcl-mu">
          <span>© {year} WhatCyber</span>
          <span>Data from CISA, NVD, MITRE ATT&amp;CK and FIRST</span>
        </div>
      </div>
    </footer>
  );
}

/** Scroll reveals (the resting state is visible; JS only adds a small lift) and the crosshair cursor. */
function usePageMotion(rootRef: React.RefObject<HTMLDivElement>, cursorRef: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add('js');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.12 },
    );
    root.querySelectorAll('.wcl-rv').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      else io.observe(el);
    });

    const cur = cursorRef.current;
    let raf = 0;
    const cleanups: (() => void)[] = [];
    if (cur && !prefersReducedMotion() && window.matchMedia('(pointer: fine)').matches) {
      let x = -100, y = -100, cx = -100, cy = -100;
      const onMove = (e: PointerEvent) => { x = e.clientX; y = e.clientY; };
      const onOver = (e: PointerEvent) => {
        const hit = (e.target as Element | null)?.closest?.('a, button, summary, .wcl-pn');
        cur.classList.toggle('big', Boolean(hit));
      };
      window.addEventListener('pointermove', onMove);
      root.addEventListener('pointerover', onOver);
      const tick = () => {
        cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
        cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
        raf = requestAnimationFrame(tick);
      };
      tick();
      cleanups.push(() => { window.removeEventListener('pointermove', onMove); root.removeEventListener('pointerover', onOver); });
    }
    return () => { io.disconnect(); cancelAnimationFrame(raf); cleanups.forEach((f) => f()); };
  }, [rootRef, cursorRef]);
}

export default function LandingPage() {
  const structuredData = landingJsonLd();
  // The landing page needs no data, so the server copy (WHA-96) is handed over as soon as it mounts.
  useSsrHandoff(true);
  const root = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  usePageMotion(root, cursor);

  return (
    <div ref={root} className="wcl">
      <SEO {...STATIC_PAGE_META['/']} structuredData={structuredData} />
      <Helmet>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_URL} />
      </Helmet>
      <div ref={cursor} className="wcl-cur" aria-hidden="true" />
      <Header />
      <main>
        <Hero />
        <Marquee />
        <Platform />
        <IndexSection />
        <Steps />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
