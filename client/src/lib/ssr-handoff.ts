import { useEffect } from 'react';

/**
 * Hands the page over from the server-rendered content to the React app (WHA-17 phase 2).
 *
 * The server writes a readable copy of the page into #ssr-content and parks the empty app container
 * off-screen. The app builds the real page there, and once it has its data, the server copy is
 * removed and the app appears in its place. Crawlers that do not run JavaScript only ever see the
 * server copy; visitors see it until the app is ready.
 */

const SSR_ID = 'ssr-content';

export function removeSsrContent() {
  if (typeof document === 'undefined') return;
  document.getElementById(SSR_ID)?.remove();
}

/** Call from a page with `ready` true once its main content has loaded (or failed to load). */
export function useSsrHandoff(ready: boolean) {
  useEffect(() => {
    if (ready) removeSsrContent();
  }, [ready]);
}

/**
 * Safety net: the server copy never stays forever, even if a page forgets to call the hook,
 * and it is dropped when the visitor navigates somewhere else.
 */
export function installSsrFallbacks() {
  if (typeof window === 'undefined' || !document.getElementById(SSR_ID)) return;
  const initialPath = window.location.pathname;
  window.setTimeout(removeSsrContent, 8000);
  const onNavigate = () => {
    if (window.location.pathname !== initialPath) removeSsrContent();
  };
  window.addEventListener('popstate', onNavigate);
  // wouter uses pushState; poll cheaply until the block is gone
  const timer = window.setInterval(() => {
    if (!document.getElementById(SSR_ID)) {
      window.clearInterval(timer);
      return;
    }
    onNavigate();
  }, 500);
}
