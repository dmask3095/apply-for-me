// The fact guard: the model may choose and rephrase; it may not add facts.
import type { MasterResume, ResumeSpec } from './types';

const NUM = /\d[\d,.]*\+?%?[kKmM]?/g;

function numbers(s: string): Set<string> {
  return new Set((s.match(NUM) || []).map((n) => n.replace(/[,]/g, '').toLowerCase()));
}

export type TailorOutput = {
  headline?: string;
  summary?: string;
  skills?: { label: string; items: string[] }[];
  experience?: { id: string; bullets: string[] }[];
  projects?: { id: string; bullets: string[] }[];
  awards?: string[];
  changeLog?: string[];
};

export function applyGuard(master: MasterResume, out: TailorOutput): { spec: ResumeSpec; notes: string[] } {
  const notes: string[] = [];
  const masterText = JSON.stringify(master).toLowerCase();
  const masterNums = numbers(JSON.stringify(master));
  const okNumbers = (s: string) => [...numbers(s)].every((n) => masterNums.has(n));

  const summary = out.summary && okNumbers(out.summary) ? out.summary : master.summary;
  if (out.summary && summary !== out.summary) notes.push('Summary reverted to the original: it contained a number not in your resume.');

  const skills = (out.skills || master.skills)
    .map((g) => ({ label: String(g.label || '').slice(0, 60), items: (g.items || []).filter((it) => { const ok = masterText.includes(String(it).toLowerCase()); if (!ok) notes.push(`Dropped skill "${it}": not in your resume.`); return ok; }) }))
    .filter((g) => g.items.length);

  const expById = new Map(master.experience.map((e) => [e.id, e]));
  const experience = (out.experience || []).flatMap((e) => {
    const m = expById.get(e.id);
    if (!m) return [];
    const bullets = (e.bullets || []).filter((b) => { const ok = okNumbers(b); if (!ok) notes.push(`Dropped a bullet under ${m.org}: it introduced a number not in your resume.`); return ok; });
    return [{ ...m, bullets: bullets.length ? bullets : m.bullets.slice(0, 1) }];
  });
  // every employer stays, in the master's order
  const seen = new Set(experience.map((e) => e.id));
  for (const m of master.experience) if (!seen.has(m.id)) experience.push({ ...m, bullets: m.bullets.slice(0, 1) });
  experience.sort((a, b) => master.experience.findIndex((m) => m.id === a.id) - master.experience.findIndex((m) => m.id === b.id));

  const projById = new Map(master.projects.map((p) => [p.id, p]));
  const projects = (out.projects || []).flatMap((p) => {
    const m = projById.get(p.id);
    if (!m) return [];
    const bullets = (p.bullets || []).filter((b) => okNumbers(b));
    return [{ ...m, bullets: bullets.length ? bullets : m.bullets.slice(0, 1) }];
  });
  const awardIds = new Set(out.awards || master.awards.map((a) => a.id));
  const awards = master.awards.filter((a) => awardIds.has(a.id)).slice(0, 3);

  const spec: ResumeSpec = {
    ...master,
    headline: out.headline && okNumbers(out.headline) ? out.headline.slice(0, 90) : undefined,
    summary,
    skills,
    experience,
    projects: projects.length ? projects : master.projects.slice(0, 3),
    awards,
  };
  return { spec, notes };
}
