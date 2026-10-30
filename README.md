# Apply for me

**Paste a job posting. Get everything you need to apply well, in about 15 seconds.**

- **Fit check** first: which requirements you meet, which you stretch, which you miss, and the knockout questions (work authorization, degree, location) with your answers, because that is how recruiters actually auto-reject, not resume formatting.
- **A one-page resume in the job's own words**, built *only* from facts in your stored resume. A fact guard blocks any number, employer, date or tool the model did not get from you. Rendered as real text (Helvetica, single column, standard headings) so every parser reads it, then re-parsed and scored for keyword coverage against the posting.
- **A cover letter** that connects two things you did to what the team needs. Recruiters expect one and reject on them, so it is written for that reader.
- **Every answer the form will ask** (name, address, authorization, sponsorship, school, start date, EEO, plus the posting's own questions), answered from an answer bank you fill once. Anything the model cannot answer truthfully is marked *needs you*, never guessed.
- **Autofill bookmarklet**: drag it to your bookmarks bar, open the application, click. Common fields on Greenhouse, Lever, Ashby, Workday and friends fill from your answers. You still click Submit.
- **Follow-up note** for day 6, and a simple tracker (Applied, Heard back, Interview, Offer).

Everything runs in your browser. Your resume, answers and kits live in `localStorage`; the only network calls are to the model provider you choose with your own key (OpenAI, Anthropic, Gemini, or any OpenAI-compatible endpoint) and, if you paste a link instead of text, to the public reader `r.jina.ai` which sees the URL only. No account, no server, no tracking.

## Use it

Hosted, no account needed:

- **https://apply-for-me-virid.vercel.app** (Vercel, auto-deploys from `main`)
- **https://dmask3095.github.io/apply-for-me/** (GitHub Pages mirror)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dmask3095/apply-for-me)

Locally:

```bash
npm install
npm run dev
```

Then open **Settings** and add a key. *Check key & list models* fetches the models your key can use and recommends a cheap, current one (Gemini Flash, an OpenAI "mini", Claude Sonnet); any model that returns JSON works.

### Why do I need an API key?

There is no server. Reading your resume, checking fit and writing the letter are done by a language model, and whoever calls the model pays for it. With your own key the browser talks to the provider directly: your resume goes only there, never to whoever hosts this page, and the cost is roughly one to three cents per application (or nothing on Google Gemini's free tier, which needs no card). Everything that is not AI (PDF, ATS check, answer sheet, autofill, tracker) works without a key.

### Nothing is mandatory

Every profile question can be marked **Not sure yet** or **Not applicable**. The kit never guesses: when a form actually needs one of those answers, the row is flagged *needs you* and says exactly where to find the real answer (EAD card, I-20, transcript, posted pay range, levels.fyi...). Autofill never types a placeholder into a form.

1. **Your profile**: paste your resume text (or drop the PDF) and press *Read my resume*. Answer the short list of questions every form asks.
2. **Paste a job**: text or link. Press *Build my kit*.
3. **Your kit**: fit check, resume PDF, letter PDF, answers, autofill, follow-up.

## Why it is built this way (the research behind the defaults)

- Recruiters surveyed in 2025 (Enhancv, 25 corporate recruiters; Source-to-Match, 100+ recruiters) report that ATS software does **not** auto-reject on formatting; **knockout questions** do, and recruiters **search by exact terms**. So the kit leads with the knockouts and writes in the posting's vocabulary, in context, without stuffing. Parsing failures that do hide resumes: multi-column layouts, contact details in headers/footers, images, non-standard headings. The PDF here avoids all four.
- Eye-tracking (Ladders, 2018): recruiters spend about 7 seconds on a first pass and look at name, current and previous titles, dates and education; simple layouts with bold titles and bullets win; small cramped fonts lose. The resume keeps those six data points in the expected places and shrinks content before it shrinks the font.
- Zety's 2024/25 recruiter survey (753 recruiters): 89% expect a cover letter, 81% have rejected on one; 89% discount resumes without measurable results; 76% reject for exaggeration. Hence the letter, the insistence on numbers copied verbatim, and the fact guard.
- Timing: on Dice.com, 45% of all applications arrive within 48 hours of posting (Davis & Samaniego de la Parra, NBER 2024); a tracked 200-application search saw response rates fall from 31% within 24 hours to 2% after day 10, and a 27.5% reply rate on 5-7 day follow-ups. The kit shows posting age and drafts the follow-up.
- Auto-apply tools that submit without preview get flagged for mismatched applications and can get accounts banned; browser-extension autofill with a human on Submit is the model that reviewers trust. This kit never submits for you.

## Stack

Vite, React, TypeScript, Tailwind, `@react-pdf/renderer` for real-text PDFs, `pdfjs-dist` to re-parse them the way an ATS would. MIT.
