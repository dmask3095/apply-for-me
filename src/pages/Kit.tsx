import { useEffect, useMemo, useState } from 'react';
import { useLocal, KEYS, NO_KITS, EMPTY_ANSWERS } from '../lib/store';
import type { Answers, Kit } from '../lib/types';
import type { Fit } from '../lib/pipeline';
import { renderResume, renderLetter } from '../pdf/docs';
import { bookmarklet } from '../lib/autofill';
import { postingAge } from '../lib/ats';
import { Section, btn, btnGhost, muted, chip, Copy, input } from '../ui';

type FullKit = Kit & { fit?: Fit; followUpNote?: string; status?: string; appliedAt?: number };
const STATUSES = ['Kit built', 'Applied', 'Heard back', 'Interview', 'Offer', 'Rejected'];

export function KitPage({ id }: { id: string }) {
  const [kits, setKits] = useLocal<FullKit[]>(KEYS.kits, NO_KITS as FullKit[]);
  const [answers] = useLocal<Answers>(KEYS.answers, EMPTY_ANSWERS);
  const kit = kits.find((k) => k.id === id);
  const [resumeUrl, setResumeUrl] = useState('');
  const [letterUrl, setLetterUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!kit) return;
    let alive = true; let u1 = ''; let u2 = '';
    (async () => {
      const r = await renderResume(kit.spec);
      u1 = URL.createObjectURL(r.blob); if (alive) setResumeUrl(u1);
      if (kit.letter) {
        const c = kit.spec.contact || {};
        const b = await renderLetter({ name: kit.spec.name, contact: [c.location, c.phone, c.email, c.linkedin].filter(Boolean).join('  |  '), date: new Date(kit.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), subject: kit.letter.subject, paragraphs: kit.letter.paragraphs });
        u2 = URL.createObjectURL(b); if (alive) setLetterUrl(u2);
      }
    })();
    return () => { alive = false; if (u1) URL.revokeObjectURL(u1); if (u2) URL.revokeObjectURL(u2); };
  }, [kit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const bm = useMemo(() => bookmarklet(answers), [answers]);
  if (!kit) return <p className={muted}>Kit not found.</p>;
  const update = (patch: Partial<FullKit>) => setKits((prev) => prev.map((k) => (k.id === kit.id ? { ...k, ...patch } : k)));
  const fit = kit.fit;
  const verdictCls = fit?.verdict === 'skip' ? 'bg-rose-500/15 text-rose-700' : fit?.verdict === 'stretch' ? 'bg-amber-500/15 text-amber-700' : 'bg-emerald-500/15 text-emerald-700';
  const age = postingAge((kit.posting as { postedDate?: string | null }).postedDate);
  const fileBase = kit.spec.name.replace(/\s+/g, '_') + '_' + kit.posting.company.replace(/[^A-Za-z0-9]+/g, '_');
  const followDate = new Date((kit.appliedAt || kit.createdAt) + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const letterText = kit.letter ? kit.letter.paragraphs.join('\n\n') : '';
  const allAnswers = kit.answers.map((a) => `${a.question}\n${a.answer}`).join('\n\n');

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{kit.posting.company} · {kit.posting.title}</h1>
        <span className={chip + ' bg-zinc-500/15 text-zinc-600 dark:text-zinc-300'}>{kit.posting.kind}</span>
        <select className={input + ' ml-auto w-auto'} value={kit.status || 'Kit built'} onChange={(e) => update({ status: e.target.value, appliedAt: e.target.value === 'Applied' && !kit.appliedAt ? Date.now() : kit.appliedAt })}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Section title="Should you apply?" hint={age.label + (kit.posting.deadline ? ` · deadline ${kit.posting.deadline}` : '')}>
        {fit ? (
          <div>
            <p className="text-sm"><span className={chip + ' ' + verdictCls}>{fit.verdict === 'apply' ? 'Apply' : fit.verdict === 'stretch' ? 'Stretch, worth it' : 'Probably skip'}</span> <span className="ml-2 text-zinc-800 dark:text-zinc-200">{fit.reason}</span></p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <div><p className="font-medium text-emerald-700">You have</p><ul className="mt-1 list-disc pl-4">{fit.met.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              <div><p className="font-medium text-amber-700">Partly</p><ul className="mt-1 list-disc pl-4">{fit.stretch.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              <div><p className="font-medium text-rose-700">Missing</p><ul className="mt-1 list-disc pl-4">{fit.missing.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            </div>
            {fit.knockouts.length ? <div className="mt-3 text-sm"><p className="font-medium">Knockout questions</p><ul className="mt-1 space-y-1">{fit.knockouts.map((k, i) => <li key={i}><span className={k.ok ? 'text-emerald-700' : 'text-rose-700'}>{k.ok ? 'ok' : 'risk'}</span> · {k.rule} <span className={muted}>(you: {k.candidate})</span></li>)}</ul></div> : null}
            <p className={'mt-3 text-xs ' + muted}>Recruiters use knockout questions, not resume formatting, to auto-reject; and meeting roughly half of the listed requirements is usually enough to be interviewed. Missing three or more core requirements is the point where it stops being worth it.</p>
          </div>
        ) : <p className={muted}>No fit data.</p>}
      </Section>

      <Section title="Resume" hint={`One page at ${kit.fontSize} pt, built only from your stored resume. ${kit.ats?.coverage !== null && kit.ats?.coverage !== undefined ? `Keyword coverage ${kit.ats.coverage}% of ${kit.ats.present.length + kit.ats.missing.length} terms the posting uses.` : ''}`}>
        <div className="flex flex-wrap gap-2">
          {resumeUrl ? <a className={btn} href={resumeUrl} download={fileBase + '_Resume.pdf'}>Download resume PDF</a> : <span className={muted}>Rendering...</span>}
        </div>
        {resumeUrl ? <iframe title="resume" src={resumeUrl} className="mt-3 h-[720px] w-full rounded-lg border border-zinc-200 dark:border-zinc-800" /> : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="font-medium">ATS check {kit.ats?.pass ? <span className="text-emerald-700">passed</span> : <span className="text-rose-700">has issues</span>}</p>
            <ul className="mt-1 list-disc pl-4">{(kit.ats?.issues || []).map((x, i) => <li key={'i' + i} className="text-rose-700">{x}</li>)}{(kit.ats?.warnings || []).map((x, i) => <li key={'w' + i} className="text-amber-700">{x}</li>)}</ul>
            {kit.ats?.mustMissing?.length ? <p className={'mt-2 ' + muted}>Requirement wording not on the page: {kit.ats.mustMissing.slice(0, 12).join('; ')}.</p> : null}
            {kit.ats?.missing?.length ? <p className={'mt-2 ' + muted}>Posting terms not on the page: {kit.ats.missing.slice(0, 20).join(', ')}. Add only the ones that are true for you (edit your stored resume, then rebuild).</p> : null}
          </div>
          <div>
            <p className="font-medium">What changed and why</p>
            <ul className="mt-1 list-disc pl-4">{kit.changeLog.map((x, i) => <li key={i}>{x}</li>)}{kit.guardNotes.map((x, i) => <li key={'g' + i} className="text-amber-700">{x}</li>)}{(kit.dropped || []).map((x, i) => <li key={'d' + i} className={muted}>Dropped to fit one page: {x}</li>)}</ul>
          </div>
        </div>
      </Section>

      {kit.letter ? (
        <Section title="Cover letter" hint="Connects two things you did to what they need. 89% of recruiters say they expect one; 81% have rejected on a letter alone, so read it once before sending.">
          <div className="flex flex-wrap gap-2">{letterUrl ? <a className={btn} href={letterUrl} download={fileBase + '_Cover_Letter.pdf'}>Download letter PDF</a> : null}<Copy text={letterText} label="Copy text" /></div>
          <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{letterText}</div>
        </Section>
      ) : null}

      <Section title="Answers for the form" hint="Every question the form will ask, with your answer. Yellow rows need you. Drag the Autofill button to your bookmarks bar, open the application, click it: the common fields fill themselves.">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <a className={btnGhost} href={bm} onClick={(e) => e.preventDefault()} title="Drag me to your bookmarks bar">Autofill (drag to bookmarks)</a>
          <Copy text={allAnswers} label="Copy all answers" />
        </div>
        <table className="w-full text-sm">
          <tbody>
            {kit.answers.map((a, i) => (
              <tr key={i} className={'border-t border-zinc-200 dark:border-zinc-800 ' + (a.source === 'needs-you' ? 'bg-amber-500/10' : '')}>
                <td className="w-1/3 py-2 pr-3 align-top font-medium text-zinc-800 dark:text-zinc-200">{a.question}</td>
                <td className="py-2 pr-3 align-top whitespace-pre-wrap">{a.answer}</td>
                <td className="py-2 align-top text-right"><Copy text={a.answer} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`Follow up on ${followDate}`} hint="A short note 5-7 days after applying roughly doubles replies in tracked job searches. Only for roles that fit.">
        <div className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{(kit.followUpNote || '').replace('{date}', new Date(kit.appliedAt || kit.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }))}</div>
        <div className="mt-2"><Copy text={(kit.followUpNote || '').replace('{date}', new Date(kit.appliedAt || kit.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }))} /></div>
        <textarea rows={2} className={input + ' mt-3'} placeholder="Your notes (recruiter name, what they said...)" value={notes || (kit as { notes?: string }).notes || ''} onChange={(e) => setNotes(e.target.value)} onBlur={() => update({ notes } as Partial<FullKit>)} />
      </Section>
    </div>
  );
}
