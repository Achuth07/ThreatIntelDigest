import { KEV_ANSWER, KEV_FAQ } from '@/lib/kev-content';

/** Answer-first text under the KEV hub heading (WHA-19). */
export function KevAnswer() {
  return <p className="text-slate-400 mt-1 max-w-3xl">{KEV_ANSWER}</p>;
}

/** The FAQ at the bottom of the first page of the KEV hub. Same text as the structured data. */
export function KevFaq() {
  return (
    <section aria-labelledby="kev-faq" className="mt-4 border-t border-slate-800 pt-8">
      <h2 id="kev-faq" className="text-xl font-bold text-slate-100 mb-4">
        Frequently asked questions
      </h2>
      <div className="grid gap-5 md:grid-cols-2">
        {KEV_FAQ.map(({ question, answer }) => (
          <div key={question}>
            <h3 className="text-base font-semibold text-slate-200">{question}</h3>
            <p className="text-sm text-slate-400 mt-1">{answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The vendors with the most KEV entries, from the same list the vendor filter uses. */
export function KevTopVendors({ vendors }: { vendors: { vendorProject: string; count: number }[] }) {
  const top = [...vendors].sort((a, b) => b.count - a.count || a.vendorProject.localeCompare(b.vendorProject)).slice(0, 10);
  if (top.length === 0) return null;
  return (
    <section aria-labelledby="kev-vendors" className="mt-4 border-t border-slate-800 pt-8">
      <h2 id="kev-vendors" className="text-xl font-bold text-slate-100 mb-4">
        Most affected vendors
      </h2>
      <ul className="grid gap-x-8 gap-y-1 text-sm text-slate-300 sm:grid-cols-2">
        {top.map((v) => (
          <li key={v.vendorProject} className="flex justify-between border-b border-slate-800/60 py-1">
            <span>{v.vendorProject}</span>
            <span className="text-slate-400">
              {v.count} {v.count === 1 ? 'entry' : 'entries'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
