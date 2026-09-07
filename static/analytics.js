/*! First-party analytics — aligned with /api/collect.
 * page_view = page actually loaded (never from lang-switch click alone)
 * content_view = article/guide page load (path-based), not nav/CTA clicks
 * ui_click = language switch, hero CTAs, in-page nav that isn't an outbound/content open
 * guide_open / build_open = explicit object opens (data-analytics)
 * *_outbound / contact_action = destination clicks
 * UTM flat; session first-touch; qa:true for exclusion from organic reports
 */
(() => {
  'use strict';

  const ENDPOINT = '/api/collect';
  const dnt =
    navigator.doNotTrack === '1' ||
    window.doNotTrack === '1' ||
    navigator.msDoNotTrack === '1';

  window.dataLayer = window.dataLayer || [];

  function parseUtm() {
    const params = new URLSearchParams(location.search);
    const out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => {
      const v = params.get(k);
      if (v) out[k] = v;
    });
    return out;
  }

  function loadUtm() {
    let utm = parseUtm();
    if (Object.keys(utm).length) {
      try { sessionStorage.setItem('ha_utm', JSON.stringify(utm)); } catch (_) {}
      return utm;
    }
    try { return JSON.parse(sessionStorage.getItem('ha_utm') || '{}') || {}; }
    catch (_) { return {}; }
  }

  const storedUtm = loadUtm();

  function isQa(utm) {
    const s = String((utm && utm.utm_source) || '').toLowerCase();
    return (
      s === 'qa' ||
      s.includes('cutover') ||
      s.includes('root-fix') ||
      s === 'site-qa' ||
      s === 'analytics-qa'
    );
  }

  function push(event, payload) {
    if (dnt) return;
    const utm = storedUtm || {};
    const row = {
      event,
      ts: new Date().toISOString(),
      path: location.pathname,
      lang: document.documentElement.lang || '',
      referrer: document.referrer || '',
      utm_source: utm.utm_source || undefined,
      utm_medium: utm.utm_medium || undefined,
      utm_campaign: utm.utm_campaign || undefined,
      utm_term: utm.utm_term || undefined,
      utm_content: utm.utm_content || undefined,
      qa: isQa(utm) || undefined,
      ...payload,
    };
    window.dataLayer.push(row);
    if (typeof console !== 'undefined' && console.debug) console.debug('[analytics]', row);
    if (!ENDPOINT) return;
    try {
      const body = JSON.stringify(row);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
          credentials: 'omit',
        }).catch(() => {});
      }
    } catch (_) {}
  }

  // Actual page load only
  push('page_view', { title: document.title });

  // Content-page view: guide/note/article paths (not homepage, not posts index alone as "content")
  (function contentPageView() {
    const p = location.pathname.replace(/\/+$/, '') || '/';
    const isLocaleHome = /^\/(en|ar)?$/.test(p) || p === '/en' || p === '/ar';
    const isPostsIndex = /\/(en|ar)\/posts$/.test(p);
    const isGuideLike =
      /\/(en|ar)\/[a-z0-9][\w-]+$/i.test(p) && !isLocaleHome && !isPostsIndex;
    if (isGuideLike) {
      push('content_view', { title: document.title, content_kind: 'page' });
    }
  })();

  try {
    const key = 'ha_pages';
    const prev = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (!prev.includes(location.pathname)) {
      prev.push(location.pathname);
      sessionStorage.setItem(key, JSON.stringify(prev));
      if (prev.length === 2) push('second_page', { pages: prev.slice(0, 8) });
    }
  } catch (_) {}

  function mapClick(raw, href) {
    const v = (raw || '').toLowerCase().replace(/-/g, '_');
    if (v.includes('lang')) return 'ui_click';
    if (v.includes('cta') || v === 'cta_primary_hero' || v === 'cta_secondary_hero') return 'ui_click';
    if (v.includes('guide')) return 'guide_open';
    if (v.includes('build') || v === 'object_open') return 'build_open';
    // content_open on cards that navigate to articles = guide_open/content intent click, NOT content_view
    if (v.includes('content') || v.includes('library') || v.includes('insight')) return 'ui_click';
    if (v.includes('github') || v === 'outbound_github') return 'github_outbound';
    if (v.includes('ventram') || v === 'outbound_ventram') return 'ventram_outbound';
    if (v.includes('fann') || v === 'outbound_fann') return 'fann_outbound';
    if (v.includes('linkedin')) return 'linkedin_outbound';
    if (v.includes('medium')) return 'medium_outbound';
    if (v.includes('outbound_social') || v === 'outbound_social') {
      const h = (href || '').toLowerCase();
      if (h.includes('linkedin.com')) return 'linkedin_outbound';
      if (h.includes('medium.com')) return 'medium_outbound';
      if (h.includes('x.com') || h.includes('twitter.com')) return 'x_outbound';
      return 'ui_click';
    }
    if (v.includes('contact') || v.includes('whatsapp')) return 'contact_action';
    return 'ui_click';
  }

  document.addEventListener(
    'click',
    (e) => {
      const el = e.target.closest('[data-analytics]');
      if (!el) return;
      const raw = el.getAttribute('data-analytics');
      const href = el.href || el.getAttribute('href') || '';
      const event = mapClick(raw, href);
      push(event, {
        label: el.getAttribute('data-analytics-label') || raw,
        href,
        text: (el.textContent || '').trim().slice(0, 80),
        object_type: el.getAttribute('data-object-type') || '',
        click_kind: raw || '',
      });
    },
    true
  );
})();
