// Auto-fill the answer bank from an uploaded resume.
// The model lifts only what the resume states (formAnswers); this file validates every value against the field it
// would go into, falls back to the structured resume for the basics, and turns the result into proposals the user
// ticks before anything is saved. Saving is recorded so it can be undone in one click.
import type { Answers, AutofillRecord, MasterResume } from './types';
import { ALL_FIELDS, FIELD_BY_KEY, getVal, setVal, isEmpty, isUnsure } from './questions';
import type { Field } from './questions';

export type FormAnswers = {
  firstName?: unknown; middleName?: unknown; lastName?: unknown; email?: unknown; phone?: unknown;
  street?: unknown; city?: unknown; state?: unknown; postalCode?: unknown; country?: unknown;
  linkedin?: unknown; github?: unknown; portfolio?: unknown;
  citizenshipCountry?: unknown; workStatus?: unknown; authorizedToWork?: unknown; sponsorship?: unknown; securityClearance?: unknown;
  current?: { school?: unknown; degree?: unknown; major?: unknown; start?: unknown; end?: unknown; gpa?: unknown; inProgress?: unknown };
  previous?: { school?: unknown; degree?: unknown; major?: unknown; end?: unknown; gpa?: unknown };
  languages?: unknown; certifications?: unknown; dateOfBirth?: unknown;
};

export type Proposal = {
  k: string; label: string; group: string;
  value: unknown; display: string;
  current: string;      // what the answer bank holds now, shown when it differs
  replaces: boolean;    // true when saving would overwrite a real answer (not an empty one, not "Not sure yet")
  checked: boolean;     // default tick: on unless it replaces something
  note?: string;
};

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, '0');
const NOTHING = /^(n\/?a|none|null|undefined|unknown|not (stated|listed|provided|available|specified|given)|-+|\.+)$/i;

export function str(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return undefined;
  const s = v.replace(/\s+/g, ' ').trim();
  return !s || NOTHING.test(s) ? undefined : s;
}

/** "May 2027", "Expected Dec 2026", "05/2027", "2027-05", "2027 May" -> "2027-05". A bare year is not a month. */
export function toMonth(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  let m = s.match(/(\d{4})-(\d{1,2})/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${pad(+m[2])}`;
  m = s.match(/(\d{1,2})[/.](\d{4})/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${pad(+m[1])}`;
  m = s.match(/([a-z]{3,9})\.?,?\s+(\d{4})/i);
  if (m) { const mo = MONTHS[m[1].slice(0, 3).toLowerCase()]; if (mo) return `${m[2]}-${pad(mo)}`; }
  m = s.match(/(\d{4})\s+([a-z]{3,9})/i);
  if (m) { const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]; if (mo) return `${m[1]}-${pad(mo)}`; }
  return undefined;
}

export function toDate(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  const d = new Date(s);
  return isNaN(d.getTime()) || !/\d{4}/.test(s) ? undefined : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The start and end months of a resume date range such as "Aug 2025 – May 2027" or "Expected May 2027". */
export function rangeOf(dates: unknown): { start?: string; end?: string } {
  const s = str(dates);
  if (!s) return {};
  const bits = s.split(/\s+(?:-|–|—|to|until|through)\s+|–|—/i).map((b) => b.trim()).filter(Boolean);
  if (bits.length >= 2) return { start: toMonth(bits[0]), end: toMonth(bits[bits.length - 1]) };
  return { end: toMonth(bits[0]) };
}

function link(v: unknown): string | undefined {
  const s = str(v);
  if (!s || !/[a-z0-9]\.[a-z]{2,}/i.test(s) || /\s/.test(s)) return undefined;
  return /^https?:\/\//i.test(s) ? s : 'https://' + s.replace(/^\/+/, '');
}

function option(f: Field, v: unknown): string | undefined {
  const s = str(v);
  if (!s || !f.options) return undefined;
  const low = s.toLowerCase();
  return f.options.find((o) => o.toLowerCase() === low);
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  const s = str(v)?.toLowerCase();
  if (s === 'yes' || s === 'true') return true;
  if (s === 'no' || s === 'false') return false;
  return undefined;
}

/** Level of study from the degree name and whether it is in progress; a finished programme means "not a student". */
export function levelOf(degree: string | undefined, inProgress: unknown, end: string | undefined): string | undefined {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const done = inProgress === false || (inProgress === undefined && !!end && end < thisMonth);
  if (done) return 'Graduated / not a student';
  if (inProgress !== true && !end) return undefined;
  if (!degree) return undefined;
  if (/ph\.?\s?d|doctor/i.test(degree)) return 'PhD';
  if (/master|mba|\bm\.?\s?(s|sc|a|eng|e|tech|i\.?s|b\.?a)\b/i.test(degree)) return "Graduate (Master's)";
  if (/bachelor|\bb\.?\s?(s|sc|a|e|eng|tech|b\.?a)\b/i.test(degree)) return 'Undergraduate';
  return undefined;
}

/** "Long Beach, CA" -> city and state; anything less regular is left to the model. */
function cityState(location: unknown): { city?: string; state?: string } {
  const s = str(location);
  if (!s) return {};
  const m = s.match(/^([A-Za-z .'-]{2,}),\s*([A-Z]{2})(?:[ ,]|$)/);
  return m ? { city: m[1].trim(), state: m[2] } : {};
}

function normalize(f: Field, v: unknown): unknown {
  if (f.type === 'month') return toMonth(v);
  if (f.type === 'date') return toDate(v);
  if (f.type === 'select') return option(f, v);
  if (f.type === 'toggle') return bool(v);
  if (f.type === 'multi') { const arr = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/,\s*/) : []; const out = arr.map((x) => option(f, x)).filter((x): x is string => !!x); return out.length ? out : undefined; }
  return str(v);
}

export function show(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map(show).join(', ');
  return v === undefined || v === null ? '' : String(v);
}

const GROUP_OF: Record<string, string> = Object.fromEntries(ALL_FIELDS.map((f) => [f.k, f.group]));

/** Everything the resume states that the answer bank could use, as reviewable proposals. */
export function proposeFromResume(master: MasterResume, fa: FormAnswers | undefined, answers: Answers): Proposal[] {
  const f: FormAnswers = fa && typeof fa === 'object' ? fa : {};
  const c = master.contact || {};
  const parts = (master.name || '').trim().split(/\s+/).filter(Boolean);
  const cur = (f.current && typeof f.current === 'object' ? f.current : {}) as NonNullable<FormAnswers['current']>;
  const prev = (f.previous && typeof f.previous === 'object' ? f.previous : {}) as NonNullable<FormAnswers['previous']>;
  const edu0 = master.education?.[0];
  const edu1 = master.education?.[1];
  const r0 = rangeOf(edu0?.dates);
  const r1 = rangeOf(edu1?.dates);
  const loc = cityState(c.location);
  const email = str(f.email) || str(c.email);
  const gradDegree = str(cur.degree) || str(edu0?.degree);
  const gradEnd = toMonth(cur.end) || r0.end;
  const idNote = 'Forms compare it with your ID; fix it if the resume uses a short form.';
  const cand: [string, unknown, string?][] = [
    ['legalFirstName', str(f.firstName) || parts[0], idNote],
    ['legalMiddleName', str(f.middleName) || (parts.length > 2 ? parts.slice(1, -1).join(' ') : undefined)],
    ['legalLastName', str(f.lastName) || (parts.length > 1 ? parts[parts.length - 1] : undefined), idNote],
    ['email', email],
    ['phone', str(f.phone) || str(c.phone)],
    ['address/street', str(f.street)],
    ['address/city', str(f.city) || loc.city],
    ['address/state', str(f.state) || loc.state],
    ['address/postalCode', str(f.postalCode)],
    ['address/country', str(f.country)],
    ['linkedin', link(f.linkedin) || link(c.linkedin)],
    ['github', link(f.github) || link(c.github)],
    ['portfolioUrl', link(f.portfolio) || link(c.portfolio)],
    ['citizenshipCountry', str(f.citizenshipCountry)],
    ['visaStatus', str(f.workStatus)],
    ['workAuthorizedUS', f.authorizedToWork],
    ['sponsorshipAnswer', f.sponsorship],
    ['securityClearance', f.securityClearance],
    ['educationDetails/gradSchool', str(cur.school) || str(edu0?.school)],
    ['educationDetails/gradDegree', gradDegree],
    ['educationDetails/gradMajor', str(cur.major)],
    ['educationDetails/gradStart', toMonth(cur.start) || r0.start],
    ['educationDetails/gradEnd', gradEnd],
    ['educationDetails/gradGpa', str(cur.gpa)],
    ['educationDetails/levelOfStudy', levelOf(gradDegree, cur.inProgress, gradEnd), 'From the degree and its dates'],
    ['educationDetails/schoolEmail', email && /\.edu$/i.test(email) ? email : undefined],
    ['educationDetails/ugSchool', str(prev.school) || str(edu1?.school)],
    ['educationDetails/ugDegree', str(prev.degree) || str(edu1?.degree)],
    ['educationDetails/ugMajor', str(prev.major)],
    ['educationDetails/ugEnd', toMonth(prev.end) || r1.end],
    ['educationDetails/ugGpa', str(prev.gpa)],
    ['languages', str(f.languages)],
    ['certifications', str(f.certifications) || (master.certifications && master.certifications.length ? master.certifications.join(', ') : undefined)],
    ['dateOfBirth', f.dateOfBirth],
  ];
  const out: Proposal[] = [];
  for (const [k, rawV, note] of cand) {
    const field = FIELD_BY_KEY[k];
    if (!field) continue;
    const value = normalize(field, rawV);
    if (value === undefined || value === '') continue;
    const curV = getVal(answers, k);
    const display = show(value);
    const current = isEmpty(curV) ? '' : show(curV);
    if (current && current.trim().toLowerCase() === display.trim().toLowerCase()) continue;
    const replaces = !!current && !isUnsure(curV);
    out.push({ k, label: field.label, group: GROUP_OF[k], value, display, current, replaces, checked: !replaces, note });
  }
  return out;
}

export function applyProposals(answers: Answers, proposals: Proposal[], keys: Set<string>, file: string): { next: Answers; record: AutofillRecord } {
  let next: Answers = { ...answers };
  const previous: Record<string, unknown> = {};
  const applied: string[] = [];
  for (const p of proposals) {
    if (!keys.has(p.k)) continue;
    const old = getVal(answers, p.k);
    previous[p.k] = old === undefined ? null : old;
    next = setVal(next, p.k, p.value);
    applied.push(p.k);
  }
  return { next, record: { at: Date.now(), file, keys: applied, previous } };
}

/** Put back what the answer bank held before the auto-fill (an answer that did not exist is removed again). */
export function undoAutofill(answers: Answers, rec: AutofillRecord): Answers {
  let next: Answers = { ...answers };
  for (const k of rec.keys) {
    const old = rec.previous[k];
    next = setVal(next, k, old === null ? undefined : old);
  }
  for (const k of Object.keys(next)) {
    const v = next[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) delete next[k];
  }
  return next;
}
