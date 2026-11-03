// Health Education AI — thin, guarded LLM proxy (same-origin, key stays server-side).
//
// Env var (Vercel → Project → Settings → Environment Variables):
//   GEMINI_API_KEY   the same key the existing /api/ai proxy uses (required for live AI)
//   HE_MODEL         optional model override (default: gemini-3.5-flash-lite)
//
// Request  (POST, JSON):  { messages: [{role, content}], json?: boolean, temperature?: number }
// Response (OpenAI chat-completions shape): { choices: [{ message: { role, content } }], model }
// If GEMINI_API_KEY is missing the function answers 501 and the web app falls back to
// /api/ai and then to its built-in simulated generator, so the static site keeps working.

const { sameOrigin } = require('./_gemini');

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const MAX_MESSAGES = 14;
const MAX_CHARS = 24000;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST only' }); }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Forbidden' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(501).json({ error: 'GEMINI_API_KEY is not set for this environment' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || !Array.isArray(body.messages) || !body.messages.length) return res.status(400).json({ error: 'messages[] required' });
  if (body.messages.length > MAX_MESSAGES) return res.status(400).json({ error: 'too many messages' });

  let total = 0;
  const messages = [];
  for (const m of body.messages) {
    if (!m || typeof m.content !== 'string' || !['system', 'user', 'assistant'].includes(m.role)) return res.status(400).json({ error: 'bad message' });
    total += m.content.length;
    messages.push({ role: m.role, content: m.content });
  }
  if (total > MAX_CHARS) return res.status(413).json({ error: 'request too large' });

  const payload = {
    model: process.env.HE_MODEL || 'gemini-3.5-flash-lite',
    temperature: Math.min(Math.max(Number(body.temperature) || 0.3, 0), 1),
    messages,
  };
  if (body.json) payload.response_format = { type: 'json_object' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: e && e.name === 'AbortError' ? 'upstream timeout' : 'upstream error' });
  } finally {
    clearTimeout(timer);
  }
};
