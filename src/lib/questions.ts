// The answer bank: everything application forms keep asking, answered once.
export type FieldType = 'text' | 'textarea' | 'select' | 'toggle' | 'multi' | 'date' | 'month';
export type Field = { k: string; label: string; type: FieldType; req?: boolean; options?: string[]; help?: string };
export type Group = { id: string; title: string; blurb: string; fields: Field[] };

export const GROUPS: Group[] = [
  { id: 'identity', title: 'Who you are', blurb: 'Exactly what goes into the name, contact and link boxes.', fields: [
    { k: 'legalFirstName', label: 'Legal first name', type: 'text', req: true },
    { k: 'legalMiddleName', label: 'Middle name (as on your ID)', type: 'text' },
    { k: 'legalLastName', label: 'Legal last name', type: 'text', req: true },
    { k: 'preferredName', label: 'Preferred name', type: 'text' },
    { k: 'pronouns', label: 'Pronouns', type: 'select', options: ['She/Her', 'He/Him', 'They/Them', 'Prefer not to say'] },
    { k: 'email', label: 'Email for applications', type: 'text', req: true },
    { k: 'phone', label: 'Phone', type: 'text', req: true },
    { k: 'address/street', label: 'Street address', type: 'text' },
    { k: 'address/city', label: 'City', type: 'text', req: true },
    { k: 'address/state', label: 'State / region', type: 'text' },
    { k: 'address/postalCode', label: 'ZIP / postal code', type: 'text' },
    { k: 'address/country', label: 'Country', type: 'text', req: true },
    { k: 'linkedin', label: 'LinkedIn URL', type: 'text' },
    { k: 'github', label: 'GitHub URL', type: 'text' },
    { k: 'portfolioUrl', label: 'Portfolio / website URL', type: 'text' },
    { k: 'citizenshipCountry', label: 'Country of citizenship', type: 'text', req: true },
    { k: 'dateOfBirth', label: 'Date of birth', type: 'date', help: 'Only for age checks. Leave empty if you prefer.' },
  ] },
  { id: 'work', title: 'Work authorization', blurb: 'The questions that decide whether an application is considered at all. Answer truthfully; the kit repeats them verbatim.', fields: [
    { k: 'workAuthorizedUS', label: '"Are you legally authorized to work in this country?"', type: 'select', req: true, options: ['Yes', 'No'] },
    { k: 'sponsorshipAnswer', label: '"Will you now or in the future require visa sponsorship?"', type: 'select', req: true, options: ['No', 'Yes, in the future', 'Yes, now'], help: 'If you are on a student or temporary visa, "Yes, in the future" is usually the truthful answer.' },
    { k: 'visaStatus', label: 'Current status (e.g. citizen, permanent resident, F-1 on OPT, H-1B)', type: 'text', req: true },
    { k: 'workAuthValidTo', label: 'Authorization valid until (if time-limited)', type: 'date' },
    { k: 'securityClearance', label: 'Security clearance', type: 'select', options: ['None', 'Public Trust', 'Secret', 'Top Secret'] },
    { k: 'backgroundCheckConsent', label: 'Consent to background checks when a form asks', type: 'toggle' },
  ] },
  { id: 'education', title: 'Education', blurb: 'Every school box, exactly as forms want it.', fields: [
    { k: 'educationDetails/gradSchool', label: 'Most recent / current school', type: 'text', req: true },
    { k: 'educationDetails/gradDegree', label: 'Degree (e.g. Master of Science)', type: 'text', req: true },
    { k: 'educationDetails/gradMajor', label: 'Major / program', type: 'text' },
    { k: 'educationDetails/gradStart', label: 'Start', type: 'month' },
    { k: 'educationDetails/gradEnd', label: 'Graduation (actual or expected)', type: 'month', req: true },
    { k: 'educationDetails/gradGpa', label: 'GPA', type: 'text' },
    { k: 'educationDetails/levelOfStudy', label: 'Level of study', type: 'select', options: ['Graduate (Master\'s)', 'Undergraduate', 'PhD', 'Graduated / not a student'] },
    { k: 'educationDetails/schoolEmail', label: 'School (.edu) email', type: 'text' },
    { k: 'educationDetails/ugSchool', label: 'Undergraduate school', type: 'text' },
    { k: 'educationDetails/ugDegree', label: 'Undergraduate degree', type: 'text' },
    { k: 'educationDetails/ugMajor', label: 'Undergraduate major', type: 'text' },
    { k: 'educationDetails/ugEnd', label: 'Undergraduate graduation', type: 'month' },
    { k: 'educationDetails/ugGpa', label: 'Undergraduate GPA', type: 'text' },
  ] },
  { id: 'availability', title: 'Availability & preferences', blurb: 'Start dates, setting, pay.', fields: [
    { k: 'startDate', label: 'What to say for "available start date"', type: 'text', req: true, help: 'e.g. Immediately, or June 2027.' },
    { k: 'internshipSeasons', label: 'Internship seasons you want', type: 'multi', options: ['Now (part-time)', 'Spring 2027', 'Summer 2027', 'Fall 2027', 'Not looking for internships'] },
    { k: 'hoursDuringSemester', label: 'Hours per week during the semester', type: 'select', options: ['Up to 20', 'Up to 10', 'Full-time', 'Not during the semester'] },
    { k: 'employmentTypes', label: 'Types you will accept', type: 'multi', options: ['Internship', 'Full-time', 'Part-time', 'Contract', 'Fellowship'] },
    { k: 'workSetting', label: 'Work setting', type: 'select', req: true, options: ['Any (remote, hybrid or on-site)', 'Remote only', 'Hybrid or remote', 'On-site is fine'] },
    { k: 'preferredLocations', label: 'Preferred locations', type: 'text', req: true },
    { k: 'relocate', label: 'Willing to relocate', type: 'toggle' },
    { k: 'travelPercent', label: 'Travel you accept', type: 'select', options: ['None', 'Up to 25%', 'Up to 50%', 'Any'] },
    { k: 'salaryInternHourly', label: 'Internship pay you ask for (hourly)', type: 'text' },
    { k: 'salaryFullTimeBase', label: 'Full-time base you ask for (annual)', type: 'text' },
    { k: 'salaryPolicy', label: 'When a salary box is optional', type: 'select', options: ['Leave it blank', 'Write "Negotiable"', 'Give my range'] },
  ] },
  { id: 'eeo', title: 'Voluntary self-identification', blurb: 'The EEO questions at the end of US forms.', fields: [
    { k: 'eeoPolicy', label: 'How to handle these sections', type: 'select', req: true, options: ['Answer with the values below', 'Decline to self-identify everywhere'] },
    { k: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male', 'Non-binary', 'Decline to self-identify'] },
    { k: 'raceEthnicity', label: 'Race / ethnicity', type: 'select', options: ['Asian (Not Hispanic or Latino)', 'Hispanic or Latino', 'White (Not Hispanic or Latino)', 'Black or African American', 'Native American or Alaska Native', 'Native Hawaiian or Pacific Islander', 'Two or more races', 'Decline to self-identify'] },
    { k: 'veteran', label: 'Veteran status', type: 'select', options: ['I am not a protected veteran', 'I am a protected veteran', 'Decline to self-identify'] },
    { k: 'disability', label: 'Disability status', type: 'select', options: ['No, I do not have a disability', 'Yes, I have a disability (or previously had one)', 'Decline to self-identify'] },
  ] },
  { id: 'hackathon', title: 'Hackathons & events', blurb: 'Registration forms ask the same ten things every time.', fields: [
    { k: 'hackathon/shirtSize', label: 'T-shirt size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { k: 'hackathon/dietary', label: 'Dietary restrictions', type: 'text' },
    { k: 'hackathon/emergencyName', label: 'Emergency contact name', type: 'text' },
    { k: 'hackathon/emergencyRelation', label: 'Relationship', type: 'text' },
    { k: 'hackathon/emergencyPhone', label: 'Emergency contact phone', type: 'text' },
    { k: 'hackathon/devpost', label: 'Devpost username', type: 'text' },
    { k: 'hackathon/discord', label: 'Discord handle', type: 'text' },
    { k: 'hackathon/defaultTeammate', label: 'Default teammate', type: 'text' },
    { k: 'hackathon/teamName', label: 'Default team name', type: 'text' },
    { k: 'hackathon/count', label: 'Hackathons attended so far', type: 'text' },
    { k: 'hackathon/interests', label: 'What you like building', type: 'textarea' },
    { k: 'hackathon/age18', label: 'You are 18 or older', type: 'toggle' },
  ] },
  { id: 'extras', title: 'Letters & defaults', blurb: 'How the kit writes for you and the small defaults forms keep asking.', fields: [
    { k: 'languages', label: 'Languages you speak', type: 'text' },
    { k: 'certifications', label: 'Certifications', type: 'text' },
    { k: 'coverLetterTone', label: 'Letter tone', type: 'select', options: ['Direct and confident', 'Warm and personable', 'Formal'] },
    { k: 'resumeAuthLine', label: 'Put a work-authorization line in the resume header', type: 'select', options: ['No (answer it on the form only)', 'Yes, matching my sponsorship answer'] },
    { k: 'howHeard', label: 'Default for "how did you hear about us"', type: 'select', options: ['Company website', 'LinkedIn', 'Job board', 'University / career fair', 'Referral', 'Other'] },
    { k: 'workedHereBefore', label: 'Default for "have you worked here before / been referred"', type: 'select', options: ['No, and no referral', 'Decide per application'] },
  ] },
];

export const REQUIRED = GROUPS.flatMap((g) => g.fields.filter((f) => f.req).map((f) => ({ ...f, group: g.id })));

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
  cur[parts[parts.length - 1]] = value;
  return out;
}
export function isEmpty(v: unknown) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

// Standard questions answered straight from the bank (no model involved).
export function standardAnswers(a: Record<string, unknown>): { question: string; answer: string }[] {
  const s = (k: string) => {
    const v = getVal(a, k);
    if (v === true) return 'Yes';
    if (v === false) return 'No';
    if (Array.isArray(v)) return v.join(', ');
    return v === undefined || v === null ? '' : String(v);
  };
  const addr = [s('address/street'), s('address/city'), s('address/state'), s('address/postalCode'), s('address/country')].filter(Boolean).join(', ');
  const decline = s('eeoPolicy').startsWith('Decline');
  const rows: [string, string][] = [
    ['Full legal name', [s('legalFirstName'), s('legalMiddleName'), s('legalLastName')].filter(Boolean).join(' ')],
    ['Preferred name', s('preferredName')],
    ['Pronouns', s('pronouns')],
    ['Email', s('email')],
    ['Phone', s('phone')],
    ['Address', addr],
    ['LinkedIn', s('linkedin')],
    ['GitHub', s('github')],
    ['Portfolio / website', s('portfolioUrl')],
    ['Country of citizenship', s('citizenshipCountry')],
    ['Legally authorized to work?', s('workAuthorizedUS')],
    ['Will you require sponsorship now or in the future?', s('sponsorshipAnswer')],
    ['Current visa / work status', s('visaStatus')],
    ['Security clearance', s('securityClearance')],
    ['Current school', s('educationDetails/gradSchool')],
    ['Degree', s('educationDetails/gradDegree')],
    ['Major', s('educationDetails/gradMajor')],
    ['Graduation', s('educationDetails/gradEnd')],
    ['GPA', s('educationDetails/gradGpa')],
    ['Level of study', s('educationDetails/levelOfStudy')],
    ['Undergraduate school / degree', [s('educationDetails/ugSchool'), s('educationDetails/ugDegree'), s('educationDetails/ugMajor')].filter(Boolean).join(' · ')],
    ['Available start date', s('startDate')],
    ['Employment types', s('employmentTypes')],
    ['Work setting', s('workSetting')],
    ['Preferred locations', s('preferredLocations')],
    ['Willing to relocate?', s('relocate')],
    ['Travel', s('travelPercent')],
    ['Salary expectation (internship)', s('salaryInternHourly')],
    ['Salary expectation (full-time)', s('salaryFullTimeBase')],
    ['How did you hear about us?', s('howHeard')],
    ['Worked here before / referred?', s('workedHereBefore')],
    ['Gender', decline ? 'Decline to self-identify' : s('gender')],
    ['Race / ethnicity', decline ? 'Decline to self-identify' : s('raceEthnicity')],
    ['Veteran status', decline ? 'Decline to self-identify' : s('veteran')],
    ['Disability status', decline ? 'Decline to self-identify' : s('disability')],
    ['Languages', s('languages')],
  ];
  return rows.filter(([, v]) => v).map(([question, answer]) => ({ question, answer }));
}
