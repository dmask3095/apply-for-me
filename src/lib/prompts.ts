import type { MasterResume, Posting } from './types';

export const SYSTEM = [
  'You are a careful job-application assistant working for one candidate.',
  'You only use facts present in the candidate material you are given (master resume, answer bank). Never invent employers, titles, dates, degrees, numbers, tools, certifications, awards, motivations or personal stories.',
  'Numbers must be copied verbatim from the master resume. When unsure, leave it out.',
  'Write plainly and specifically. No filler, no "I am excited", no generic praise.',
  'Output strict JSON only, no prose, no code fences.',
].join(' ');

export function structurePrompt(text: string) {
  return `Convert this resume text into JSON with EXACTLY this shape (keep every fact, do not add any):
{"name": string in Title Case, "contact": {"location"?, "phone"?, "email"?, "linkedin"?, "github"?, "portfolio"?},
 "summary": string, "skills": [{"label": string, "items": [string]}],
 "experience": [{"id": "exp1"..., "title", "org", "location"?, "dates", "bullets": [string]}],
 "projects": [{"id": "proj1"..., "name", "tech"?, "link"?, "bullets": [string]}],
 "awards": [{"id": "aw1"..., "text": string}], "education": [{"degree", "school", "dates", "detail"?}], "certifications": [string]}
Rules: newest first; keep bullet wording as written; ids are sequential strings; empty arrays when a section is absent.

RESUME TEXT:
${text.slice(0, 20000)}`;
}

export function analyzePrompt(text: string) {
  return `Analyze this job / internship / fellowship / hackathon posting and return JSON:
{"company": string, "title": string, "kind": "job"|"internship"|"fellowship"|"hackathon"|"competition"|"program"|"other",
 "location": string, "workSetting": "remote"|"hybrid"|"on-site"|"unknown", "deadline": string|null, "postedDate": string|null,
 "problem": one sentence on what this team/company is actually trying to do (from the text only),
 "requirements": [the 5-10 hard requirements, each a short phrase],
 "keywords": [15-30 exact terms a recruiter would type into a resume search: skills, tools, languages, frameworks, methods, certifications and role nouns, as written in the posting. Exclude company descriptions, product names the candidate could not have used, perks and generic words],
 "niceToHave": [short phrases], "questions": [every application question or essay prompt that appears in the text, verbatim],
 "knockouts": [eligibility rules stated in the text: work authorization, degree, location, clearance, years, citizenship]}

POSTING:
${text.slice(0, 24000)}`;
}

export function tailorPrompt(master: MasterResume, posting: Posting, answersSummary: string) {
  return `Tailor the candidate's resume to this posting. Return JSON:
{"fit": {"verdict": "apply"|"stretch"|"skip", "reason": one sentence,
         "met": [requirements the master resume clearly supports], "stretch": [requirements partially supported], "missing": [requirements with no support],
         "knockouts": [{"rule": string, "candidate": what the answer bank says, "ok": boolean}]},
 "headline": the posted job title (plus one true qualifier at most),
 "summary": 2-3 sentences, present tense, with 2-3 exact terms from the posting and at least one number copied from the master,
 "skills": [{"label": a category name using the posting's vocabulary, "items": [only skills that appear in the master resume, most relevant first]}],
 "experience": [{"id": master experience id, "bullets": [1-3 bullets, rephrased in the posting's language, numbers verbatim; most relevant first; older roles may keep 1]}],
 "projects": [{"id": master project id, "bullets": [1-2 bullets]}]   (2-3 projects, most relevant first),
 "awards": [master award ids worth keeping, max 3],
 "changeLog": [one line per meaningful change: what changed and why, e.g. "Summary: led with Databricks + SQL because the posting lists them as required"],
 "followUpNote": a 2-3 sentence follow-up message to send 5-7 days after applying: states the date placeholder {date}, reiterates interest in the exact role, and names ONE specific thing from the master that matches the posting}
Rules: an answer-bank value of "Not sure yet" means unanswered: set that knockout's ok to false and candidate to "Not sure yet", never assume. "Not applicable" means the box is left blank. Never introduce a tool, number, employer, title or date that is not in the master. Use the posting's exact wording for terms the candidate genuinely has (write the acronym and the spelled-out form once if the posting does). Keep every employer; keep education untouched (it is copied from the master).

ANSWER BANK (for knockouts): ${answersSummary}

POSTING (structured): ${JSON.stringify({ company: posting.company, title: posting.title, kind: posting.kind, requirements: posting.requirements, keywords: posting.keywords, niceToHave: posting.niceToHave, problem: posting.problem, location: posting.location, workSetting: posting.workSetting })}

MASTER RESUME: ${JSON.stringify(master)}`;
}

export function writingPrompt(master: MasterResume, posting: Posting, tone: string, answersSummary: string, standardRows: string) {
  return `Write the application text for this candidate. Return JSON:
{"letter": {"subject": "Application for <title>", "paragraphs": [4 paragraphs, 180-250 words total]},
 "answers": [{"question": string, "answer": string, "source": "bank"|"resume"|"drafted"|"needs-you"}]}
Letter rules (tone: ${tone}): paragraph 1 names the role and the company's actual problem from the posting in one or two sentences; paragraphs 2-3 connect two concrete things from the master resume (with their real numbers) to the posting's requirements; paragraph 4 states availability from the answer bank and a plain closing. No "I am excited", no flattery, no invented stories. Recruiters reject letters that do not connect experience to the role or that show the posting was not read; write for that reader.
Answers: for EACH question in the posting's question list, write the answer the candidate would give. Short-answer and "why us / why this role" questions: 60-150 words, specific, from the master and the posting. If a question needs a fact that is not in the master or the answer bank (a personal story, a preference, a number, a date), set source "needs-you" and put a one-line note of what is needed and where the candidate can look it up as the answer. If the answer bank says "Not sure yet" for a fact the question needs, that is also "needs-you". Never write "N/A" as an answer to a free-text question.
Also add rows for any screening question implied by the posting's knockouts, answered from the answer bank (source "bank").

ANSWER BANK: ${answersSummary}
STANDARD ANSWERS ALREADY AVAILABLE (do not repeat these): ${standardRows}
POSTING: ${JSON.stringify({ company: posting.company, title: posting.title, kind: posting.kind, problem: posting.problem, requirements: posting.requirements, questions: posting.questions, keywords: posting.keywords.slice(0, 15) })}
MASTER RESUME: ${JSON.stringify(master)}`;
}
