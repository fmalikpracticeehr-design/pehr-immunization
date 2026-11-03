// Text → speech with a Gemini voice (used by "Read aloud").
// POST { text, voice } → audio/wav
const { key, readBody, send, sameOrigin, generate } = require('./_gemini');

const MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts'];
const VOICES = /^[A-Z][a-z]+$/;

// Some TTS models return raw 24 kHz PCM — wrap it so a browser can play it.
function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Forbidden' });
  if (!key()) return send(res, 500, { error: 'AI not configured on server (set GEMINI_API_KEY env var)' });

  const body = await readBody(req);
  const text = String(body.text || '').trim().slice(0, 1500);
  if (!text) return send(res, 400, { error: 'text required' });
  const voice = VOICES.test(body.voice || '') ? body.voice : 'Kore';

  const r = await generate(MODELS, {
    contents: [{ role: 'user', parts: [{ text: 'Read this aloud in a calm, clear, professional clinical tone:\n\n' + text }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
  }, 45000);
  const part = r.status === 200 && r.json.candidates && r.json.candidates[0] && r.json.candidates[0].content &&
               (r.json.candidates[0].content.parts || []).find((p) => p.inlineData);
  if (!part) return send(res, r.status === 200 ? 502 : r.status, { error: (r.json && r.json.error && r.json.error.message) || 'no audio' });

  let audio = Buffer.from(part.inlineData.data, 'base64');
  const mime = part.inlineData.mimeType || '';
  if (!/wav/i.test(mime)) {
    const rate = +((mime.match(/rate=(\d+)/) || [])[1] || 24000);
    audio = wav(audio, rate);
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Cache-Control', 'no-store');
  res.end(audio);
};
