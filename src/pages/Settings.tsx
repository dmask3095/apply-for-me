import { useEffect, useState } from 'react';
import { useLocal, KEYS, DEFAULT_SETTINGS, exportAll, importAll } from '../lib/store';
import { MODEL_DEFAULTS, PROVIDER_INFO, chatJSON, listModels, pickDefault, freeStatus } from '../lib/llm';
import type { FreeStatus } from '../lib/llm';
import type { Provider, Settings as S } from '../lib/types';
import { Section, input, btn, btnGhost, muted } from '../ui';

const ORDER: Provider[] = ['free', 'gemini', 'openai', 'anthropic', 'custom'];

export function Settings() {
  const [s, setS] = useLocal<S>(KEYS.settings, DEFAULT_SETTINGS);
  const [msg, setMsg] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [wipe, setWipe] = useState(false);
  const [free, setFree] = useState<FreeStatus | null | 'error'>(null);
  const info = PROVIDER_INFO[s.provider];
  const upd = (p: Partial<S>) => setS({ ...s, ...p });
  const isFree = s.provider === 'free';
  useEffect(() => { let alive = true; freeStatus().then((f) => { if (alive) setFree(f); }).catch(() => { if (alive) setFree('error'); }); return () => { alive = false; }; }, []);

  async function check() {
    setChecking(true); setMsg(''); setModels([]);
    try {
      const ids = await listModels(s);
      if (!ids.length) throw new Error('The key works but no chat models were listed. Type a model name below.');
      setModels(ids);
      const rec = s.model && ids.includes(s.model) ? s.model : pickDefault(s.provider, ids);
      upd({ model: rec });
      setMsg(`Key works. ${ids.length} models available; "${rec}" is selected (a good, cheap default). Change it if you like, then Test.`);
    } catch (e) { setMsg((e as Error).message); } finally { setChecking(false); }
  }
  async function test() {
    setMsg('Testing a real request...');
    try {
      const r = (await chatJSON(s, 'Reply with JSON only.', 'Return {"ok": true} as JSON.', 50)) as { ok?: boolean };
      setMsg(r && r.ok ? (isFree ? 'Connected. Free mode answers correctly; you are set.' : `Connected. ${s.model || MODEL_DEFAULTS[s.provider]} answers correctly; you are set.`) : 'Got a reply, but not the expected JSON. Try another model.');
    } catch (e) { setMsg((e as Error).message); }
  }
  const modelField = models.length ? (
    <select className={input} value={models.includes(s.model) ? s.model : ''} onChange={(e) => upd({ model: e.target.value })}>
      {!models.includes(s.model) ? <option value="">Choose a model...</option> : null}
      {models.map((m) => <option key={m} value={m}>{m}{m === pickDefault(s.provider, models) ? '  (recommended)' : ''}</option>)}
    </select>
  ) : (
    <input className={input} value={s.model} onChange={(e) => upd({ model: e.target.value })} placeholder={MODEL_DEFAULTS[s.provider] || 'model id'} />
  );

  return (
    <div>
      <Section title="How the AI part is paid for" hint="Reading your resume, checking fit and writing the letter are done by a language model. Someone pays the model provider per call.">
        <div className="space-y-2 text-sm text-zinc-800 dark:text-zinc-200">
          <p><span className="font-medium">Free</span> (default): a small relay run by this site holds one shared key on Google's free Gemini tier. No key, no sign-up, no cost; a daily cap per visitor and a shared daily pool, so it can run dry on busy days. Your resume passes through the relay (which stores nothing) to Google, and Google may use free-tier data to improve its products.</p>
          <p><span className="font-medium">Your own key</span>: the browser talks to the provider directly, nothing passes through this site, no cap. Google Gemini also has a free tier for your own key; OpenAI and Anthropic cost a few cents per application.</p>
          <p className={muted}>Everything that is not AI (the PDF, the ATS check, the answer sheet, the autofill bookmarklet, the tracker) works either way.</p>
        </div>
      </Section>

      <Section title="Your model" hint={isFree ? 'Free mode uses the shared relay; nothing of yours is stored anywhere but this browser.' : 'The key is stored only in this browser and sent only to the provider you choose.'}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={isFree ? 'sm:col-span-2' : ''}>
            <label className="text-sm">Provider</label>
            <select className={input} value={s.provider} onChange={(e) => { upd({ provider: e.target.value as Provider, model: '', baseUrl: e.target.value === 'custom' ? s.baseUrl : '' }); setModels([]); setMsg(''); }}>
              {ORDER.map((p) => <option key={p} value={p}>{PROVIDER_INFO[p].name}</option>)}
            </select>
            <p className={'mt-1 text-xs ' + muted}>{info.cost} {info.privacy}</p>
            {isFree ? (
              <p className={'mt-1 text-xs ' + (free && free !== 'error' && free.configured ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
                {free === null ? 'Checking the free relay...' : free === 'error' ? 'The free relay is not reachable right now; pick a provider and add your own key, or try again later.' : free.configured ? `Free mode is on: ${free.model}, up to ${free.perVisitorPerDay} model calls a day per visitor (about ${Math.max(1, Math.floor(free.perVisitorPerDay / 4))} applications).` : 'Free mode is not set up on this deployment yet. Pick a provider and add your own key.'}
              </p>
            ) : null}
          </div>
          {isFree ? null : <div>
            <label className="text-sm">API key</label>
            <input type="password" autoComplete="off" className={input} value={s.apiKey} onChange={(e) => { upd({ apiKey: e.target.value }); setModels([]); }} placeholder={info.placeholder} />
            <p className={'mt-1 text-xs ' + muted}><a className="text-emerald-700 hover:underline dark:text-emerald-400" href={info.keyUrl} target="_blank" rel="noreferrer">{info.keyLabel}</a></p>
          </div>}
          {s.provider === 'custom' ? <div><label className="text-sm">Base URL</label><input className={input} value={s.baseUrl} onChange={(e) => upd({ baseUrl: e.target.value })} placeholder="https://openrouter.ai/api/v1" /></div> : null}
          {isFree ? null : <div>
            <label className="text-sm">Model</label>
            {modelField}
            <p className={'mt-1 text-xs ' + muted}>{models.length ? 'Listed live from your provider.' : 'Press "Check key" to list the models your key can use and pick a good default.'}</p>
          </div>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {isFree ? null : <button className={btn} onClick={check} disabled={checking || !s.apiKey.trim()}>{checking ? 'Checking...' : 'Check key & list models'}</button>}
          <button className={isFree ? btn : btnGhost} onClick={test} disabled={!isFree && !s.apiKey.trim()}>Test a request</button>
        </div>
        {msg ? <p className={'mt-2 text-sm ' + (/works|Connected/.test(msg) ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>{msg}</p> : null}
      </Section>

      <Section title="Your data" hint="Resume, answers and kits live in this browser's storage. Export to move them to another device.">
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnGhost} onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportAll()], { type: 'application/json' })); a.download = 'apply-for-me-export.json'; a.click(); }}>Export JSON</button>
          <label className={btnGhost + ' cursor-pointer'}>Import JSON<input type="file" accept=".json" className="hidden" onChange={async (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; try { importAll(await f.text()); setMsg('Imported.'); } catch (err) { setMsg('Import failed: ' + (err as Error).message); } }} /></label>
          {!wipe ? <button className={btnGhost + ' !text-rose-600'} onClick={() => setWipe(true)}>Wipe all data</button> : (
            <span className="flex items-center gap-2 text-sm"><span>Delete everything this app stored in this browser?</span>
              <button className={btn + ' !bg-rose-600 hover:!bg-rose-700 !px-3 !py-1.5'} onClick={() => { Object.values(KEYS).forEach((k) => localStorage.removeItem(k)); location.hash = '#/'; location.reload(); }}>Yes, wipe</button>
              <button className={btnGhost + ' !px-3 !py-1.5'} onClick={() => setWipe(false)}>No</button></span>
          )}
        </div>
      </Section>
    </div>
  );
}
