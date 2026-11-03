// Same-origin AI proxy (Vercel Serverless Function) — powered by Gemini.
//
// The page keeps speaking the OpenAI chat-completions dialect it already
// uses everywhere (document summary, foot-exam analysis, AI Assist):
//   { messages, temperature, response_format: {type:'json_object'}, tools }
// and gets back { choices: [{ message: { content, tool_calls } }] }.
// Here that is translated to Gemini generateContent and back.
const { key, readBody, send, sameOrigin, generate } = require('./_gemini');

// Fast first; fall back when a model is overloaded.
const MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];

function partsOf(content) {
  if (typeof content === 'string') return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: String(content == null ? '' : content) }];
  return content.map((c) => {
    if (c && c.type === 'image_url') {
      const url = (c.image_url && c.image_url.url) || '';
      const m = url.match(/^data:([^;]+);base64,(.+)$/);
      return m ? { inlineData: { mimeType: m[1], data: m[2] } } : { text: '[image: ' + url + ']' };
    }
    return { text: (c && (c.text || c.content)) || '' };
  });
}

// OpenAI JSON-schema → Gemini OpenAPI subset (types upper-cased).
function schema(s) {
  if (!s || typeof s !== 'object') return s;
  const out = {};
  if (s.type) out.type = String(Array.isArray(s.type) ? s.type[0] : s.type).toUpperCase();
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.enum;
  if (s.properties) { out.properties = {}; for (const k of Object.keys(s.properties)) out.properties[k] = schema(s.properties[k]); }
  if (s.items) out.items = schema(s.items);
  if (s.required) out.required = s.required;
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Forbidden' });
  if (!key()) return send(res, 500, { error: 'AI not configured on server (set GEMINI_API_KEY env var)' });

  const body = await readBody(req);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return send(res, 400, { error: 'messages required' });

  // system → systemInstruction; assistant → model; tool results → functionResponse
  const system = [], contents = [];
  for (const m of messages) {
    if (!m) continue;
    if (m.role === 'system') { system.push(typeof m.content === 'string' ? m.content : partsOf(m.content).map((p) => p.text || '').join('\n')); continue; }
    if (m.role === 'tool') {
      contents.push({ role: 'user', parts: [{ functionResponse: { name: m.name || 'tool', response: { result: m.content } } }] });
      continue;
    }
    const role = m.role === 'assistant' ? 'model' : 'user';
    const parts = partsOf(m.content).filter((p) => p.inlineData || (p.text && p.text.length));
    (m.tool_calls || []).forEach((tc) => {
      let args = {}; try { args = JSON.parse(tc.function.arguments || '{}'); } catch (e) {}
      parts.push({ functionCall: { name: tc.function.name, args } });
    });
    if (!parts.length) continue;
    // Gemini wants strictly alternating turns — merge consecutive same-role ones
    const prev = contents[contents.length - 1];
    if (prev && prev.role === role) prev.parts.push(...parts); else contents.push({ role, parts });
  }
  if (!contents.length) return send(res, 400, { error: 'no user content' });

  const generationConfig = {};
  if (typeof body.temperature === 'number') generationConfig.temperature = Math.max(0, Math.min(2, body.temperature));
  if (typeof body.max_tokens === 'number') generationConfig.maxOutputTokens = Math.min(8192, body.max_tokens);
  if (body.response_format && body.response_format.type === 'json_object') generationConfig.responseMimeType = 'application/json';

  const payload = { contents, generationConfig };
  if (system.length) payload.systemInstruction = { parts: [{ text: system.join('\n\n') }] };
  if (Array.isArray(body.tools) && body.tools.length) {
    payload.tools = [{ functionDeclarations: body.tools.filter((t) => t && t.function).map((t) => ({
      name: t.function.name, description: t.function.description || '',
      parameters: t.function.parameters ? schema(t.function.parameters) : undefined,
    })) }];
  }

  const r = await generate(MODELS, payload, 40000);
  if (r.status !== 200) {
    return send(res, r.status, { error: (r.json && r.json.error && r.json.error.message) || 'AI request failed' });
  }
  const parts = (r.json.candidates && r.json.candidates[0] && r.json.candidates[0].content && r.json.candidates[0].content.parts) || [];
  const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
  const calls = parts.filter((p) => p.functionCall).map((p, i) => ({
    id: p.functionCall.id || ('call_' + i), type: 'function',
    function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args || {}) },
  }));
  const message = { role: 'assistant', content: text || (calls.length ? '' : null) };
  if (calls.length) message.tool_calls = calls;
  send(res, 200, { id: 'gemini', object: 'chat.completion', model: r.model,
    choices: [{ index: 0, message, finish_reason: calls.length ? 'tool_calls' : 'stop' }] });
};
