import type { AtsReport, Posting } from './types';

export async function pdfText(data: ArrayBuffer): Promise<{ text: string; pages: number }> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      line += item.str || '';
      if (item.hasEOL) { text += line + '\n'; line = ''; } else line += ' ';
    }
    text += line + '\n';
  }
  return { text, pages: doc.numPages };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (hay: string, term: string) => new RegExp('(?<![a-z0-9])' + esc(term.toLowerCase().trim()) + '(?![a-z0-9])').test(hay);

export function atsCheck(text: string, pages: number, posting: Posting, name: string, email: string): AtsReport {
  const low = text.toLowerCase().replace(/\s+/g, ' ');
  const issues: string[] = [];
  const warnings: string[] = [];
  if (pages !== 1) issues.push(`${pages} pages (the kit targets one)`);
  if (text.trim().length < 600) issues.push('Very little extractable text: the PDF may not parse.');
  const first = text.trim().split('\n')[0] || '';
  if (!first.toLowerCase().includes(name.toLowerCase().split(' ')[0])) issues.push('Your name is not the first line the parser sees.');
  if (email && !low.includes(email.toLowerCase())) issues.push('Email not found in the text.');
  for (const h of ['experience', 'education', 'skills']) if (!low.includes(h)) issues.push(`Missing a standard "${h}" heading.`);
  const terms = [...new Set((posting.keywords || []).map((k) => k.trim()).filter((k) => k.length > 1))];
  const present = terms.filter((t) => has(low, t));
  const missing = terms.filter((t) => !has(low, t));
  const coverage = terms.length ? Math.round((present.length / terms.length) * 100) : null;
  const must = (posting.requirements || []).flatMap((r) => r.split(/[,/]| and | or /i)).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 40);
  const mustMissing = must.filter((m) => !has(low, m));
  if (coverage !== null && coverage < 60) warnings.push(`Keyword coverage ${coverage}% is low. Add the missing terms that are true for you (only those).`);
  if (/[^\x00-\x7f\u2022\u2013\u2014\u2019\u201c\u201d\u00d7\u00e9]/.test(text)) warnings.push('Unusual characters found; check they read correctly.');
  return { pass: issues.length === 0, issues, warnings, pages, coverage, present, missing, mustMissing };
}

export function postingAge(postedDate: string | null | undefined): { days: number | null; label: string } {
  if (!postedDate) return { days: null, label: 'posting date unknown' };
  const d = new Date(postedDate);
  if (isNaN(d.getTime())) return { days: null, label: 'posting date unknown' };
  const days = Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
  if (days <= 2) return { days, label: `posted ${days === 0 ? 'today' : days + 'd ago'}: apply today` };
  if (days <= 7) return { days, label: `posted ${days}d ago: still fresh, apply now` };
  if (days <= 14) return { days, label: `posted ${days}d ago: aging, apply only if it is a strong fit` };
  return { days, label: `posted ${days}d ago: likely stale` };
}
