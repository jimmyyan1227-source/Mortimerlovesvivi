'use strict';

// Minimal server-side DeepL proxy. Keep DEEPL_API_KEY in the hosting provider's
// environment variables; never put it in app.js or commit it to GitHub.
const http = require('node:http');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 8787);
const API_KEY = String(process.env.DEEPL_API_KEY || '').trim();
const DEFAULT_API_TYPE = process.env.DEEPL_API_TYPE === 'pro' ? 'pro' : 'free';
const allowedOrigins = String(process.env.ALLOWED_ORIGIN || 'http://localhost:8000,http://127.0.0.1:8000')
  .split(',').map(s => s.trim()).filter(Boolean);
const rateLimits = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

function send(res, status, payload, originAllowed = false) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(originAllowed ? { 'Access-Control-Allow-Origin': res._allowedOrigin, 'Vary': 'Origin' } : {})
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const origin = String(req.headers.origin || '');
  const originAllowed = allowedOrigins.includes(origin);
  res._allowedOrigin = origin;

  if (req.method === 'OPTIONS') {
    if (!originAllowed) return send(res, 403, { error: `Origin not allowed: ${origin || '(no Origin header)'}` });
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
      'Vary': 'Origin'
    });
    return res.end();
  }

  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  if (req.method === 'GET' && pathname === '/health') {
    return send(res, 200, { ok: true, service: 'retro-otome-deepl-proxy', keyConfigured: Boolean(API_KEY) }, originAllowed);
  }
  if (req.method !== 'POST' || pathname !== '/api/translate') {
    return send(res, 404, { error: 'Not found. Use POST /api/translate or GET /health.' }, originAllowed);
  }
  if (!originAllowed) return send(res, 403, { error: `Origin not allowed: ${origin || '(no Origin header)'}. Set ALLOWED_ORIGIN to your website origin.` });
  if (!API_KEY) return send(res, 500, { error: 'Server configuration missing: DEEPL_API_KEY environment variable is not set.' }, true);

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const prior = rateLimits.get(ip);
  if (!prior || now - prior.start >= WINDOW_MS) rateLimits.set(ip, { start: now, count: 1 });
  else if (prior.count >= MAX_REQUESTS) return send(res, 429, { error: 'Rate limit exceeded. Try again in one minute.' }, true);
  else prior.count += 1;

  let raw = '';
  try {
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 20_000) return send(res, 413, { error: 'Request body too large.' }, true);
    }
    const body = JSON.parse(raw || '{}');
    const text = String(body.text || '').trim();
    const targetLang = String(body.target_lang || '').toUpperCase();
    const apiType = body.apiType === 'pro' ? 'pro' : (body.apiType === 'free' ? 'free' : DEFAULT_API_TYPE);
    if (!text) return send(res, 400, { error: 'Missing text.' }, true);
    if (text.length > 5000) return send(res, 413, { error: 'Text exceeds 5000 characters.' }, true);
    if (!['EN-US', 'JA', 'KO', 'DE'].includes(targetLang)) {
      return send(res, 400, { error: 'Unsupported target_lang. Allowed: EN-US, JA, KO, DE.' }, true);
    }

    const deeplEndpoint = apiType === 'pro'
      ? 'https://api.deepl.com/v2/translate'
      : 'https://api-free.deepl.com/v2/translate';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let upstream;
    try {
      upstream = await fetch(deeplEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: [text], target_lang: targetLang }),
        signal: controller.signal
      });
    } catch (error) {
      const message = error.name === 'AbortError' ? 'DeepL request timed out after 12 seconds.' : `Could not reach DeepL: ${error.message}`;
      return send(res, 502, { error: message, stage: 'server-to-deepl' }, true);
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await upstream.text();
    let data;
    try { data = JSON.parse(responseText); } catch { data = null; }
    if (!upstream.ok) {
      const detail = data?.message || data?.detail || responseText.slice(0, 500) || upstream.statusText;
      return send(res, upstream.status, { error: `DeepL HTTP ${upstream.status}: ${detail}`, upstreamStatus: upstream.status }, true);
    }
    const translated = data?.translations?.[0]?.text;
    if (typeof translated !== 'string' || !translated.trim()) {
      return send(res, 502, { error: 'DeepL returned no translation text.', stage: 'invalid-upstream-response' }, true);
    }
    return send(res, 200, { translations: [{ text: translated.trim() }], target_lang: targetLang, apiType }, true);
  } catch (error) {
    return send(res, 400, { error: `Invalid request: ${error.message}` }, originAllowed);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Retro Otome DeepL proxy listening on port ${PORT}`);
  console.log(`DeepL key configured: ${Boolean(API_KEY)}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ') || '(none)'}`);
});
