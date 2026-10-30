// Free mode: a tiny relay so visitors can use the app with no key of their own.
// It holds ONE key (GEMINI_API_KEY, set in the Vercel project's environment variables) and enforces a daily cap
// per visitor and per day. Request bodies are forwarded to the model and never logged or stored.
//
// Environment: GEMINI_API_KEY (required), FREE_MODEL (default gemini-3.5-flash-lite), FREE_PER_IP_PER_DAY (16),
// FREE_PER_DAY (400), FREE_ALLOWED_ORIGINS (comma list), optional UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// for counters that survive cold starts (without them the caps are per warm instance, which is still fine for a hobby deploy).
import { createHash } from 'node:crypto';

const ALLOWED_ORIGINS = (process.env.FREE_ALLOWED_ORIGINS || 'https://apply-for-me-virid.vercel.app,https://dmask3095.github.io,http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((s) => s.trim()).filter(Boolean);
const MODEL = process.env.FREE_MODEL || 'gemini-3.5-flash-lite';
const PER_IP = Number(process.env.FREE_PER_IP_PER_DAY || 16);
const PER_DAY = Number(process.env.FREE_PER_DAY || 400);
const BASE = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');

const mem = new Map();
const day = () => new Date().toISOString().slice(0, 10);
const hash = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 24);

async function allow(key, limit) {
  const k = `afm:${day()}:${key}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && tok) {
    try {
      const r = await fetch(`${url}/pipeline`, { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: JSON.stringify([['INCR', k], ['EXPIRE', k, 90000]]) });
      const j = await r.json();
      const n = Number((j && j[0] && j[0].result) || 0);
      if (n > 0) return n <= limit;
    } catch { /* fall through to memory */ }
  }
  const n = (mem.get(k) || 0) + 1;
  if (mem.size > 5000) mem.clear();
  mem.set(k, n);
  return n <= limit;
}

export default async function handler(req, res) {
  const origin = String(req.headers.origin || '');
  const originOk = ALLOWED_ORIGINS.includes(origin);
  if (originOk) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'origin');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    res.setHeader('access-control-max-age', '86400');
  }
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const key = process.env.GEMINI_API_KEY;
  if (req.method === 'GET') return res.status(200).json({ ok: true, configured: !!key, model: key ? MODEL : null, perVisitorPerDay: PER_IP });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  if (origin && !originOk) return res.status(403).json({ error: 'This free relay only serves the Apply for me site.' });
  if (!key) return res.status(503).json({ error: 'Free mode is not set up on this deployment yet. Pick a provider in Settings and add your own key.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const system = String((body && body.system) || '');
  const user = String((body && body.user) || '');
  const maxTokens = Math.min(Math.max(Number(body && body.maxTokens) || 4000, 256), 8192);
  if (!user || system.length > 4000 || user.length > 80000) return res.status(400).json({ error: 'Bad request.' });

  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'unknown').split(',')[0].trim();
  if (!(await allow('ip:' + hash(ip), PER_IP))) return res.status(429).json({ error: `Free mode allows ${PER_IP} model calls a day per visitor (about ${Math.max(1, Math.floor(PER_IP / 4))} applications). Add your own key in Settings for unlimited use, or come back tomorrow.` });
  if (!(await allow('all', PER_DAY))) return res.status(429).json({ error: 'The shared free pool is used up for today. Add your own key in Settings, or try again tomorrow.' });

  let r;
  try {
    r = await fetch(`${BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: maxTokens },
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach the model provider. Try again in a moment.' });
  }
  if (!r.ok) {
    let detail = '';
    try { const j = await r.json(); detail = (j && j.error && j.error.message) || ''; } catch { /* ignore */ }
    if (r.status === 429) return res.status(429).json({ error: 'The shared free pool is busy or used up for today (provider rate limit). Try again in a minute, or add your own key in Settings.' });
    return res.status(502).json({ error: `Model error ${r.status}${detail ? ': ' + detail.slice(0, 160) : ''}.` });
  }
  const j = await r.json();
  const parts = (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
  const text = parts.map((p) => p.text || '').join('');
  if (!text) return res.status(502).json({ error: 'The model returned no text. Try again.' });
  return res.status(200).json({ text, model: MODEL });
}
