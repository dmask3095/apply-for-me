import { useEffect, useState } from 'react';
import { useLocal, KEYS, DEFAULT_SETTINGS, EMPTY_ANSWERS, NO_MASTER } from '../lib/store';
import { GROUPS, getVal, setVal, isEmpty, unanswered, markedUnsure, isSentinel, isUnsure, UNSURE, NA } from '../lib/questions';
import type { Field } from '../lib/questions';
import { chatJSON, needsKey, freeStatus } from '../lib/llm';
import type { FreeStatus } from '../lib/llm';
import { SYSTEM, structurePrompt } from '../lib/prompts';
import { pdfText } from '../lib/ats';
import type { Answers, MasterResume, Settings } from '../lib/types';
import { Section, input, btn, btnGhost, muted } from '../ui';

const pill = (on: boolean) => 'rounded-full border px-3 py-1 text-xs ' + (on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800');

function Control({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState<string>(typeof value === 'string' && !isSentinel(value) ? value : '');
  const skipChips = f.noSkip ? null : (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      <button type="button" className={pill(isUnsure(value))} onClick={() => onChange(UNSURE)}>{UNSURE}</button>
      {f.na ? <button type="button" className={pill(value === NA)} onClick={() => onChange(NA)}>{NA}</button> : null}
    </div>
  );
  if (isSentinel(value)) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-zinc-700 dark:text-zinc-300">Marked <span className="font-medium">{String(value)}</span>{isUnsure(value) ? '. The kit will flag it when a form needs it.' : '. The kit leaves that box blank.'}</span>
          <button type="button" className="text-xs text-emerald-700 hover:underline dark:text-emerald-400" onClick={() => onChange(undefined)}>Change</button>
        </div>
        {isUnsure(value) && f.howTo ? <p className={'mt-1 text-xs ' + muted}><span className="font-medium">How to find it:</span> {f.howTo}</p> : null}
      </div>
    );
  }
  if (f.type === 'select') return (
    <div>
      <select className={input} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">Choose...</option>{f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {skipChips}
    </div>
  );
  if (f.type === 'toggle') return (
    <div className="flex flex-wrap gap-2">
      {[['Yes', true], ['No', false]].map(([l, v]) => <button type="button" key={String(l)} onClick={() => onChange(v)} className={'rounded-full border px-4 py-1.5 text-sm ' + (value === v ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 dark:border-zinc-700')}>{String(l)}</button>)}
      {!f.noSkip ? <button type="button" onClick={() => onChange(UNSURE)} className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm dark:border-zinc-700">{UNSURE}</button> : null}
    </div>
  );
  if (f.type === 'multi') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        <div className="flex flex-wrap gap-2">{f.options!.map((o) => { const on = arr.includes(o); return <button type="button" key={o} onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])} className={'rounded-full border px-3 py-1.5 text-sm ' + (on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 dark:border-zinc-700')}>{o}</button>; })}</div>
        {skipChips}
      </div>
    );
  }
  const commit = () => { const cur = typeof value === 'string' ? value : ''; if (draft !== cur) onChange(draft || undefined); };
  if (f.type === 'textarea') return <div><textarea rows={3} className={input} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />{skipChips}</div>;
  return (
    <div>
      <input type={f.type === 'date' ? 'date' : f.type === 'month' ? 'month' : 'text'} className={input} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      {skipChips}
    </div>
  );
}

export function Profile() {
  const [master, setMaster] = useLocal<MasterResume | null>(KEYS.master, NO_MASTER);
  const [answers, setAnswers] = useLocal<Answers>(KEYS.answers, EMPTY_ANSWERS);
  const [settings] = useLocal<Settings>(KEYS.settings, DEFAULT_SETTINGS);
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState('');
  const [more, setMore] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [free, setFree] = useState<FreeStatus | null>(null);
  const keyMissing = needsKey(settings);
  useEffect(() => { let alive = true; if (settings.provider === 'free') freeStatus().then((f) => { if (alive) setFree(f); }).catch(() => {}); return () => { alive = false; }; }, [settings.provider]);
  const freeOff = settings.provider === 'free' && free !== null && !free.configured;

  const open = unanswered(answers);
  const unsure = markedUnsure(answers);
  const set = (f: Field, v: unknown) => setAnswers((prev) => setVal(prev, f.k, v));

  async function onFile(file: File) {
    setErr('');
    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) { const { text } = await pdfText(await file.arrayBuffer()); setRaw(text); }
      else setRaw(await file.text());
    } catch (e) { setErr('Could not read that file: ' + (e as Error).message); }
  }
  async function structure() {
    setErr(''); setBusy('Reading your resume...');
    try {
      const m = (await chatJSON(settings, SYSTEM, structurePrompt(raw), 6000)) as MasterResume;
      if (!m || !m.name || !Array.isArray(m.experience)) throw new Error('The model returned an unexpected shape. Try again.');
      m.projects = m.projects || []; m.awards = m.awards || []; m.skills = m.skills || []; m.education = m.education || []; m.contact = m.contact || {};
      const tidy = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s|-)\S/g, (c) => c.toUpperCase()) : s);
      m.name = tidy(m.name.trim());
      setMaster(m);
      setAnswers((prev) => {
        let next = { ...prev };
        const parts = m.name.trim().split(/\s+/);
        if (isEmpty(getVal(next, 'legalFirstName')) && parts.length) next = setVal(next, 'legalFirstName', parts[0]);
        if (isEmpty(getVal(next, 'legalLastName')) && parts.length > 1) next = setVal(next, 'legalLastName', parts[parts.length - 1]);
        if (isEmpty(getVal(next, 'legalMiddleName')) && parts.length > 2) next = setVal(next, 'legalMiddleName', parts.slice(1, -1).join(' '));
        if (isEmpty(getVal(next, 'email')) && m.contact.email) next = setVal(next, 'email', m.contact.email);
        if (isEmpty(getVal(next, 'phone')) && m.contact.phone) next = setVal(next, 'phone', m.contact.phone);
        if (isEmpty(getVal(next, 'linkedin')) && m.contact.linkedin) next = setVal(next, 'linkedin', m.contact.linkedin.startsWith('http') ? m.contact.linkedin : 'https://' + m.contact.linkedin);
        if (isEmpty(getVal(next, 'github')) && m.contact.github) next = setVal(next, 'github', m.contact.github.startsWith('http') ? m.contact.github : 'https://' + m.contact.github);
        if (isEmpty(getVal(next, 'educationDetails/gradSchool')) && m.education[0]) { next = setVal(next, 'educationDetails/gradSchool', m.education[0].school); next = setVal(next, 'educationDetails/gradDegree', m.education[0].degree); }
        if (isEmpty(getVal(next, 'educationDetails/ugSchool')) && m.education[1]) { next = setVal(next, 'educationDetails/ugSchool', m.education[1].school); next = setVal(next, 'educationDetails/ugDegree', m.education[1].degree); }
        return next;
      });
      setReplacing(false);
      window.location.hash = '#/profile?saved=1';
    } catch (e) { setErr((e as Error).message); } finally { setBusy(''); }
  }
  function saveJson() {
    try { const m = JSON.parse(jsonDraft) as MasterResume; if (!m.name) throw new Error('name is required'); setMaster(m); setShowJson(false); setErr(''); } catch (e) { setErr('Invalid JSON: ' + (e as Error).message); }
  }

  const renderGroup = (gid: string, common: boolean) => {
    const g = GROUPS.find((x) => x.id === gid)!;
    const fields = g.fields.filter((f) => (common ? f.req : !f.req));
    if (!fields.length) return null;
    return (
      <div key={gid + (common ? 'c' : 'o')} className="mb-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{g.title}</h3>
        <p className={'text-xs ' + muted}>{g.blurb}</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const v = getVal(answers, f.k);
            return (
              <div key={f.k} className={f.type === 'textarea' || f.type === 'multi' || (f.howTo && f.howTo.length > 160) ? 'sm:col-span-2' : ''}>
                <label className="text-sm text-zinc-800 dark:text-zinc-200">{f.label}{isEmpty(v) && f.req ? <span className={'ml-2 text-xs ' + muted}>open</span> : null}</label>
                {f.help ? <p className={'text-xs ' + muted}>{f.help}</p> : null}
                {f.howTo && !isSentinel(v) ? <p className={'text-xs ' + muted}><span className="font-medium">How to find it:</span> {f.howTo}</p> : null}
                <div className="mt-1"><Control key={f.k + String(v ?? '')} f={f} value={v} onChange={(val) => set(f, val)} /></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const showResumeInput = !master || replacing;
  return (
    <div>
      {keyMissing || freeOff ? (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100">
          <p className="font-medium">{freeOff ? 'Free mode is not set up on this deployment yet' : 'One-time set-up: add a model key'}</p>
          <p className="mt-1">{freeOff ? 'The site owner has not added the shared key yet. ' : 'You picked a provider that needs your own key. '}Reading your resume and writing for you run on a language model. <a className="font-medium underline" href="#/settings">Open Settings</a>{freeOff ? ' to add your own key (Google Gemini has a free tier, no card).' : ' to add it, or switch to Free.'} You can fill in the answers below meanwhile.</p>
        </div>
      ) : null}

      <Section title="1 · Your resume" hint={master && !replacing ? `Loaded: ${master.name}, ${master.experience.length} roles, ${master.projects.length} projects. Every tailored resume is built only from this.` : 'Paste the text of your current resume or drop the PDF. It is read once into a structured copy that lives only in this browser.'}>
        {showResumeInput || showJson ? (
          showJson ? (
            <div>
              <textarea rows={16} className={input + ' font-mono text-xs'} value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} />
              <div className="mt-2 flex gap-2"><button className={btn} onClick={saveJson}>Save</button><button className={btnGhost} onClick={() => setShowJson(false)}>Cancel</button></div>
            </div>
          ) : (
            <div>
              <textarea rows={10} className={input} placeholder="Paste your resume text here..." value={raw} onChange={(e) => setRaw(e.target.value)} />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className={btnGhost + ' cursor-pointer'}>Upload PDF / TXT<input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={(e) => e.target.files && e.target.files[0] && onFile(e.target.files[0])} /></label>
                <button className={btn} disabled={!raw.trim() || !!busy || keyMissing} onClick={structure}>{busy || 'Read my resume'}</button>
                {keyMissing ? <a href="#/settings" className="text-sm text-amber-600 hover:underline">Needs a model key (why?)</a> : null}
                {replacing ? <button className={btnGhost} onClick={() => setReplacing(false)}>Keep the current one</button> : null}
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => { setJsonDraft(JSON.stringify(master, null, 2)); setShowJson(true); }}>Edit as JSON</button>
            <button className={btnGhost} onClick={() => setReplacing(true)}>Replace</button>
          </div>
        )}
        {err ? <p className="mt-2 text-sm text-rose-600">{err}</p> : null}
      </Section>

      <Section title={'2 · The questions every form asks' + (open.length ? ` (${open.length} open)` : ' (done)')} hint="Nothing here is mandatory. Answer what you know; mark the rest Not sure yet or Not applicable. When a form actually needs one of those, your kit flags it and tells you how to find the real answer. Answers are used verbatim by the answer sheet and the autofill bookmarklet.">
        {GROUPS.map((g) => renderGroup(g.id, true))}
        <button className={btnGhost} onClick={() => setMore(!more)}>{more ? 'Hide optional answers' : 'More answers (optional: address, hackathons, EEO details, defaults)'}</button>
        {more ? <div className="mt-4">{GROUPS.map((g) => renderGroup(g.id, false))}</div> : null}
        {unsure.length ? <p className={'mt-4 text-xs ' + muted}>{unsure.length} marked Not sure yet: {unsure.map((f) => f.label.replace(/^"|"$/g, '')).slice(0, 6).join('; ')}{unsure.length > 6 ? '...' : ''}. Each kit will say how to find them if a form asks.</p> : null}
      </Section>
      {master ? <a href="#/" className={btn}>Go paste a job</a> : null}
    </div>
  );
}
