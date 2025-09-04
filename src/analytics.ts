/* Analytics module — side-effecting. Import in app entry to initialize.

Exports:
- getSessionUUID(): string
- trackEvent(action: string, details?: Record<string, unknown>): void
- rescan(): void

Side effects:
- Initializes bindings on import (runs initAnalytics)
- Exposes window.AppAnalytics for debugging

Features:
- Session-scoped UUID (sessionStorage)
- Safe gtag shim if gtag not loaded
- Binds known IDs, file inputs, declarative data-track-action, heuristics
- SPA page_view tracking
*/

type Details = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    AppAnalytics?: {
      trackEvent: (action: string, details?: Details) => void;
      getSessionUUID: () => string;
      rescan: () => void;
    };
  }
}

const SESSION_KEY = 'cp_session_uuid';

function fallbackUUID(): string {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

export function getSessionUUID(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const generated = (typeof crypto !== 'undefined' && typeof (crypto as unknown as { randomUUID?: () => string }).randomUUID === 'function')
      ? (crypto as unknown as { randomUUID: () => string }).randomUUID()
      : fallbackUUID();

    sessionStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    // sessionStorage not available
    return fallbackUUID();
  }
}

function ensureGtag(): void {
  try {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = (...args: unknown[]) => { (window.dataLayer as unknown[]).push(args); };
    }
  } catch {
    // ignore
  }
}

export function trackEvent(action: string, details: Details = {}): void {
  try {
    ensureGtag();
    const payload: Details = Object.assign({ session_uuid: getSessionUUID() }, details || {});
    window.gtag?.('event', action, payload);
  } catch (err) {
    try { console.warn && console.warn('trackEvent failed', err); } catch (_) { /* noop */ }
  }
}

function safeAddListener(el: Element | null, ev: string, fn: EventListenerOrEventListenerObject): void {
  try {
    if (!el) return;
    el.addEventListener(ev, fn as EventListener, { passive: true } as AddEventListenerOptions);
  } catch {
    /* noop */
  }
}

function collectElementDetails(el: Element | null): Details {
  const details: Details = {};
  try {
    if (!el) return details;
    const elm = el as HTMLElement;
    if (elm.dataset) {
      if (elm.dataset.trackDetails) {
        try { Object.assign(details, JSON.parse(elm.dataset.trackDetails)); } catch (_) { /* ignore invalid JSON */ }
      }
      Object.keys(elm.dataset).forEach(k => {
        if (k === 'trackDetails' || k === 'trackAction' || k === 'trackBound') return;
        (details as Record<string, unknown>)[k] = (elm.dataset as DOMStringMap & Record<string, string>)[k];
      });
    }
    const aria = elm.getAttribute && elm.getAttribute('aria-label'); if (aria) (details as Record<string, unknown>).aria_label = aria;
    const title = elm.getAttribute && elm.getAttribute('title'); if (title) (details as Record<string, unknown>).title = title;
    const txt = (elm.textContent || '').trim(); if (txt) (details as Record<string, unknown>).text = txt.slice(0, 200);
  } catch {
    /* noop */
  }
  return details;
}

// --- Binding implementations ---
function bindKnownIds(): void {
  try {
    const elUploadHar = document.getElementById('upload-har') as HTMLInputElement | null;
    if (elUploadHar) {
      safeAddListener(elUploadHar, 'change', (e: Event) => {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files && input.files[0];
        trackEvent('upload_har', { file_type: 'har', file_name: file?.name, file_size: file?.size });
      });
    }

    const elUploadPostman = document.getElementById('upload-postman') as HTMLInputElement | null;
    if (elUploadPostman) {
      safeAddListener(elUploadPostman, 'change', (e: Event) => {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files && input.files[0];
        trackEvent('upload_postman', { file_type: 'postman', file_name: file?.name, file_size: file?.size });
      });
    }

    const genPlan = document.getElementById('generate-test-plan');
    if (genPlan) safeAddListener(genPlan, 'click', () => trackEvent('generate_test_plan'));
    const genScenario = document.getElementById('generate-test-scenario');
    if (genScenario) safeAddListener(genScenario, 'click', () => trackEvent('generate_test_scenario'));
    const genCases = document.getElementById('generate-test-cases');
    if (genCases) safeAddListener(genCases, 'click', () => trackEvent('generate_test_cases'));
  } catch {
    /* noop */
  }
}

function bindGenericFiles(): void {
  try {
    document.querySelectorAll('input[type="file"]').forEach(node => {
      const input = node as HTMLInputElement;
      if ((input as HTMLElement).getAttribute('data-track-bound')) return;
      safeAddListener(input, 'change', (e: Event) => {
        const el = e.currentTarget as HTMLInputElement;
        const file = el.files && el.files[0];
        const details: Details = {};
        if (file) Object.assign(details, { file_name: file.name, file_size: file.size, file_type: file.type });
        const name = (file && file.name) ? file.name.toLowerCase() : '';
        if (name.endsWith('.har')) (details as Record<string, unknown>).file_type = 'har';
        else if (name.includes('postman') || name.endsWith('.json')) (details as Record<string, unknown>).file_type = 'postman';
        const action = (el.dataset && (el.dataset as DOMStringMap & Record<string, string>).trackAction) ? (el.dataset as DOMStringMap & Record<string, string>).trackAction : 'upload_file';
        trackEvent(action, details);
      });
      (input as HTMLElement).setAttribute('data-track-bound', '1');
    });
  } catch {
    /* noop */
  }
}

function attachDeclarative(root: ParentNode = document): void {
  try {
    root.querySelectorAll('[data-track-action]').forEach(node => {
      const el = node as HTMLElement;
      if (el.getAttribute('data-track-bound')) return;
      const action = (el.dataset && (el.dataset as DOMStringMap & Record<string, string>).trackAction) as string | undefined;
      if (!action) return;
      const ev = (el instanceof HTMLInputElement && el.type === 'file') ? 'change' : 'click';
      if (ev === 'change') {
        safeAddListener(el, 'change', (e: Event) => {
          const input = e.currentTarget as HTMLInputElement;
          const details: Details = collectElementDetails(el);
          const file = input.files && input.files[0];
          if (file) Object.assign(details, { file_name: file.name, file_size: file.size, file_type: file.type });
          trackEvent(action, details);
        });
      } else {
        safeAddListener(el, 'click', () => trackEvent(action, collectElementDetails(el)));
      }
      el.setAttribute('data-track-bound', '1');
    });
  } catch {
    /* noop */
  }
}

function bindHeuristics(): void {
  try {
    document.querySelectorAll('button').forEach(node => {
      const btn = node as HTMLElement;
      if (btn.getAttribute('data-track-bound')) return;
      const txt = (btn.textContent || '').toLowerCase();
      if (!txt) return;
      if (txt.includes('test plan')) safeAddListener(btn, 'click', () => trackEvent('generate_test_plan'));
      else if (txt.includes('test scenarios')) safeAddListener(btn, 'click', () => trackEvent('generate_test_scenario'));
      else if (txt.includes('test cases')) safeAddListener(btn, 'click', () => trackEvent('generate_test_cases'));
      else if (txt.includes('playwright') || txt.includes('code')) safeAddListener(btn, 'click', () => trackEvent('generate_code'));
      btn.setAttribute('data-track-bound', '1');
    });
  } catch {
    /* noop */
  }
}

let spaHooked = false;
function hookSpaNavigation(): void {
  try {
    if (spaHooked) return;
    spaHooked = true;

    // initial page view
    trackEvent('page_view', { path: location.pathname + location.search });

    const origPush: typeof history.pushState = history.pushState;
    history.pushState = function (this: History, ...args: Parameters<History['pushState']>) {
      // call original
      origPush.apply(this, args as unknown as Parameters<typeof origPush>);
      trackEvent('page_view', { path: location.pathname + location.search });
    } as typeof history.pushState;

    window.addEventListener('popstate', () => trackEvent('page_view', { path: location.pathname + location.search }));
  } catch {
    /* noop */
  }
}

export function rescan(): void {
  try {
    attachDeclarative(document);
    bindGenericFiles();
    bindHeuristics();
    bindKnownIds();
  } catch {
    /* noop */
  }
}

function initAnalytics(): void {
  try {
    ensureGtag();
    bindKnownIds();
    bindGenericFiles();
    attachDeclarative();
    bindHeuristics();
    hookSpaNavigation();

    // Expose stable API for debugging; replace or extend existing object.
    const api = { trackEvent, getSessionUUID, rescan } as {
      trackEvent: (action: string, details?: Details) => void;
      getSessionUUID: () => string;
      rescan: () => void;
    };
    window.AppAnalytics = Object.assign({}, window.AppAnalytics || {}, api);
  } catch {
    /* noop */
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAnalytics);
  else initAnalytics();
}
