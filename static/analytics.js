/*! First-party privacy-light analytics — schema aligned with /api/collect.
 * Funnel: VISIT → CONTENT → SECOND_PAGE → OUTBOUND → CONTACT
 * Respects Do Not Track. Events land in Vercel Runtime Logs as [site-analytics].
 * Canonical events: page_view, content_view, second_page, guide_open, build_open,
 * github_outbound, ventram_outbound, fann_outbound, linkedin_outbound, x_outbound,
 * medium_outbound, contact_action.
 * QA traffic: utm_source=qa|*cutover*|root-fix|site-qa is labeled qa:true for exclusion.
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
      try {
        sessionStorage.setItem('ha_utm', JSON.stringify(utm));
      } catch (_) {}
      return utm;
    }
    try {
      return JSON.parse(sessionStorage.getItem('ha_utm') || '{}') || {};
    } catch (_) {
      return {};
    }
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
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[analytics]', row);
    }
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

  push('page_view', { title: document.title });

  try {
    const key = 'ha_pages';
    const prev = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (!prev.includes(location.pathname)) {
      prev.push(location.pathname);
      sessionStorage.setItem(key, JSON.stringify(prev));
      if (prev.length === 2) push('second_page', { pages: prev.slice(0, 8) });
    }
  } catch (_) {}

  function mapEvent(raw) {
    const v = (raw || '').toLowerCase().replace(/-/g, '_');
    if (v.includes('guide')) return 'guide_open';
    if (v.includes('build') || v === 'object_open') return 'build_open';
    if (v.includes('content') || v.includes('cta') || v.includes('library')) return 'content_view';
    if (v.includes('github') || v === 'outbound_github') return 'github_outbound';
    if (v.includes('ventram') || v === 'outbound_ventram') return 'ventram_outbound';
    if (v.includes('fann') || v === 'outbound_fann') return 'fann_outbound';
    if (v.includes('linkedin')) return 'linkedin_outbound';
    if (v === 'outbound_x' || v === 'x_outbound' || (v.includes('outbound') && v.includes('twitter')))
      return 'x_outbound';
    if (v.includes('medium')) return 'medium_outbound';
    if (v.includes('social') && v.includes('outbound')) return 'x_outbound';
    if (v.includes('contact') || v.includes('whatsapp')) return 'contact_action';
    if (v.includes('lang')) return 'page_view';
    return v || 'content_view';
  }

  document.addEventListener(
    'click',
    (e) => {
      const el = e.target.closest('[data-analytics]');
      if (!el) return;
      const raw = el.getAttribute('data-analytics');
      const href = el.href || el.getAttribute('href') || '';
      let event = mapEvent(raw);
      // Disambiguate outbound_social by destination
      if ((raw || '').toLowerCase().includes('outbound_social') || event === 'x_outbound') {
        const h = href.toLowerCase();
        if (h.includes('linkedin.com')) event = 'linkedin_outbound';
        else if (h.includes('medium.com')) event = 'medium_outbound';
        else if (h.includes('x.com') || h.includes('twitter.com')) event = 'x_outbound';
      }
      push(event, {
        label: el.getAttribute('data-analytics-label') || raw,
        href,
        text: (el.textContent || '').trim().slice(0, 80),
        object_type: el.getAttribute('data-object-type') || '',
      });
    },
    true
  );
})();
