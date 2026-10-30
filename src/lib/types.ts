export type SkillGroup = { label: string; items: string[] };
export type Experience = { id: string; title: string; org: string; location?: string; dates: string; bullets: string[] };
export type Project = { id: string; name: string; tech?: string; link?: string; bullets: string[] };
export type Award = { id: string; text: string };
export type Education = { degree: string; school: string; dates: string; detail?: string };
export type Contact = { location?: string; phone?: string; email?: string; linkedin?: string; github?: string; portfolio?: string; extra?: string };

export type MasterResume = {
  name: string;
  contact: Contact;
  summary: string;
  skills: SkillGroup[];
  experience: Experience[];
  projects: Project[];
  awards: Award[];
  education: Education[];
  certifications?: string[];
};

export type ResumeSpec = MasterResume & {
  headline?: string;
  order?: string[];
  headings?: Record<string, string>;
};

export type Posting = {
  source: string;
  text: string;
  company: string;
  title: string;
  kind: string;
  location?: string;
  workSetting?: string;
  deadline?: string;
  problem?: string;
  requirements: string[];
  keywords: string[];
  niceToHave: string[];
  questions: string[];
};

export type AnswerRow = { question: string; answer: string; source: 'bank' | 'resume' | 'drafted' | 'needs-you' };

export type AtsReport = {
  pass: boolean;
  issues: string[];
  warnings: string[];
  pages: number;
  coverage: number | null;
  present: string[];
  missing: string[];
  mustMissing: string[];
};

export type Kit = {
  id: string;
  createdAt: number;
  posting: Posting;
  spec: ResumeSpec;
  changeLog: string[];
  guardNotes: string[];
  letter?: { subject: string; paragraphs: string[] };
  answers: AnswerRow[];
  ats?: AtsReport;
  fontSize?: number;
  dropped?: string[];
};

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'custom';
export type Settings = { provider: Provider; apiKey: string; model: string; baseUrl: string };

export type Answers = Record<string, unknown>;
