import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Severity } from '@/lib/cvss';

/** Pieces both CVSS calculators (v4.0 and v3.1) share (WHA-29). */

export const SEVERITY_STYLE: Record<Severity, { ring: string; text: string }> = {
  None: { ring: 'border-slate-500', text: 'text-slate-300' },
  Low: { ring: 'border-green-500', text: 'text-green-400' },
  Medium: { ring: 'border-yellow-500', text: 'text-yellow-400' },
  High: { ring: 'border-orange-500', text: 'text-orange-400' },
  Critical: { ring: 'border-red-500', text: 'text-red-400' },
};

/** The big score circle with its severity and a caption such as "CVSS v3.1 base score". */
export function ScoreCard({
  score,
  severity,
  caption,
  children,
}: {
  score: number;
  severity: Severity;
  caption: string;
  children?: React.ReactNode;
}) {
  const style = SEVERITY_STYLE[severity];
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
      <div className="flex items-center gap-4">
        <div className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 bg-slate-900 ${style.ring}`} aria-live="polite">
          <span className={`font-mono text-3xl font-bold ${style.text}`}>{score.toFixed(1)}</span>
        </div>
        <div>
          <div className={`text-xl font-bold ${style.text}`}>{severity}</div>
          <div className="text-xs text-slate-400">{caption}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

/** "Copy vector" and "Copy link" buttons. `link` is the full address that reopens this result. */
export function CopyButtons({ vector, link }: { vector: string; link: string }) {
  const [copied, setCopied] = useState<'vector' | 'link' | null>(null);
  const copy = async (what: 'vector' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'vector' ? vector : link);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard can be blocked; nothing to do */
    }
  };
  return (
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
  );
}
