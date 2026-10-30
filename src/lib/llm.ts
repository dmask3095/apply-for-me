import type { Provider, Settings } from './types';

// Fallbacks only: Settings lists the provider's live models once a key is entered and recommends one.
export const MODEL_DEFAULTS: Record<string, string> = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-5',
  gemini: 'gemini-3.8-flash',
  custom: '',
};

export const PROVIDER_INFO: Record<Provider, { name: string; keyUrl: string; keyLabel: string; cost: string; privacy: string; placeholder: string }> = {
  gemini: {
    name: 'Google Gemini (free tier available)',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyLabel: 'Get a free key at aistudio.google.com/apikey ("Create API key", no card needed)',
    cost: 'Free tier: Flash and Flash-Lite models cost nothing within a daily cap. Paid keys run a few cents per application.',
    privacy: 'On the free tier Google may use prompts (your resume included) to improve its products; paid projects are excluded.',
    placeholder: 'AIza...',
  },
  openai: {
    name: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyLabel: 'Create a key at platform.openai.com/api-keys (needs a few dollars of prepaid credit)',
    cost: 'About 1 to 3 cents per application with a "mini" model.',
    privacy: 'API data is not used for training by default.',
    placeholder: 'sk-...',
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyLabel: 'Create a key at console.anthropic.com/settings/keys (prepaid credit)',
    cost: 'About 3 to 10 cents per application depending on the model.',
    privacy: 'API data is not used for training by default.',
    placeholder: 'sk-ant-...',
  },
  custom: {
    name: 'OpenAI-compatible endpoint (OpenRouter, Groq, Ollama...)',
    keyUrl: 'https://openrouter.ai/keys',
    keyLabel: 'Any endpoint that speaks the OpenAI chat API. OpenRouter: openrouter.ai/keys (base URL https://openrouter.ai/api/v1). Groq: console.groq.com/keys (https://api.groq.com/openai/v1, free tier). Ollama on your machine: base URL http://localhost:11434/v1, key "ollama".',
    cost: 'Depends on the endpoint; local models cost nothing.',
    privacy: 'Depends on the endpoint you choose.',
    placeholder: 'key',
  },
};

function version(id: string): number {
  const m = id.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}
const DATED = /\d{4}-\d{2}-\d{2}|\d{8}/;
function best(ids: string[], prefer: RegExp[], avoid: RegExp): string {
  const clean = ids.filter((i) => !avoid.test(i));
  for (const p of prefer) {
    const hits = clean.filter((i) => p.test(i));
    if (hits.length) return hits.sort((a, b) => version(b) - version(a) || (DATED.test(a) ? 1 : 0) - (DATED.test(b) ? 1 : 0) || a.length - b.length)[0];
  }
  return clean[0] || ids[0] || '';
}

/** The model to recommend from a live list: cheap, current, good at JSON. */
export function pickDefault(provider: Provider, ids: string[]): string {
  if (!ids.length) return MODEL_DEFAULTS[provider] || '';
  if (provider === 'gemini') return best(ids, [/flash(?!-lite)/, /flash-lite/, /gemini/], /preview|exp|thinking|live|tts|audio|image|embedding|8b|robotics|computer/);
  if (provider === 'anthropic') return best(ids, [/sonnet/, /haiku/, /claude/], /opus/);
  return best(ids, [/^gpt-[\d.]+-mini$/, /mini/, /^gpt-[\d.]+$/, /gpt|llama|qwen|mistral|gemma/], /realtime|audio|tts|transcribe|image|embedding|moderation|search|instruct|whisper|dall-e|codex|computer|nano|preview|chat-latest|pro/);
}

/** Ask the provider which chat models this key can use. */
export async function listModels(settings: Settings): Promise<string[]> {
  const key = settings.apiKey.trim();
  if (!key) throw new LlmError(0, 'Enter the key first.');
  const base = settings.baseUrl.trim().replace(/\/$/, '');
  if (settings.provider === 'anthropic') {
    const res = await fetch(`${base || 'https://api.anthropic.com'}/v1/models?limit=100`, { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } });
    if (!res.ok) throw await readError(res);
    const j = await res.json();
    return ((j.data || []) as { id: string }[]).map((m) => m.id).filter((id) => /claude/i.test(id));
  }
  if (settings.provider === 'gemini') {
    const res = await fetch(`${base || 'https://generativelanguage.googleapis.com/v1beta'}/models?pageSize=200&key=${encodeURIComponent(key)}`);
    if (!res.ok) throw await readError(res);
    const j = await res.json();
    return ((j.models || []) as { name: string; supportedGenerationMethods?: string[] }[])
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((id) => /gemini|gemma/i.test(id) && !/embedding|tts|image|live|audio|veo|imagen|aqa/i.test(id));
  }
  const res = await fetch(`${base || 'https://api.openai.com/v1'}/models`, { headers: { authorization: `Bearer ${key}` } });
  if (!res.ok) throw await readError(res);
  const j = await res.json();
  const ids = ((j.data || []) as { id: string }[]).map((m) => m.id);
  if (settings.provider === 'openai') return ids.filter((id) => /^(gpt-|o\d|chatgpt)/.test(id) && !/realtime|audio|tts|transcribe|image|embedding|moderation|search|instruct|whisper|dall-e|computer|codex/.test(id)).sort();
  return ids.sort();
}

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
