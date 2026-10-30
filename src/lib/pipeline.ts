import { chatJSON, fetchPostingText } from './llm';
import { SYSTEM, analyzePrompt, tailorPrompt, writingPrompt } from './prompts';
import { applyGuard } from './guard';
import type { TailorOutput } from './guard';
import { atsCheck, pdfText } from './ats';
import { renderResume } from '../pdf/docs';
import { standardAnswers } from './questions';
import type { AnswerRow, Answers, Kit, MasterResume, Posting, Settings } from './types';

export type Fit = { verdict: 'apply' | 'stretch' | 'skip'; reason: string; met: string[]; stretch: string[]; missing: string[]; knockouts: { rule: string; candidate: string; ok: boolean }[] };

function summarize(a: Answers) {
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(a)) if (!['answerLog', 'answeredAt', 'pending'].includes(k)) copy[k] = v;
  return JSON.stringify(copy).slice(0, 4000) + ' ("Not sure yet" = the candidate has not answered: never assume; "Not applicable" = leave that box blank)';
}

export async function buildKit(settings: Settings, master: MasterResume, answers: Answers, input: { text?: string; url?: string }, onStep: (s: string) => void): Promise<Kit & { fit: Fit; followUpNote: string }> {
  let text = (input.text || '').trim();
  if (!text && input.url) { onStep('Reading the posting'); text = await fetchPostingText(input.url); }
  if (!text) throw new Error('Paste the posting text or a link.');

  onStep('Reading the posting');
  const a = (await chatJSON(settings, SYSTEM, analyzePrompt(text))) as Record<string, unknown>;
  const posting: Posting & { knockouts?: string[]; postedDate?: string | null } = {
    source: input.url || 'pasted', text,
    company: String(a.company || 'Unknown company'), title: String(a.title || 'Role'), kind: String(a.kind || 'job'),
    location: a.location ? String(a.location) : undefined, workSetting: a.workSetting ? String(a.workSetting) : undefined,
    deadline: a.deadline ? String(a.deadline) : undefined, problem: a.problem ? String(a.problem) : undefined,
    requirements: Array.isArray(a.requirements) ? a.requirements.map(String) : [], keywords: Array.isArray(a.keywords) ? a.keywords.map(String) : [],
    niceToHave: Array.isArray(a.niceToHave) ? a.niceToHave.map(String) : [], questions: Array.isArray(a.questions) ? a.questions.map(String) : [],
    knockouts: Array.isArray(a.knockouts) ? a.knockouts.map(String) : [], postedDate: a.postedDate ? String(a.postedDate) : null,
  };

  onStep('Tailoring your resume');
  const t = (await chatJSON(settings, SYSTEM, tailorPrompt(master, posting, summarize(answers)), 6000)) as TailorOutput & { fit?: Fit; followUpNote?: string };
  const { spec, notes } = applyGuard(master, t);
  const fit: Fit = { verdict: (t.fit?.verdict as Fit['verdict']) || 'apply', reason: t.fit?.reason || '', met: t.fit?.met || [], stretch: t.fit?.stretch || [], missing: t.fit?.missing || [], knockouts: t.fit?.knockouts || [] };

  onStep('Building the PDF and checking it like an ATS');
  const r = await renderResume(spec);
  const { text: extracted, pages } = await pdfText(await r.blob.arrayBuffer());
  const ats = atsCheck(extracted, pages, posting, master.name, master.contact?.email || '');

  onStep('Writing the letter and your answers');
  const std = standardAnswers(answers);
  const w = (await chatJSON(settings, SYSTEM, writingPrompt(master, posting, String(answers.coverLetterTone || 'Direct and confident'), summarize(answers), std.map((r) => r.question).join('; ')), 5000)) as { letter?: { subject: string; paragraphs: string[] }; answers?: AnswerRow[] };
  const rows: AnswerRow[] = [...std.map((r) => ({ question: r.question, answer: r.answer, source: r.source })), ...((w.answers || []).filter((x) => x && x.question && x.answer).map((x) => ({ question: String(x.question), answer: String(x.answer), source: (['bank', 'resume', 'drafted', 'needs-you'].includes(x.source) ? x.source : 'drafted') as AnswerRow['source'] })))];

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    id, createdAt: Date.now(), posting, spec, changeLog: t.changeLog || [], guardNotes: notes,
    letter: w.letter && Array.isArray(w.letter.paragraphs) ? { subject: String(w.letter.subject || `Application for ${posting.title}`), paragraphs: w.letter.paragraphs.map(String) } : undefined,
    answers: rows, ats, fontSize: r.fontSize, dropped: r.dropped, fit, followUpNote: String(t.followUpNote || ''),
  };
}
