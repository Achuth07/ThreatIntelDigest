import { Crosshair } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

function likelihoodTone(score: number): { label: string; text: string } {
  if (score >= 0.5) return { label: 'Very high', text: 'text-red-400' };
  if (score >= 0.1) return { label: 'High', text: 'text-orange-400' };
  if (score >= 0.01) return { label: 'Moderate', text: 'text-yellow-400' };
  return { label: 'Low', text: 'text-green-400' };
}

// Round normally, but never let a score below 1 read as a certain 100%, or a non-zero one as 0%.
function formatPercent(value: number, digits: number): string {
  const step = 10 ** -digits;
  const pct = Number((value * 100).toFixed(digits));
  if (value < 1 && pct >= 100) return `>${(100 - step).toFixed(digits)}%`;
  if (value > 0 && pct === 0) return `<${step.toFixed(digits)}%`;
  return `${pct.toFixed(digits)}%`;
}

export function EpssCard({ score, percentile }: { score: number; percentile: number | null }) {
  const tone = likelihoodTone(score);
  return (
    <Card className="border-slate-700 bg-slate-800 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-100">
          <Crosshair className="h-5 w-5 text-whatcyber-teal" />
          Exploit Prediction (EPSS)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className={`font-mono text-3xl font-bold ${tone.text}`}>{formatPercent(score, 2)}</span>
          <span className={`whitespace-nowrap text-sm font-semibold ${tone.text}`}>{tone.label} likelihood</span>
        </div>
        <Progress value={score * 100} className="h-2 bg-slate-700" aria-label="EPSS score" />
        <p className="text-sm leading-relaxed text-slate-300">
          Estimated chance this vulnerability is exploited in the next 30 days.
          {percentile !== null && (percentile >= 0.999 ? (
            <> Among the <span className="font-semibold text-slate-100">top 0.1%</span> of all scored CVEs.</>
          ) : (
            <> Higher than <span className="font-semibold text-slate-100">{formatPercent(percentile, 1)}</span> of all scored CVEs.</>
          ))}
        </p>
        <p className="text-xs text-slate-500">
          Score from{' '}
          <a href="https://www.first.org/epss/" target="_blank" rel="noreferrer" className="text-whatcyber-teal hover:underline">
            EPSS by FIRST
          </a>
          , updated daily.
        </p>
      </CardContent>
    </Card>
  );
}
