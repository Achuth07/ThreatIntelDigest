/**
 * Which page numbers a pager shows. Pure, so the server-rendered hub pages use it too.
 * Few pages: all of them. Many: both ends plus the pages around the current one.
 */

const SHOW_ALL_UP_TO = 40;
const WINDOW = 2;

export function pageList(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= SHOW_ALL_UP_TO) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const wanted = new Set<number>([1, 2, totalPages - 1, totalPages]);
  for (let n = page - WINDOW; n <= page + WINDOW; n++) if (n >= 1 && n <= totalPages) wanted.add(n);

  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}
