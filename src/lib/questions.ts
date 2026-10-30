// The answer bank: everything application forms keep asking, answered once.
// Nothing here is mandatory. Every question can be marked "Not sure yet" or "Not applicable"; the kit then tells you
// how to find the real answer when a form actually needs it, instead of guessing.
export type FieldType = 'text' | 'textarea' | 'select' | 'toggle' | 'multi' | 'date' | 'month';
export type Field = {
  k: string; label: string; type: FieldType;
  req?: boolean;        // forms ask this almost every time (shown in the short list); still never blocks anything
  options?: string[];
  help?: string;        // one line of context
  howTo?: string;       // how to find the accurate answer when you do not know it
  na?: boolean;         // offer "Not applicable"
  noSkip?: boolean;     // no skip chips (name, email, phone: every form needs them and they come from your resume)
};
export type Group = { id: string; title: string; blurb: string; fields: Field[] };

export const UNSURE = 'Not sure yet';
export const NA = 'Not applicable';
export const isUnsure = (v: unknown) => v === UNSURE;
export const isNA = (v: unknown) => v === NA;
export const isSentinel = (v: unknown) => v === UNSURE || v === NA;

export const GROUPS: Group[] = [
  { id: 'identity', title: 'Who you are', blurb: 'Exactly what goes into the name, contact and link boxes. Filled from your resume where possible.', fields: [
    { k: 'legalFirstName', label: 'Legal first name', type: 'text', req: true, noSkip: true, howTo: 'As on your passport or government ID; forms compare it with your background check.' },
    { k: 'legalMiddleName', label: 'Middle name (as on your ID)', type: 'text', na: true },
    { k: 'legalLastName', label: 'Legal last name', type: 'text', req: true, noSkip: true },
    { k: 'preferredName', label: 'Preferred name', type: 'text', na: true },
    { k: 'pronouns', label: 'Pronouns', type: 'select', options: ['She/Her', 'He/Him', 'They/Them', 'Prefer not to say'] },
    { k: 'email', label: 'Email for applications', type: 'text', req: true, noSkip: true, howTo: 'Use one you check daily; recruiter replies and assessment links go there.' },
    { k: 'phone', label: 'Phone', type: 'text', req: true, noSkip: true, howTo: 'With country code if you apply outside your country, e.g. +1 562 555 0100.' },
    { k: 'address/street', label: 'Street address', type: 'text' },
    { k: 'address/city', label: 'City', type: 'text', req: true },
    { k: 'address/state', label: 'State / region', type: 'text', na: true },
    { k: 'address/postalCode', label: 'ZIP / postal code', type: 'text' },
    { k: 'address/country', label: 'Country', type: 'text', req: true },
    { k: 'linkedin', label: 'LinkedIn URL', type: 'text', na: true, howTo: 'On LinkedIn: Me > View profile > "Edit public profile & URL" (top right). Copy the full https:// link.' },
    { k: 'github', label: 'GitHub URL', type: 'text', na: true },
    { k: 'portfolioUrl', label: 'Portfolio / website URL', type: 'text', na: true },
    { k: 'citizenshipCountry', label: 'Country of citizenship', type: 'text', req: true, howTo: 'Exactly as on your passport. Dual citizens: list both.' },
    { k: 'dateOfBirth', label: 'Date of birth', type: 'date', help: 'Only hackathons and a few portals ask (age checks). Leave empty if you prefer.' },
  ] },
  { id: 'work', title: 'Work authorization', blurb: 'The questions that decide whether an application is considered at all. Answer truthfully; the kit repeats them verbatim.', fields: [
    { k: 'workAuthorizedUS', label: '"Are you legally authorized to work in this country?"', type: 'select', req: true, options: ['Yes', 'No'],
      howTo: 'Citizens, permanent residents, and anyone holding a valid work permit (EAD) or approved CPT answer Yes. On a student visa without approved CPT/OPT yet, the truthful answer is No until it is approved; your school\'s international office (DSO) can confirm in one email.' },
    { k: 'sponsorshipAnswer', label: '"Will you now or in the future require visa sponsorship?"', type: 'select', req: true, options: ['No', 'Yes, in the future', 'Yes, now'],
      help: 'Answering "No" to pass more screens counts as misrepresentation if the employer later has to sponsor you.',
      howTo: 'If you will ever need an employer-sponsored visa (H-1B, O-1, TN through the employer, PERM green card), answer "Yes, in the future". Citizens, permanent residents, asylees and refugees answer No. On OPT or STEM OPT today but needing H-1B later: "Yes, in the future".' },
    { k: 'visaStatus', label: 'Current status (e.g. citizen, permanent resident, F-1 on OPT, H-1B)', type: 'text', req: true,
      howTo: 'Copy it from the document you hold: I-20 (F-1), DS-2019 (J-1), I-797 approval notice (H-1B/L-1), EAD card category code (C03A/C03B = OPT, C03C = STEM OPT, C09 = pending green card), or green card.' },
    { k: 'workAuthValidTo', label: 'Authorization valid until (if time-limited)', type: 'date', na: true,
      howTo: 'The "Card Expires" date on your EAD card, the CPT end date on page 2 of your I-20, or the end date on your I-797. Not time-limited (citizen, permanent resident): mark Not applicable.' },
    { k: 'securityClearance', label: 'Security clearance', type: 'select', options: ['None', 'Public Trust', 'Secret', 'Top Secret'], howTo: 'If you never went through a US government clearance investigation, the answer is None.' },
    { k: 'backgroundCheckConsent', label: 'Consent to background checks when a form asks', type: 'toggle',
      howTo: 'Standard US employment checks verify identity, education, past employers and criminal records, and happen only after an offer. Yes here only means the kit answers Yes when a form asks for consent.' },
  ] },
  { id: 'education', title: 'Education', blurb: 'Every school box, exactly as forms want it.', fields: [
    { k: 'educationDetails/gradSchool', label: 'Most recent / current school', type: 'text', req: true },
    { k: 'educationDetails/gradDegree', label: 'Degree (e.g. Master of Science)', type: 'text', req: true, howTo: 'The exact degree name on your transcript or enrollment letter, not the abbreviation forms sometimes accept.' },
    { k: 'educationDetails/gradMajor', label: 'Major / program', type: 'text' },
    { k: 'educationDetails/gradStart', label: 'Start', type: 'month', howTo: 'Your admission letter or the first term on your transcript. F-1 students: page 1 of the I-20, "Program start date".' },
    { k: 'educationDetails/gradEnd', label: 'Graduation (actual or expected)', type: 'month', req: true, howTo: 'The conferral month on your transcript, or for current students the expected date on your degree audit / I-20 page 1 ("Program end date").' },
    { k: 'educationDetails/gradGpa', label: 'GPA', type: 'text', na: true, howTo: 'From your transcript, on the scale your school uses. If it is not a 4.0 scale, write the scale too (e.g. 8.2/10).' },
    { k: 'educationDetails/levelOfStudy', label: 'Level of study', type: 'select', options: ['Graduate (Master\'s)', 'Undergraduate', 'PhD', 'Graduated / not a student'] },
    { k: 'educationDetails/schoolEmail', label: 'School (.edu) email', type: 'text', na: true, help: 'Student programs, GitHub Student and MLH hackathons require it.' },
    { k: 'educationDetails/ugSchool', label: 'Undergraduate school', type: 'text' },
    { k: 'educationDetails/ugDegree', label: 'Undergraduate degree', type: 'text' },
    { k: 'educationDetails/ugMajor', label: 'Undergraduate major', type: 'text' },
    { k: 'educationDetails/ugEnd', label: 'Undergraduate graduation', type: 'month' },
    { k: 'educationDetails/ugGpa', label: 'Undergraduate GPA', type: 'text', na: true, howTo: 'If your school used a percentage or a 10-point scale, give it as such (e.g. 72% or 7.8/10); converting to 4.0 yourself can be read as misreporting.' },
  ] },
  { id: 'availability', title: 'Availability & preferences', blurb: 'Start dates, setting, pay.', fields: [
    { k: 'startDate', label: 'What to say for "available start date"', type: 'text', req: true, help: 'e.g. Immediately, or June 2027.',
      howTo: 'Students: the Monday after your last final, or the month after graduation. Employed: your notice period plus a week. "Immediately" if you can start within two weeks.' },
    { k: 'internshipSeasons', label: 'Internship seasons you want', type: 'multi', options: ['Now (part-time)', 'Spring 2027', 'Summer 2027', 'Fall 2027', 'Not looking for internships'],
      howTo: 'Student visa holders need a separate work authorization (CPT) for each internship term; ask your international office which terms they will approve before committing.' },
    { k: 'hoursDuringSemester', label: 'Hours per week during the semester', type: 'select', options: ['Up to 20', 'Up to 10', 'Full-time', 'Not during the semester'],
      howTo: 'US F-1 rule: at most 20 hours a week across all jobs while classes are in session; full-time only during official breaks.' },
    { k: 'employmentTypes', label: 'Types you will accept', type: 'multi', options: ['Internship', 'Full-time', 'Part-time', 'Contract', 'Fellowship'] },
    { k: 'workSetting', label: 'Work setting', type: 'select', req: true, options: ['Any (remote, hybrid or on-site)', 'Remote only', 'Hybrid or remote', 'On-site is fine'] },
    { k: 'preferredLocations', label: 'Preferred locations', type: 'text', req: true, help: 'Metro areas, comma-separated, e.g. Los Angeles, SF Bay Area, Seattle, Remote.' },
    { k: 'relocate', label: 'Willing to relocate', type: 'toggle' },
    { k: 'travelPercent', label: 'Travel you accept', type: 'select', options: ['None', 'Up to 25%', 'Up to 50%', 'Any'] },
    { k: 'salaryInternHourly', label: 'Internship pay you ask for (hourly)', type: 'text', na: true,
      howTo: 'Check the posting first (California, New York, Colorado, Washington and several other states require a pay range). Then look up the title and city on levels.fyi and the public H-1B salary database (h1bdata.info). Ask for the middle of the range; only used when a form requires a number.' },
    { k: 'salaryFullTimeBase', label: 'Full-time base you ask for (annual)', type: 'text', na: true,
      howTo: 'Same sources: the posted range, levels.fyi, h1bdata.info for the exact title and city. Give a range, not one number, and never go below the posted minimum.' },
    { k: 'salaryPolicy', label: 'When a salary box is optional', type: 'select', options: ['Leave it blank', 'Write "Negotiable"', 'Give my range'] },
  ] },
  { id: 'eeo', title: 'Voluntary self-identification', blurb: 'The EEO questions at the end of US forms. Voluntary; compliant systems keep them away from hiring managers.', fields: [
    { k: 'eeoPolicy', label: 'How to handle these sections', type: 'select', req: true, options: ['Answer with the values below', 'Decline to self-identify everywhere'], help: 'Declining has no effect on your application; employers collect this for government reporting only.' },
    { k: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male', 'Non-binary', 'Decline to self-identify'] },
    { k: 'raceEthnicity', label: 'Race / ethnicity', type: 'select', options: ['Asian (Not Hispanic or Latino)', 'Hispanic or Latino', 'White (Not Hispanic or Latino)', 'Black or African American', 'Native American or Alaska Native', 'Native Hawaiian or Pacific Islander', 'Two or more races', 'Decline to self-identify'] },
    { k: 'veteran', label: 'Veteran status', type: 'select', options: ['I am not a protected veteran', 'I am a protected veteran', 'Decline to self-identify'] },
    { k: 'disability', label: 'Disability status', type: 'select', options: ['No, I do not have a disability', 'Yes, I have a disability (or previously had one)', 'Decline to self-identify'] },
  ] },
  { id: 'hackathon', title: 'Hackathons & events', blurb: 'Registration forms ask the same ten things every time.', fields: [
    { k: 'hackathon/shirtSize', label: 'T-shirt size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { k: 'hackathon/dietary', label: 'Dietary restrictions', type: 'text', na: true },
    { k: 'hackathon/emergencyName', label: 'Emergency contact name', type: 'text' },
    { k: 'hackathon/emergencyRelation', label: 'Relationship', type: 'text' },
    { k: 'hackathon/emergencyPhone', label: 'Emergency contact phone', type: 'text' },
    { k: 'hackathon/devpost', label: 'Devpost username', type: 'text', na: true },
    { k: 'hackathon/discord', label: 'Discord handle', type: 'text', na: true },
    { k: 'hackathon/defaultTeammate', label: 'Default teammate', type: 'text', na: true },
    { k: 'hackathon/teamName', label: 'Default team name', type: 'text', na: true },
    { k: 'hackathon/count', label: 'Hackathons attended so far', type: 'text' },
    { k: 'hackathon/interests', label: 'What you like building', type: 'textarea' },
    { k: 'hackathon/age18', label: 'You are 18 or older', type: 'toggle' },
  ] },
  { id: 'extras', title: 'Letters & defaults', blurb: 'How the kit writes for you and the small defaults forms keep asking.', fields: [
    { k: 'languages', label: 'Languages you speak', type: 'text', help: 'e.g. English (fluent), Hindi (native).' },
    { k: 'certifications', label: 'Certifications', type: 'text', na: true },
    { k: 'coverLetterTone', label: 'Letter tone', type: 'select', options: ['Direct and confident', 'Warm and personable', 'Formal'] },
    { k: 'resumeAuthLine', label: 'Put a work-authorization line in the resume header', type: 'select', options: ['No (answer it on the form only)', 'Yes, matching my sponsorship answer'] },
    { k: 'howHeard', label: 'Default for "how did you hear about us"', type: 'select', options: ['Company website', 'LinkedIn', 'Job board', 'University / career fair', 'Referral', 'Other'] },
    { k: 'workedHereBefore', label: 'Default for "have you worked here before / been referred"', type: 'select', options: ['No, and no referral', 'Decide per application'] },
  ] },
];

export const ALL_FIELDS: (Field & { group: string })[] = GROUPS.flatMap((g) => g.fields.map((f) => ({ ...f, group: g.id })));
export const FIELD_BY_KEY: Record<string, Field> = Object.fromEntries(ALL_FIELDS.map((f) => [f.k, f]));
// The short list: what forms ask almost every time. Nothing in it is mandatory.
export const COMMON = ALL_FIELDS.filter((f) => f.req);
/** @deprecated kept for older imports; same as COMMON */
export const REQUIRED = COMMON;

export function getVal(obj: Record<string, unknown>, key: string): unknown {
  return key.split('/').reduce<unknown>((o, k) => (o && typeof o === 'object' && (o as Record<string, unknown>)[k] !== undefined ? (o as Record<string, unknown>)[k] : undefined), obj);
}
export function setVal(obj: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const parts = key.split('/');
  const out: Record<string, unknown> = { ...obj };
  let cur: Record<string, unknown> = out;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = { ...((cur[parts[i]] as Record<string, unknown>) || {}) };
    cur[parts[i]] = next;
    cur = next;
  }
  if (value === undefined) delete cur[parts[parts.length - 1]]; else cur[parts[parts.length - 1]] = value;
  return out;
}
export function isEmpty(v: unknown) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}
/** Unanswered = no answer at all. "Not sure yet" and "Not applicable" count as answered (the kit knows what to do with them). */
export function unanswered(a: Record<string, unknown>) {
  return COMMON.filter((f) => isEmpty(getVal(a, f.k)));
}
export function markedUnsure(a: Record<string, unknown>) {
  return ALL_FIELDS.filter((f) => isUnsure(getVal(a, f.k)));
}
export function howToFor(key: string) {
  const f = FIELD_BY_KEY[key];
  return (f && f.howTo) || 'Check the document or source that holds this fact before you submit.';
}

export type StdRow = { question: string; answer: string; source: 'bank' | 'needs-you' };

// Standard questions answered straight from the bank (no model involved).
// "Not sure yet" becomes a needs-you row that says how to find the answer; "Not applicable" says to leave the box blank.
export function standardAnswers(a: Record<string, unknown>): StdRow[] {
  const raw = (k: string) => getVal(a, k);
  const s = (k: string) => {
    const v = raw(k);
    if (isSentinel(v)) return '';
    if (v === true) return 'Yes';
    if (v === false) return 'No';
    if (Array.isArray(v)) return v.join(', ');
    return v === undefined || v === null ? '' : String(v);
  };
  const addr = [s('address/street'), s('address/city'), s('address/state'), s('address/postalCode'), s('address/country')].filter(Boolean).join(', ');
  const decline = s('eeoPolicy').startsWith('Decline');
  const rows: [string, string, string?][] = [
    ['Full legal name', [s('legalFirstName'), s('legalMiddleName'), s('legalLastName')].filter(Boolean).join(' ')],
    ['Preferred name', s('preferredName'), 'preferredName'],
    ['Pronouns', s('pronouns'), 'pronouns'],
    ['Email', s('email')],
    ['Phone', s('phone')],
    ['Address', addr],
    ['LinkedIn', s('linkedin'), 'linkedin'],
    ['GitHub', s('github'), 'github'],
    ['Portfolio / website', s('portfolioUrl'), 'portfolioUrl'],
    ['Country of citizenship', s('citizenshipCountry'), 'citizenshipCountry'],
    ['Legally authorized to work?', s('workAuthorizedUS'), 'workAuthorizedUS'],
    ['Will you require sponsorship now or in the future?', s('sponsorshipAnswer'), 'sponsorshipAnswer'],
    ['Current visa / work status', s('visaStatus'), 'visaStatus'],
    ['Work authorization valid until', s('workAuthValidTo'), 'workAuthValidTo'],
    ['Security clearance', s('securityClearance'), 'securityClearance'],
    ['Current school', s('educationDetails/gradSchool'), 'educationDetails/gradSchool'],
    ['Degree', s('educationDetails/gradDegree'), 'educationDetails/gradDegree'],
    ['Major', s('educationDetails/gradMajor'), 'educationDetails/gradMajor'],
    ['Graduation', s('educationDetails/gradEnd'), 'educationDetails/gradEnd'],
    ['GPA', s('educationDetails/gradGpa'), 'educationDetails/gradGpa'],
    ['Level of study', s('educationDetails/levelOfStudy'), 'educationDetails/levelOfStudy'],
    ['Undergraduate school / degree', [s('educationDetails/ugSchool'), s('educationDetails/ugDegree'), s('educationDetails/ugMajor')].filter(Boolean).join(' · ')],
    ['Available start date', s('startDate'), 'startDate'],
    ['Employment types', s('employmentTypes'), 'employmentTypes'],
    ['Work setting', s('workSetting'), 'workSetting'],
    ['Preferred locations', s('preferredLocations'), 'preferredLocations'],
    ['Willing to relocate?', s('relocate'), 'relocate'],
    ['Travel', s('travelPercent'), 'travelPercent'],
    ['Salary expectation (internship)', s('salaryInternHourly'), 'salaryInternHourly'],
    ['Salary expectation (full-time)', s('salaryFullTimeBase'), 'salaryFullTimeBase'],
    ['How did you hear about us?', s('howHeard'), 'howHeard'],
    ['Worked here before / referred?', s('workedHereBefore'), 'workedHereBefore'],
    ['Gender', decline ? 'Decline to self-identify' : s('gender'), 'gender'],
    ['Race / ethnicity', decline ? 'Decline to self-identify' : s('raceEthnicity'), 'raceEthnicity'],
    ['Veteran status', decline ? 'Decline to self-identify' : s('veteran'), 'veteran'],
    ['Disability status', decline ? 'Decline to self-identify' : s('disability'), 'disability'],
    ['Languages', s('languages'), 'languages'],
  ];
  const out: StdRow[] = [];
  for (const [question, answer, key] of rows) {
    const v = key ? raw(key) : undefined;
    if (key && isUnsure(v)) out.push({ question, answer: `Not sure yet. How to find it: ${howToFor(key)}`, source: 'needs-you' });
    else if (key && isNA(v)) out.push({ question, answer: 'Does not apply to you: leave the box blank, or choose "None" / "N/A" if the form insists.', source: 'bank' });
    else if (answer) out.push({ question, answer, source: 'bank' });
  }
  return out;
}
