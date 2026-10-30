import { useState } from 'react';
import { useLocal, KEYS, DEFAULT_SETTINGS, EMPTY_ANSWERS, NO_MASTER } from '../lib/store';
import { GROUPS, getVal, setVal, isEmpty, REQUIRED } from '../lib/questions';
import type { Field } from '../lib/questions';
import { chatJSON } from '../lib/llm';
import { SYSTEM, structurePrompt } from '../lib/prompts';
import { pdfText } from '../lib/ats';
import type { Answers, MasterResume, Settings } from '../lib/types';
import { Section, input, btn, btnGhost, muted } from '../ui';

function Control({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState<string>(typeof value === 'string' ? value : '');
  if (f.type === 'select') return (
    <select className={input} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose...</option>{f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  if (f.type === 'toggle') return (
    <div className="flex gap-2">{[['Yes', true], ['No', false]].map(([l, v]) => <button key={String(l)} onClick={() => onChange(v)} className={'rounded-full border px-4 py-1.5 text-sm ' + (value === v ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 dark:border-zinc-700')}>{String(l)}</button>)}</div>
  );
  if (f.type === 'multi') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return <div className="flex flex-wrap gap-2">{f.options!.map((o) => { const on = arr.includes(o); return <button key={o} onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])} className={'rounded-full border px-3 py-1.5 text-sm ' + (on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 dark:border-zinc-700')}>{o}</button>; })}</div>;
  }
  const commit = () => { if (draft !== (typeof value === 'string' ? value : '')) onChange(draft); };
  if (f.type === 'textarea') return <textarea rows={3} className={input} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />;
  return <input type={f.type === 'date' ? 'date' : f.type === 'month' ? 'month' : 'text'} className={input} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />;
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

  const essentials = REQUIRED.filter((f) => isEmpty(getVal(answers, f.k)));
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
      window.location.hash = '#/profile?saved=1';
    } catch (e) { setErr((e as Error).message); } finally { setBusy(''); }
  }
  function saveJson() {
    try { const m = JSON.parse(jsonDraft) as MasterResume; if (!m.name) throw new Error('name is required'); setMaster(m); setShowJson(false); setErr(''); } catch (e) { setErr('Invalid JSON: ' + (e as Error).message); }
  }

  const renderGroup = (gid: string, onlyRequired: boolean) => {
    const g = GROUPS.find((x) => x.id === gid)!;
    const fields = g.fields.filter((f) => (onlyRequired ? f.req : !f.req));
    if (!fields.length) return null;
    return (
      <div key={gid + (onlyRequired ? 'r' : 'o')} className="mb-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{g.title}</h3>
        <p className={'text-xs ' + muted}>{g.blurb}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.k} className={f.type === 'textarea' || f.type === 'multi' ? 'sm:col-span-2' : ''}>
              <label className="text-sm text-zinc-800 dark:text-zinc-200">{f.label}{f.req && isEmpty(getVal(answers, f.k)) ? <span className="ml-1 text-amber-600">*</span> : null}</label>
              {f.help ? <p className={'text-xs ' + muted}>{f.help}</p> : null}
              <div className="mt-1"><Control key={f.k + String(getVal(answers, f.k) ?? '')} f={f} value={getVal(answers, f.k)} onChange={(v) => set(f, v)} /></div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Section title="1 · Your resume" hint={master ? `Loaded: ${master.name}, ${master.experience.length} roles, ${master.projects.length} projects. Every tailored resume is built only from this.` : 'Paste the text of your current resume or drop the PDF. It is read once into a structured copy that lives only in this browser.'}>
        {!master || showJson ? (
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
                <button className={btn} disabled={!raw.trim() || !!busy} onClick={structure}>{busy || 'Read my resume'}</button>
                {!settings.apiKey ? <a href="#/settings" className="text-sm text-amber-600 hover:underline">Add an API key first</a> : null}
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => { setJsonDraft(JSON.stringify(master, null, 2)); setShowJson(true); }}>Edit as JSON</button>
            <button className={btnGhost} onClick={() => { if (confirm('Replace your stored resume?')) setMaster(null); }}>Replace</button>
          </div>
        )}
        {err ? <p className="mt-2 text-sm text-rose-600">{err}</p> : null}
      </Section>

      <Section title={`2 · The questions every form asks` + (essentials.length ? ` (${essentials.length} left)` : ' (done)')} hint="Answer once. Each kit's answer sheet and the autofill bookmarklet use these verbatim.">
        {GROUPS.map((g) => renderGroup(g.id, true))}
        <button className={btnGhost} onClick={() => setMore(!more)}>{more ? 'Hide optional answers' : 'More answers (optional: hackathons, EEO details, defaults)'}</button>
        {more ? <div className="mt-4">{GROUPS.map((g) => renderGroup(g.id, false))}</div> : null}
      </Section>
      {master && !essentials.length ? <a href="#/" className={btn}>Go paste a job</a> : null}
    </div>
  );
}
