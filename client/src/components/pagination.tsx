import { Link } from 'wouter';
import { pageList } from '@/lib/page-list';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Numbered pagination made of plain links (href="?page=N"), so crawlers can follow every page and
 * every page is a click or two from the first one (WHA-34). When there are few enough pages, all of
 * them are linked; beyond that, the pages around the current one plus both ends are shown.
 */

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  label?: string;
}

const linkClass =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-700 px-2.5 text-sm text-slate-300 transition-colors hover:border-whatcyber-teal/60 hover:text-whatcyber-teal';
const currentClass =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-whatcyber-teal bg-whatcyber-teal/10 px-2.5 text-sm font-semibold text-whatcyber-teal';
const disabledClass =
  'inline-flex h-9 min-w-9 cursor-not-allowed items-center justify-center rounded-md border border-slate-800 px-2.5 text-sm text-slate-600';

export function Pagination({ page, totalPages, hrefFor, label = 'Pagination' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const first = page <= 1;
  const last = page >= totalPages;

  return (
    <nav aria-label={label} className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {first ? (
        <span className={disabledClass} aria-hidden="true">
          <ChevronsLeft className="h-4 w-4" />
        </span>
      ) : (
        <Link href={hrefFor(1)} className={linkClass} aria-label="First page">
          <ChevronsLeft className="h-4 w-4" />
        </Link>
      )}
      {first ? (
        <span className={disabledClass} aria-hidden="true">
          <ChevronLeft className="h-4 w-4" />
        </span>
      ) : (
        <Link href={hrefFor(page - 1)} rel="prev" className={linkClass} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}

      {pageList(page, totalPages).map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-slate-600" aria-hidden="true">
            …
          </span>
        ) : entry === page ? (
          <span key={entry} className={currentClass} aria-current="page">
            {entry}
          </span>
        ) : (
          <Link key={entry} href={hrefFor(entry)} className={linkClass} aria-label={`Page ${entry}`}>
            {entry}
          </Link>
        )
      )}

      {last ? (
        <span className={disabledClass} aria-hidden="true">
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link href={hrefFor(page + 1)} rel="next" className={linkClass} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
      {last ? (
        <span className={disabledClass} aria-hidden="true">
          <ChevronsRight className="h-4 w-4" />
        </span>
      ) : (
        <Link href={hrefFor(totalPages)} className={linkClass} aria-label="Last page">
          <ChevronsRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
