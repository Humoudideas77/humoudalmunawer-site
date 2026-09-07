// First-party event collector — privacy-light. No PII. Visible in Vercel Runtime Logs.
// Canonical event names (aligned with static/analytics.js). Legacy aliases accepted once.
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

  const aliases = {
    outbound_github: 'github_outbound',
    outbound_ventram: 'ventram_outbound',
    outbound_fann: 'fann_outbound',
    outbound_social: 'x_outbound',
    contact: 'contact_action',
    content_open: 'content_view',
  };

  const allow = new Set([
    'page_view', 'content_view', 'second_page', 'guide_open', 'build_open',
    'github_outbound', 'ventram_outbound', 'fann_outbound',
    'linkedin_outbound', 'x_outbound', 'medium_outbound', 'contact_action',
  ]);

  let event = String(body.event || '').slice(0, 64);
  if (aliases[event]) event = aliases[event];
  if (!allow.has(event)) return res.status(400).json({ ok: false, error: 'unknown_event' });

  // Flat UTM (preferred). Nested body.utm still accepted and flattened.
  const nested = body.utm && typeof body.utm === 'object' ? body.utm : {};
  const utm_source = body.utm_source || nested.utm_source;
  const utm_medium = body.utm_medium || nested.utm_medium;
  const utm_campaign = body.utm_campaign || nested.utm_campaign;
  const utm_term = body.utm_term || nested.utm_term;
  const utm_content = body.utm_content || nested.utm_content;

  const row = {
    event,
    ts: new Date().toISOString(),
    path: String(body.path || '').slice(0, 200),
    lang: String(body.lang || '').slice(0, 16),
    utm_source: utm_source ? String(utm_source).slice(0, 80) : undefined,
    utm_medium: utm_medium ? String(utm_medium).slice(0, 80) : undefined,
    utm_campaign: utm_campaign ? String(utm_campaign).slice(0, 80) : undefined,
    utm_term: utm_term ? String(utm_term).slice(0, 80) : undefined,
    utm_content: utm_content ? String(utm_content).slice(0, 80) : undefined,
    referrer: body.referrer ? String(body.referrer).slice(0, 200) : undefined,
    href: body.href ? String(body.href).slice(0, 300) : undefined,
    label: body.label ? String(body.label).slice(0, 80) : undefined,
    object_type: body.object_type ? String(body.object_type).slice(0, 40) : undefined,
    qa: body.qa === true || body.qa === 'true' || undefined,
  };
  console.log('[site-analytics]', JSON.stringify(row));
  return res.status(204).end();
};
