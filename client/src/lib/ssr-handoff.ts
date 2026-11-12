import { useEffect } from 'react';

/**
 * Hands the page over from the server-rendered content to the React app (WHA-17 phase 2).
 *
 * The server writes a readable copy of the page into #ssr-content and parks the empty app container
 * off-screen. The app builds the real page there, and once it has its data, the server copy is
 * hidden and the app appears in its place. Crawlers that do not run JavaScript only ever see the
 * server copy; visitors see it until the app is ready.
 *
 * The copy is hidden (taken out of view and of the accessibility tree) rather than removed, so the
 * browser keeps counting its early paint as the page's main content (Largest Contentful Paint).
 * It is removed for good when the visitor navigates to another page.
 */

const SSR_ID = 'ssr-content';

export function removeSsrContent() {
  if (typeof document === 'undefined') return;
  document.getElementById(SSR_ID)?.remove();
}

/** Takes the server copy out of sight; the app container returns to normal layout. */
export function hideSsrContent() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(SSR_ID);
  if (!el || el.hasAttribute('data-handed-off')) return;
  el.setAttribute('data-handed-off', '');
  el.setAttribute('aria-hidden', 'true');
}

/** Call from a page with `ready` true once its main content has loaded (or failed to load). */
export function useSsrHandoff(ready: boolean) {
  useEffect(() => {
    if (ready) hideSsrContent();
  }, [ready]);
}

/**
 * Safety net: the server copy never stays in view forever, even if a page forgets to call the hook,
 * and it is dropped when the visitor navigates somewhere else.
 */
export function installSsrFallbacks() {
  if (typeof window === 'undefined' || !document.getElementById(SSR_ID)) return;
  const initialPath = window.location.pathname;
  window.setTimeout(hideSsrContent, 8000);
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
