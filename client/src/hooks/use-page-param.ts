import { useCallback } from 'react';
import { useLocation, useSearch } from 'wouter';

/**
 * URL-driven pagination for hub pages: the page number lives in `?page=N`,
 * and `hrefFor` gives a real URL so previous/next controls can be rendered
 * as plain links that crawlers can follow.
 */
export function usePageParam() {
  const [path, navigate] = useLocation();
  const search = useSearch();

  const raw = parseInt(new URLSearchParams(search).get('page') ?? '1', 10);
  const page = Number.isFinite(raw) && raw > 1 ? raw : 1;

  const hrefFor = useCallback(
    (n: number) => (n > 1 ? `${path}?page=${n}` : path),
    [path]
  );

  // Navigating to the page we are already on is a no-op, so resetting to page 1
  // from a filter or search handler does not add history entries.
  const setPage = useCallback(
    (n: number) => {
      const target = Math.max(1, n);
      if (target !== page) navigate(hrefFor(target));
    },
    [navigate, hrefFor, page]
  );

  return { page, setPage, hrefFor };
}
