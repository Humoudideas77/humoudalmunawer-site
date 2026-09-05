/*! First-party privacy-light analytics stub — no third-party account required.
 * Funnel: VISIT → CONTENT → SECOND_PAGE → OUTBOUND → CONTACT
 * Respects Do Not Track. Console + optional dataLayer + optional POST placeholder.
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
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const utm = {};
    keys.forEach((k) => {
      const v = params.get(k);
      if (v) utm[k] = v;
    });
    return utm;
  }

  function push(event, payload) {
    if (dnt) return;
    const row = {
      event,
      ts: new Date().toISOString(),
      path: location.pathname,
      lang: document.documentElement.lang || '',
      ...payload,
    };
    window.dataLayer.push(row);
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[analytics]', row);
    }
    if (ENDPOINT) {
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
  }

  const utm = parseUtm();
  if (Object.keys(utm).length) {
    try {
      sessionStorage.setItem('ha_utm', JSON.stringify(utm));
    } catch (_) {}
  }
  let storedUtm = utm;
  if (!Object.keys(storedUtm).length) {
    try {
      storedUtm = JSON.parse(sessionStorage.getItem('ha_utm') || '{}');
    } catch (_) {
      storedUtm = {};
    }
  }

  push('page_view', {
    title: document.title,
    referrer: document.referrer || '',
    utm: storedUtm,
  });

  // Second-page signal within session
  try {
    const key = 'ha_pages';
    const prev = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (!prev.includes(location.pathname)) {
      prev.push(location.pathname);
      sessionStorage.setItem(key, JSON.stringify(prev));
      if (prev.length === 2) {
        push('second_page', { pages: prev });
      }
    }
  } catch (_) {}

  function mapEvent(raw) {
    const v = (raw || '').toLowerCase().replace(/-/g, '_');
    if (v.includes('guide')) return 'guide_open';
    if (v.includes('build') || v === 'object_open') return 'build_open';
    if (v.includes('content') || v.includes('cta') || v.includes('library')) return 'content_open';
    if (v.includes('github')) return 'outbound_github';
    if (v.includes('ventram')) return 'outbound_ventram';
    if (v.includes('fann')) return 'outbound_fann';
    if (v.includes('social')) return 'outbound_social';
    if (v.includes('contact') || v.includes('whatsapp')) return 'contact';
    if (v.includes('lang')) return 'lang_switch';
    return v || 'click';
  }

  document.addEventListener(
    'click',
    (e) => {
      const el = e.target.closest('[data-analytics]');
      if (!el) return;
      const raw = el.getAttribute('data-analytics');
      const event = mapEvent(raw);
      push(event, {
        label: el.getAttribute('data-analytics-label') || raw,
        href: el.href || el.getAttribute('href') || '',
        text: (el.textContent || '').trim().slice(0, 80),
        object_type: el.getAttribute('data-object-type') || '',
      });
    },
    true
  );
})();
