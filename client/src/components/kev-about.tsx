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
