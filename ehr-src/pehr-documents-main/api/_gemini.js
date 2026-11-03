// Shared helpers for the Gemini-backed serverless functions in /api.
// Files starting with "_" are not deployed as routes by Vercel.
//
// The key lives ONLY in the server-side env var GEMINI_API_KEY
// (Vercel → Project → Settings → Environment Variables; .env.local locally).
// It never reaches the browser: the page talks to /api/*, and the Live voice
// session uses a short-lived, single-use token minted by /api/live-token.

const BASE = 'https://generativelanguage.googleapis.com';

function key() { return process.env.GEMINI_API_KEY || ''; }

// Vercel pre-parses JSON bodies; a plain Node server does not.
async function readBody(req) {
  if (req.body != null) {
    if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
    return req.body;
  }
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => { d += c; });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

// Only pages served from this same host may call the proxies from a browser.
// (It does not stop a determined script — put real auth in front for production.)
function sameOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

// POST to a model, falling back down the list on overload (429/5xx).
async function generate(models, body, timeoutMs) {
  let last = { status: 502, json: { error: { message: 'no model answered' } } };
  for (const model of models) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs || 40000);
    try {
      const r = await fetch(`${BASE}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const json = await r.json().catch(() => ({}));
      if (r.ok) return { status: 200, json, model };
      last = { status: r.status, json, model };
      if (r.status !== 429 && r.status < 500) return last;   // a real error — don't retry
    } catch (e) {
      last = { status: 504, json: { error: { message: e.name === 'AbortError' ? 'timeout' : String(e.message || e) } }, model };
    } finally {
      clearTimeout(t);
    }
  }
  return last;
}

module.exports = { BASE, key, readBody, send, sameOrigin, generate };
