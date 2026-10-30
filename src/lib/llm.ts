import type { Settings } from './types';

export const MODEL_DEFAULTS: Record<string, string> = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-5',
  gemini: 'gemini-2.5-flash',
  custom: 'gpt-4.1-mini',
};

export class LlmError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function stripFences(s: string) {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : s).trim();
}

export function parseJson(text: string): unknown {
  const t = stripFences(text);
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    const c = t.indexOf('[');
    const d = t.lastIndexOf(']');
    if (c >= 0 && d > c) return JSON.parse(t.slice(c, d + 1));
    throw new Error('The model did not return JSON.');
  }
}

async function readError(res: Response) {
  let msg = res.statusText;
  try {
    const j = await res.json();
    msg = j?.error?.message || j?.message || JSON.stringify(j).slice(0, 300);
  } catch {
    /* ignore */
  }
  if (res.status === 401) msg = 'The API key was rejected (401). Check it in Settings.';
  if (res.status === 402) msg = 'Your provider says you are out of credit (402).';
  if (res.status === 429) msg = 'Rate limited by your provider (429). Wait a moment and retry.';
  return new LlmError(res.status, msg);
}

export async function chatJSON(settings: Settings, system: string, user: string, maxTokens = 4000): Promise<unknown> {
  const key = settings.apiKey.trim();
  if (!key) throw new LlmError(0, 'Add your API key in Settings first.');
  const model = settings.model.trim() || MODEL_DEFAULTS[settings.provider];
  const base = settings.baseUrl.trim().replace(/\/$/, '');

  if (settings.provider === 'anthropic') {
    const res = await fetch(`${base || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user + '\n\nRespond with a single JSON value and nothing else.' }] }),
    });
    if (!res.ok) throw await readError(res);
    const j = await res.json();
    return parseJson(j.content?.map((c: { text?: string }) => c.text || '').join('') || '');
  }

  if (settings.provider === 'gemini') {
    const res = await fetch(`${base || 'https://generativelanguage.googleapis.com/v1beta'}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: maxTokens },
      }),
    });
    if (!res.ok) throw await readError(res);
    const j = await res.json();
    return parseJson(j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '');
  }

  // OpenAI and any OpenAI-compatible endpoint (OpenRouter, Groq, Ollama, vLLM, Azure gateways...)
  const url = `${base || 'https://api.openai.com/v1'}/chat/completions`;
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user + '\n\nRespond with JSON only.' },
  ];
  let body: Record<string, unknown> = { model, messages, response_format: { type: 'json_object' }, temperature: 0.2 };
  body[settings.provider === 'openai' ? 'max_completion_tokens' : 'max_tokens'] = maxTokens;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
    if (res.ok) {
      const j = await res.json();
      return parseJson(j.choices?.[0]?.message?.content || '');
    }
    const err = await readError(res);
    // Newer OpenAI models reject some classic parameters; drop the one named and retry once.
    const m = err.message.toLowerCase();
    if (res.status === 400 && m.includes('max_tokens') && 'max_tokens' in body) { const { max_tokens, ...rest } = body as { max_tokens: number }; body = { ...rest, max_completion_tokens: max_tokens }; continue; }
    if (res.status === 400 && m.includes('temperature') && 'temperature' in body) { const { temperature, ...rest } = body as { temperature: number }; void temperature; body = rest; continue; }
    if (res.status === 400 && m.includes('response_format') && 'response_format' in body) { const { response_format, ...rest } = body as { response_format: unknown }; void response_format; body = rest; continue; }
    throw err;
  }
  throw new LlmError(400, 'The model rejected the request.');
}

// Public reader that returns page text with CORS enabled. The URL is the only thing it sees.
export async function fetchPostingText(url: string): Promise<string> {
  const res = await fetch('https://r.jina.ai/' + url, { headers: { accept: 'text/plain' } });
  if (!res.ok) throw new Error(`Could not read that page (${res.status}). Paste the posting text instead.`);
  const t = await res.text();
  if (t.length < 200) throw new Error('That page returned almost no text. Paste the posting instead.');
  return t;
}
