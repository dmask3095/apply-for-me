import { useState } from 'react';
import { useLocal, KEYS, DEFAULT_SETTINGS, exportAll, importAll } from '../lib/store';
import { MODEL_DEFAULTS, chatJSON } from '../lib/llm';
import type { Provider, Settings as S } from '../lib/types';
import { Section, input, btn, btnGhost, muted } from '../ui';

export function Settings() {
  const [s, setS] = useLocal<S>(KEYS.settings, DEFAULT_SETTINGS);
  const [msg, setMsg] = useState('');
  const upd = (p: Partial<S>) => setS({ ...s, ...p });
  async function test() {
    setMsg('Testing...');
    try { const r = (await chatJSON(s, 'Reply with JSON only.', 'Return {"ok": true}', 50)) as { ok?: boolean }; setMsg(r && r.ok ? 'Connected.' : 'Got a reply, but not the expected JSON.'); } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <div>
      <Section title="Model" hint="Your key is stored only in this browser and sent only to the provider you choose. Nothing else leaves your machine.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="text-sm">Provider</label><select className={input} value={s.provider} onChange={(e) => upd({ provider: e.target.value as Provider, model: '' })}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="gemini">Google Gemini</option><option value="custom">OpenAI-compatible (OpenRouter, Groq, Ollama...)</option></select></div>
          <div><label className="text-sm">API key</label><input type="password" className={input} value={s.apiKey} onChange={(e) => upd({ apiKey: e.target.value })} placeholder="sk-..." /></div>
          <div><label className="text-sm">Model</label><input className={input} value={s.model} onChange={(e) => upd({ model: e.target.value })} placeholder={MODEL_DEFAULTS[s.provider]} /></div>
          {s.provider === 'custom' || s.baseUrl ? <div><label className="text-sm">Base URL</label><input className={input} value={s.baseUrl} onChange={(e) => upd({ baseUrl: e.target.value })} placeholder="https://openrouter.ai/api/v1" /></div> : null}
        </div>
        <div className="mt-3 flex items-center gap-3"><button className={btnGhost} onClick={test}>Test connection</button><span className={'text-sm ' + muted}>{msg}</span></div>
      </Section>
      <Section title="Your data" hint="Resume, answers and kits live in this browser's storage. Export to move them to another device.">
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportAll()], { type: 'application/json' })); a.download = 'apply-for-me-export.json'; a.click(); }}>Export JSON</button>
          <label className={btnGhost + ' cursor-pointer'}>Import JSON<input type="file" accept=".json" className="hidden" onChange={async (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; try { importAll(await f.text()); setMsg('Imported.'); } catch (err) { setMsg('Import failed: ' + (err as Error).message); } }} /></label>
          <button className={btn + ' !bg-rose-600 hover:!bg-rose-700'} onClick={() => { if (confirm('Delete everything stored by this app in this browser?')) { Object.values(KEYS).forEach((k) => localStorage.removeItem(k)); location.reload(); } }}>Wipe all data</button>
        </div>
      </Section>
    </div>
  );
}
