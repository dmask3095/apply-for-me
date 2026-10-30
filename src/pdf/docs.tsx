import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { ResumeSpec } from '../lib/types';
import { pdfText } from '../lib/ats';

const HEADINGS: Record<string, string> = { summary: 'PROFESSIONAL SUMMARY', skills: 'SKILLS', experience: 'PROFESSIONAL EXPERIENCE', projects: 'SELECTED PROJECTS', awards: 'AWARDS & COMPETITIONS', education: 'EDUCATION', certifications: 'CERTIFICATIONS' };
const ORDER = ['summary', 'skills', 'experience', 'projects', 'awards', 'education', 'certifications'];

const clean = (s: unknown) => String(s ?? '').replace(/\u2014/g, '-').replace(/\u2013/g, '-').replace(/\s+/g, ' ').trim();

function styles(fs: number) {
  return StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: fs, lineHeight: 1.25, paddingTop: 32, paddingBottom: 30, paddingHorizontal: 36, color: '#000' },
    name: { fontFamily: 'Helvetica-Bold', fontSize: fs * 1.7, textAlign: 'center', letterSpacing: 0.5 },
    headline: { fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 2 },
    contact: { textAlign: 'center', marginTop: 2, marginBottom: 6 },
    h2: { fontFamily: 'Helvetica-Bold', fontSize: fs, letterSpacing: 0.6, borderBottomWidth: 0.8, borderBottomColor: '#000', paddingBottom: 1, marginTop: 7, marginBottom: 3 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
    bold: { fontFamily: 'Helvetica-Bold' },
    li: { flexDirection: 'row', marginTop: 1 },
    dot: { width: 9 },
    liText: { flex: 1 },
    p: { marginBottom: 2 },
  });
}

function Bullets({ items, st }: { items: string[]; st: ReturnType<typeof styles> }) {
  return (
    <View>
      {items.map((b, i) => (
        <View key={i} style={st.li}><Text style={st.dot}>•</Text><Text style={st.liText}>{clean(b)}</Text></View>
      ))}
    </View>
  );
}

export function ResumeDoc({ spec, fontSize }: { spec: ResumeSpec; fontSize: number }) {
  const st = styles(fontSize);
  const c = spec.contact || {};
  const contact = [c.location, c.phone, c.email, c.linkedin, c.github, c.portfolio, c.extra].filter(Boolean).map(clean).join('  |  ');
  const heads = { ...HEADINGS, ...(spec.headings || {}) };
  const order = spec.order || ORDER;
  return (
    <Document title={`${spec.name} Resume`} author={spec.name}>
      <Page size="LETTER" style={st.page}>
        <Text style={st.name}>{clean(spec.name).toUpperCase()}</Text>
        {spec.headline ? <Text style={st.headline}>{clean(spec.headline)}</Text> : null}
        <Text style={st.contact}>{contact}</Text>
        {order.map((key) => {
          if (key === 'summary' && spec.summary) return <View key={key}><Text style={st.h2}>{heads.summary}</Text><Text style={st.p}>{clean(spec.summary)}</Text></View>;
          if (key === 'skills' && spec.skills?.length) return (
            <View key={key}><Text style={st.h2}>{heads.skills}</Text>
              {spec.skills.map((g, i) => <Text key={i} style={st.p}><Text style={st.bold}>{clean(g.label)}: </Text>{g.items.map(clean).join(', ')}</Text>)}
            </View>
          );
          if (key === 'experience' && spec.experience?.length) return (
            <View key={key}><Text style={st.h2}>{heads.experience}</Text>
              {spec.experience.map((e) => (
                <View key={e.id}>
                  <View style={st.row}><Text><Text style={st.bold}>{clean(e.title)}</Text> | {clean(e.org)}{e.location ? `, ${clean(e.location)}` : ''}</Text><Text>{clean(e.dates)}</Text></View>
                  <Bullets items={e.bullets} st={st} />
                </View>
              ))}
            </View>
          );
          if (key === 'projects' && spec.projects?.length) return (
            <View key={key}><Text style={st.h2}>{heads.projects}</Text>
              {spec.projects.map((p) => (
                <View key={p.id}>
                  <View style={st.row}><Text><Text style={st.bold}>{clean(p.name)}</Text>{p.tech ? ` - ${clean(p.tech)}` : ''}{p.link ? ` | ${clean(p.link)}` : ''}</Text></View>
                  <Bullets items={p.bullets} st={st} />
                </View>
              ))}
            </View>
          );
          if (key === 'awards' && spec.awards?.length) return <View key={key}><Text style={st.h2}>{heads.awards}</Text><Bullets items={spec.awards.map((a) => a.text)} st={st} /></View>;
          if (key === 'education' && spec.education?.length) return (
            <View key={key}><Text style={st.h2}>{heads.education}</Text>
              {spec.education.map((ed, i) => (
                <View key={i}>
                  <View style={st.row}><Text><Text style={st.bold}>{clean(ed.degree)}</Text> | {clean(ed.school)}</Text><Text>{clean(ed.dates)}</Text></View>
                  {ed.detail ? <Text style={st.p}>{clean(ed.detail)}</Text> : null}
                </View>
              ))}
            </View>
          );
          if (key === 'certifications' && spec.certifications?.length) return <View key={key}><Text style={st.h2}>{heads.certifications}</Text><Bullets items={spec.certifications} st={st} /></View>;
          return null;
        })}
      </Page>
    </Document>
  );
}

export function LetterDoc({ name, contact, date, subject, paragraphs, fontSize }: { name: string; contact: string; date: string; subject: string; paragraphs: string[]; fontSize: number }) {
  const st = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize, lineHeight: 1.45, paddingTop: 64, paddingBottom: 60, paddingHorizontal: 72, color: '#000' },
    name: { fontFamily: 'Helvetica-Bold', fontSize: fontSize * 1.5 },
    meta: { marginTop: 2, marginBottom: 14 },
    p: { marginBottom: 9 },
    bold: { fontFamily: 'Helvetica-Bold' },
  });
  return (
    <Document title={subject} author={name}>
      <Page size="LETTER" style={st.page}>
        <Text style={st.name}>{clean(name)}</Text>
        <Text style={st.meta}>{contact}</Text>
        <Text style={st.p}>{date}</Text>
        <Text style={[st.p, st.bold]}>{clean(subject)}</Text>
        {paragraphs.map((p, i) => <Text key={i} style={st.p}>{clean(p)}</Text>)}
        <Text style={st.p}>Sincerely,</Text>
        <Text>{clean(name)}</Text>
      </Page>
    </Document>
  );
}

async function pages(blob: Blob) {
  const { pages } = await pdfText(await blob.arrayBuffer());
  return pages;
}

export async function renderResume(spec: ResumeSpec): Promise<{ blob: Blob; fontSize: number; dropped: string[]; pages: number }> {
  const work: ResumeSpec = JSON.parse(JSON.stringify(spec));
  const dropped: string[] = [];
  const sizes = [10.5, 10, 9.6, 9.2];
  for (let round = 0; round < 8; round++) {
    for (const fs of sizes) {
      const blob = await pdf(<ResumeDoc spec={work} fontSize={fs} />).toBlob();
      const n = await pages(blob);
      if (n === 1) return { blob, fontSize: fs, dropped, pages: 1 };
    }
    if ((work.projects || []).length > 2) { dropped.push('project: ' + work.projects.pop()!.name); continue; }
    if ((work.awards || []).length > 2) { dropped.push('award: ' + work.awards.pop()!.text.slice(0, 50)); continue; }
    for (const e of work.experience) if (e.bullets.length > 1) { e.bullets.pop(); dropped.push('a bullet under ' + e.org); break; }
  }
  const blob = await pdf(<ResumeDoc spec={work} fontSize={8.8} />).toBlob();
  return { blob, fontSize: 8.8, dropped, pages: await pages(blob) };
}

export async function renderLetter(args: { name: string; contact: string; date: string; subject: string; paragraphs: string[] }): Promise<Blob> {
  for (const fs of [11, 10.5, 10]) {
    const blob = await pdf(<LetterDoc {...args} fontSize={fs} />).toBlob();
    if ((await pages(blob)) === 1) return blob;
  }
  return pdf(<LetterDoc {...args} fontSize={9.5} />).toBlob();
}
