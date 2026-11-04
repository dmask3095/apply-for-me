import { useEffect, useState } from 'react';
import { useLocal, read, KEYS, DEFAULT_SETTINGS, EMPTY_ANSWERS, NO_MASTER, NO_AUTOFILL } from '../lib/store';
import { GROUPS, getVal, setVal, isEmpty, unanswered, markedUnsure, isSentinel, isUnsure, UNSURE, NA } from '../lib/questions';
import type { Field } from '../lib/questions';
import { chatJSON, needsKey, freeStatus } from '../lib/llm';
import type { FreeStatus } from '../lib/llm';
import { SYSTEM, structurePrompt } from '../lib/prompts';
import { pdfText } from '../lib/ats';
import { proposeFromResume, applyProposals, undoAutofill } from '../lib/resumeFill';
import type { FormAnswers, Proposal } from '../lib/resumeFill';
import type { Answers, AutofillRecord, MasterResume, Settings } from '../lib/types';
import { Section, Switch, input, btn, btnGhost, muted } from '../ui';

const pill = (on: boolean) => 'rounded-full border px-3 py-1 text-xs ' + (on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800');
const AUTOFILL_HINT = 'Name, contact, links, education, languages and certifications it states go into the answers below. You tick each value before it is saved; nothing is guessed.';

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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function pretty(p: Proposal) {
  const m = p.display.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return p.display;
  const mon = MONTH_NAMES[+m[2] - 1] || m[2];
  return m[3] ? `${mon} ${+m[3]}, ${m[1]}` : `${mon} ${m[1]}`;
}

// What the resume states, as a checklist. Nothing is saved until "Save N answers".
function ReviewSheet({ proposals, selected, onToggle, onSelectAll, onSave, onSkip }: { proposals: Proposal[]; selected: Set<string>; onToggle: (k: string) => void; onSelectAll: (all: boolean) => void; onSave: () => void; onSkip: () => void }) {
  const byGroup = GROUPS.map((g) => ({ g, rows: proposals.filter((p) => p.group === g.id) })).filter((x) => x.rows.length);
  const n = selected.size;
  const replacing = proposals.filter((p) => p.replaces).length;
  return (
    <Section id="review" title={`Found in your resume · ${proposals.length} answer${proposals.length === 1 ? '' : 's'}`} hint={'Only what the resume states, nothing guessed. Tick what to save into your answers; every one stays editable below.' + (replacing ? ` ${replacing} would replace an answer you already gave, so ${replacing === 1 ? 'it is' : 'they are'} unticked.` : '')}>
      <div className="space-y-4">
        {byGroup.map(({ g, rows }) => (
          <div key={g.id}>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{g.title}</div>
            <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
              {rows.map((p) => (
                <li key={p.k} className="border-b border-zinc-100 dark:border-zinc-800">
                  <label className="flex cursor-pointer items-start gap-3 py-2">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-600" checked={selected.has(p.k)} onChange={() => onToggle(p.k)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">{p.label}</span>
                      <span className="block break-words text-sm text-zinc-900 dark:text-zinc-100">{pretty(p)}</span>
                      {p.replaces ? <span className="block text-xs text-amber-700 dark:text-amber-400">Replaces your current answer: {p.current}</span> : null}
                      {p.note ? <span className={'block text-xs ' + muted}>{p.note}</span> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className={btn} disabled={!n} onClick={onSave}>Save {n} answer{n === 1 ? '' : 's'}</button>
        <button className={btnGhost} onClick={onSkip}>Skip</button>
        <button className={'text-xs hover:underline ' + muted} onClick={() => onSelectAll(n < proposals.length)}>{n < proposals.length ? 'Select all' : 'Select none'}</button>
      </div>
    </Section>
  );
}

export function Profile() {
  const [master, setMaster] = useLocal<MasterResume | null>(KEYS.master, NO_MASTER);
  const [answers, setAnswers] = useLocal<Answers>(KEYS.answers, EMPTY_ANSWERS);
  const [settings] = useLocal<Settings>(KEYS.settings, DEFAULT_SETTINGS);
  const [autofillRec, setAutofillRec] = useLocal<AutofillRecord | null>(KEYS.autofill, NO_AUTOFILL);
  const [raw, setRaw] = useState('');
  const [file, setFile] = useState<{ name: string; pages: number; words: number } | null>(null);
  const [autoFill, setAutoFill] = useState(true);
  const [review, setReview] = useState<Proposal[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fillMsg, setFillMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState('');
  const [more, setMore] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [free, setFree] = useState<FreeStatus | null>(null);
  const keyMissing = needsKey(settings);
  useEffect(() => { let alive = true; if (settings.provider === 'free') freeStatus().then((f) => { if (alive) setFree(f); }).catch(() => {}); return () => { alive = false; }; }, [settings.provider]);
  const freeOff = settings.provider === 'free' && free !== null && !free.configured;

  const open = unanswered(answers);
  const unsure = markedUnsure(answers);
  const set = (f: Field, v: unknown) => setAnswers((prev) => setVal(prev, f.k, v));
  const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

  async function onFile(f: File) {
    setErr(''); setFillMsg('');
    try {
      let text = '';
      let pages = 1;
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) { const r = await pdfText(await f.arrayBuffer()); text = r.text; pages = r.pages; }
      else text = await f.text();
      if (words(text) < 20) throw new Error('almost no text came out of it (a scanned image needs OCR first). Paste the text instead.');
      setRaw(text);
      setFile({ name: f.name, pages, words: words(text) });
    } catch (e) { setFile(null); setErr('Could not read that file: ' + (e as Error).message); }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) onFile(f);
  }
  async function structure() {
    setErr(''); setFillMsg(''); setBusy(autoFill ? 'Reading your resume and lifting your answers...' : 'Reading your resume...');
    try {
      const res = (await chatJSON(settings, SYSTEM, structurePrompt(raw, autoFill), autoFill ? 7000 : 6000)) as (MasterResume & { formAnswers?: FormAnswers }) | null;
      if (!res || !res.name || !Array.isArray(res.experience)) throw new Error('The model returned an unexpected shape. Try again.');
      const { formAnswers, ...m } = res;
      m.projects = m.projects || []; m.awards = m.awards || []; m.skills = m.skills || []; m.education = m.education || []; m.contact = m.contact || {};
      const tidy = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s|-)\S/g, (c) => c.toUpperCase()) : s);
      m.name = tidy(m.name.trim());
      setMaster(m);
      setReplacing(false);
      if (autoFill) {
        const props = proposeFromResume(m, formAnswers, read<Answers>(KEYS.answers, EMPTY_ANSWERS));
        if (props.length) {
          setReview(props);
          setSelected(new Set(props.filter((p) => p.checked).map((p) => p.k)));
          setTimeout(() => document.getElementById('review')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        } else setFillMsg('Your answers already hold everything this resume states; nothing new to fill.');
      }
      window.location.hash = '#/profile?saved=1';
    } catch (e) { setErr((e as Error).message); } finally { setBusy(''); }
  }
  function saveReview() {
    if (!review) return;
    const { next, record } = applyProposals(read<Answers>(KEYS.answers, EMPTY_ANSWERS), review, selected, file ? file.name : 'pasted text');
    setAnswers(next);
    setAutofillRec(record);
    setReview(null);
    setFillMsg('');
    setTimeout(() => document.getElementById('answers')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
  function undo() {
    if (!autofillRec) return;
    setAnswers((prev) => undoAutofill(prev, autofillRec));
    setAutofillRec(null);
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
            const fromResume = !!autofillRec && autofillRec.keys.includes(f.k) && !isEmpty(v);
            return (
              <div key={f.k} className={f.type === 'textarea' || f.type === 'multi' || (f.howTo && f.howTo.length > 160) ? 'sm:col-span-2' : ''}>
                <label className="text-sm text-zinc-800 dark:text-zinc-200">{f.label}{isEmpty(v) && f.req ? <span className={'ml-2 text-xs ' + muted}>open</span> : null}{fromResume ? <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400">from your resume</span> : null}</label>
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
  const ready = !!raw.trim();
  return (
    <div>
      {keyMissing || freeOff ? (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100">
          <p className="font-medium">{freeOff ? 'Free mode is not set up on this deployment yet' : 'One-time set-up: add a model key'}</p>
          <p className="mt-1">{freeOff ? 'The site owner has not added the shared key yet. ' : 'You picked a provider that needs your own key. '}Reading your resume and writing for you run on a language model. <a className="font-medium underline" href="#/settings">Open Settings</a>{freeOff ? ' to add your own key (Google Gemini has a free tier, no card).' : ' to add it, or switch to Free.'} You can fill in the answers below meanwhile.</p>
        </div>
      ) : null}

      <Section title="1 · Your resume" hint={master && !replacing ? `Loaded: ${master.name}, ${master.experience.length} roles, ${master.projects.length} projects. Every tailored resume is built only from this.` : 'Drop the PDF or paste the text of your current resume. It is read once into a structured copy that lives only in this browser, and can fill the answers below for you.'}>
        {showResumeInput || showJson ? (
          showJson ? (
            <div>
              <textarea rows={16} className={input + ' font-mono text-xs'} value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} />
              <div className="mt-2 flex gap-2"><button className={btn} onClick={saveJson}>Save</button><button className={btnGhost} onClick={() => setShowJson(false)}>Cancel</button></div>
            </div>
          ) : (
            <div onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }} onDragLeave={() => setDragging(false)} className={dragging ? 'rounded-xl ring-2 ring-emerald-500/60' : ''}>
              <textarea rows={file ? 6 : 10} className={input} placeholder="Paste your resume text here, or drop the PDF anywhere in this box..." value={raw} onChange={(e) => { setRaw(e.target.value); if (file) setFile(null); }} />
              {file ? (
                <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400"><span className="font-medium">{file.name}</span> loaded · {file.pages} page{file.pages === 1 ? '' : 's'} · {file.words} words. Check the text above reads right, then press Read my resume.</p>
              ) : null}
              {ready ? (
                <div className="mt-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <Switch on={autoFill} onChange={setAutoFill} label="Auto-fill my answers from this resume" hint={AUTOFILL_HINT} />
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button className={btn} disabled={!ready || !!busy || keyMissing} onClick={structure}>{busy || (ready && autoFill ? 'Read my resume & fill my answers' : 'Read my resume')}</button>
                <label className={btnGhost + ' cursor-pointer'}>{file ? 'Choose another file' : 'Upload PDF / TXT'}<input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={(e) => e.target.files && e.target.files[0] && onFile(e.target.files[0])} /></label>
                {keyMissing ? <a href="#/settings" className="text-sm text-amber-600 hover:underline">Needs a model key (why?)</a> : null}
                {replacing ? <button className={btnGhost} onClick={() => { setReplacing(false); setFile(null); }}>Keep the current one</button> : null}
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
        {fillMsg ? <p className={'mt-2 text-sm ' + muted}>{fillMsg}</p> : null}
      </Section>

      {review ? (
        <ReviewSheet
          proposals={review}
          selected={selected}
          onToggle={(k) => setSelected((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
          onSelectAll={(all) => setSelected(all ? new Set(review.map((p) => p.k)) : new Set())}
          onSave={saveReview}
          onSkip={() => setReview(null)}
        />
      ) : null}

      <Section id="answers" title={'2 · The questions every form asks' + (open.length ? ` (${open.length} open)` : ' (done)')} hint="Nothing here is mandatory. Answer what you know; mark the rest Not sure yet or Not applicable. When a form actually needs one of those, your kit flags it and tells you how to find the real answer. Answers are used verbatim by the answer sheet and the autofill bookmarklet.">
        {autofillRec && autofillRec.keys.length ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-100">
            <span>{autofillRec.keys.length} answer{autofillRec.keys.length === 1 ? '' : 's'} filled from your resume ({autofillRec.file}, {new Date(autofillRec.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}). Marked "from your resume" below.</span>
            <span className="flex gap-3">
              <button type="button" className="text-xs font-medium underline" onClick={undo}>Undo</button>
              <button type="button" className="text-xs font-medium underline" onClick={() => setAutofillRec(null)}>Dismiss</button>
            </span>
          </div>
        ) : null}
        {GROUPS.map((g) => renderGroup(g.id, true))}
        <button className={btnGhost} onClick={() => setMore(!more)}>{more ? 'Hide optional answers' : 'More answers (optional: address, hackathons, EEO details, defaults)'}</button>
        {more ? <div className="mt-4">{GROUPS.map((g) => renderGroup(g.id, false))}</div> : null}
        {unsure.length ? <p className={'mt-4 text-xs ' + muted}>{unsure.length} marked Not sure yet: {unsure.map((f) => f.label.replace(/^"|"$/g, '')).slice(0, 6).join('; ')}{unsure.length > 6 ? '...' : ''}. Each kit will say how to find them if a form asks.</p> : null}
      </Section>
      {master ? <a href="#/" className={btn}>Go paste a job</a> : null}
    </div>
  );
}
