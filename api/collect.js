// First-party event collector — privacy-light. No PII. Visible in Vercel Runtime Logs.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const allow = new Set([
    'page_view','content_view','second_page','guide_open','build_open',
    'github_outbound','ventram_outbound','fann_outbound',
    'linkedin_outbound','x_outbound','medium_outbound','contact_action'
  ]);
  const event = String(body.event || '').slice(0, 64);
  if (!allow.has(event)) return res.status(400).json({ ok: false, error: 'unknown_event' });

  const row = {
    event,
    ts: new Date().toISOString(),
    path: String(body.path || '').slice(0, 200),
    lang: String(body.lang || '').slice(0, 16),
    utm_source: body.utm_source ? String(body.utm_source).slice(0, 80) : undefined,
    utm_medium: body.utm_medium ? String(body.utm_medium).slice(0, 80) : undefined,
    utm_campaign: body.utm_campaign ? String(body.utm_campaign).slice(0, 80) : undefined,
    referrer: body.referrer ? String(body.referrer).slice(0, 200) : undefined,
    href: body.href ? String(body.href).slice(0, 300) : undefined,
  };
  console.log('[site-analytics]', JSON.stringify(row));
  return res.status(204).end();
};
