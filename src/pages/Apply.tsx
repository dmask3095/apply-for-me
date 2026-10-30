import { useState } from 'react';
import { useLocal, KEYS, DEFAULT_SETTINGS, EMPTY_ANSWERS, NO_MASTER, NO_KITS } from '../lib/store';
import { buildKit } from '../lib/pipeline';
import { needsKey } from '../lib/llm';
import type { Answers, Kit, MasterResume, Settings } from '../lib/types';
import { unanswered } from '../lib/questions';
import { Section, input, btn, muted } from '../ui';

export function Apply() {
  const [master] = useLocal<MasterResume | null>(KEYS.master, NO_MASTER);
  const [answers] = useLocal<Answers>(KEYS.answers, EMPTY_ANSWERS);
  const [settings] = useLocal<Settings>(KEYS.settings, DEFAULT_SETTINGS);
  const [, setKits] = useLocal<Kit[]>(KEYS.kits, NO_KITS);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [step, setStep] = useState('');
  const [err, setErr] = useState('');
  const missing = unanswered(answers).length;

  async function go() {
    if (!master) { window.location.hash = '#/profile'; return; }
    setErr(''); setStep('Starting');
    try {
      const kit = await buildKit(settings, master, answers, { text, url }, setStep);
      setKits((prev) => [kit, ...prev].slice(0, 100));
      window.location.hash = '#/kit/' + kit.id;
    } catch (e) { setErr((e as Error).message); } finally { setStep(''); }
  }

  return (
    <div>
      <Section title="Paste a job" hint="A posting, an internship, a fellowship, a hackathon page. Text works best; a link is read through a public reader.">
        <textarea rows={8} className={input} placeholder="Paste the posting text here..." value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-2 flex items-center gap-2">
          <span className={'text-xs ' + muted}>or</span>
          <input className={input} placeholder="https://company.com/careers/role" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className={btn} disabled={!!step || (!text.trim() && !url.trim())} onClick={go}>{step ? step + '...' : 'Build my kit'}</button>
          {!master ? <a href="#/profile" className="text-sm text-amber-600 hover:underline">Add your resume first</a> : null}
          {master && missing ? <a href="#/profile" className={'text-sm hover:underline ' + muted}>{missing} profile questions still open (optional)</a> : null}
          {needsKey(settings) ? <a href="#/settings" className="text-sm text-amber-600 hover:underline">Needs a model key (why?)</a> : null}
        </div>
        {err ? <p className="mt-3 text-sm text-rose-600">{err}</p> : null}
      </Section>
      <p className={'text-sm ' + muted}>You get: a fit check with the knockout questions, a one-page resume in the job's own words (facts only from your resume, checked by a parser), a cover letter, every answer the form will ask, an autofill bookmarklet, and a follow-up note for day 6. You still click Submit.</p>
    </div>
  );
}
