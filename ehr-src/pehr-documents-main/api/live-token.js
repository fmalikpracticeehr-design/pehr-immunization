// Mints a short-lived, single-use token for a Gemini Live voice session.
// The browser opens the Live WebSocket with this token — never with the key.
const { BASE, key, send, sameOrigin } = require('./_gemini');

// Gemini Live model with native audio (voice in → voice out + tool calls)
const LIVE_MODEL = 'gemini-3.8-live';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Forbidden' });
  if (!key()) return send(res, 500, { error: 'AI not configured on server (set GEMINI_API_KEY env var)' });

  const now = Date.now();
  try {
    const r = await fetch(`${BASE}/v1alpha/auth_tokens`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uses: 1,                                                    // one session per token
        expireTime: new Date(now + 30 * 60e3).toISOString(),        // the session may run 30 min
        newSessionExpireTime: new Date(now + 60e3).toISOString(),   // …but must start within 1 min
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.name) return send(res, r.status || 502, { error: (j.error && j.error.message) || 'could not start a voice session' });
    send(res, 200, { token: j.name, model: LIVE_MODEL });
  } catch (e) {
    send(res, 502, { error: String(e.message || e) });
  }
};
