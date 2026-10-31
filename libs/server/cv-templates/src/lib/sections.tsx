import { Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

import type { CvPdfLayoutInput } from 'contracts';

import {
  localePdfBodyFontFamily,
  localePdfBoldStyle,
} from 'server-pdf/locale-fonts';

import { CV_LABELS, formatCvLanguage, formatCvRange } from './labels';

export const pdfBody = localePdfBodyFontFamily();

/** Phone, email (unless hidden) and city on one line, whichever exist. */
export function contactLine(layout: CvPdfLayoutInput): string {
  const email = layout.profile.showEmail ? layout.email : null;
  return [layout.phone, email, layout.cityLine].filter(Boolean).join(' · ');
}

/** A job description: lines starting with "-" or "•" become bullets. */
export function DescriptionText({ text }: { text: string }): ReactElement {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <View style={{ marginTop: 2 }}>
      {lines.map((line, i) => {
        const bullet = /^[-•]\s*/.exec(line);
        return (
          <Text key={i} style={{ fontFamily: pdfBody, fontSize: 9 }}>
            {bullet ? `• ${line.slice(bullet[0].length)}` : line}
          </Text>
        );
      })}
    </View>
  );
}

/** "O meni" under the header, when the candidate wrote one. */
export function SummarySection({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement | null {
  if (!layout.profile.summary) return null;
  return (
    <View>
      <SectionTitle>{CV_LABELS[layout.locale].summary}</SectionTitle>
      <Text style={{ fontFamily: pdfBody, fontSize: 9 }}>
        {layout.profile.summary}
      </Text>
    </View>
  );
}

/** Languages, driving licence, certificates, digital skills and links. */
export function ExtraSections({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement {
  const labels = CV_LABELS[layout.locale];
  const { languages, drivingLicences, certificates, digitalSkills, links } =
    layout.profile;
  const line = { fontFamily: pdfBody, fontSize: 9 };
  return (
    <>
      {languages.length ? (
        <View wrap={false}>
          <SectionTitle>{labels.languages}</SectionTitle>
          {languages.map((l, i) => (
            <Text key={i} style={line}>
              {formatCvLanguage(l.name, l.level, layout.locale)}
            </Text>
          ))}
        </View>
      ) : null}
      {drivingLicences.length ? (
        <View wrap={false}>
          <SectionTitle>{labels.drivingLicence}</SectionTitle>
          <Text style={line}>{drivingLicences.join(', ')}</Text>
        </View>
      ) : null}
      {certificates.length ? (
        <View wrap={false}>
          <SectionTitle>{labels.certificates}</SectionTitle>
          {certificates.map((c, i) => (
            <Text key={i} style={line}>
              {[c.name, c.issuer].filter(Boolean).join(', ')}
              {c.year ? ` (${c.year})` : ''}
            </Text>
          ))}
        </View>
      ) : null}
      {digitalSkills ? (
        <View wrap={false}>
          <SectionTitle>{labels.digitalSkills}</SectionTitle>
          <Text style={line}>{digitalSkills}</Text>
        </View>
      ) : null}
      {links.length ? (
        <View wrap={false}>
          <SectionTitle>{labels.links}</SectionTitle>
          {links.map((l, i) => (
            <Text key={i} style={line}>
              {l.label}: {l.url}
            </Text>
          ))}
        </View>
      ) : null}
    </>
  );
}

export function SectionTitle({ children }: { children: string }): ReactElement {
  return (
    <Text
      style={localePdfBoldStyle({
        fontSize: 11,
        marginTop: 10,
        marginBottom: 4,
      })}
    >
      {children}
    </Text>
  );
}

export function HeaderBlock({
  layout,
  nameSize,
}: {
  layout: CvPdfLayoutInput;
  nameSize: number;
}): ReactElement {
  const contact = contactLine(layout);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={localePdfBoldStyle({ fontSize: nameSize })}>
        {layout.fullName ?? 'CV'}
      </Text>
      {layout.headline ? (
        <Text
          style={{
            fontFamily: pdfBody,
            fontSize: 10,
            marginTop: 2,
            color: '#2d3748',
          }}
        >
          {layout.headline}
        </Text>
      ) : null}
      {contact ? (
        <Text
          style={{
            fontFamily: pdfBody,
            fontSize: 9,
            marginTop: 4,
            color: '#4a5568',
          }}
        >
          {contact}
        </Text>
      ) : null}
    </View>
  );
}

/** Experience, education and skills in one column (Moderan, Minimalan). */
export function BodySections({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement {
  const labels = CV_LABELS[layout.locale];
  const { experiences, education, skills } = layout.profile;
  return (
    <>
      {experiences.length ? (
        <View>
          <SectionTitle>{labels.experience}</SectionTitle>
          {experiences.map((ex, i) => (
            <View key={i} style={{ marginBottom: 6 }} wrap={false}>
              <Text style={localePdfBoldStyle({ fontSize: 10 })}>
                {ex.title} · {ex.company}
              </Text>
              <Text
                style={{ fontFamily: pdfBody, fontSize: 8, color: '#4a5568' }}
              >
                {formatCvRange(ex.startDate, ex.endDate, layout.locale)}
              </Text>
              {ex.summary ? <DescriptionText text={ex.summary} /> : null}
            </View>
          ))}
        </View>
      ) : null}
      {education.length ? (
        <View>
          <SectionTitle>{labels.education}</SectionTitle>
          {education.map((ed, i) => (
            <View key={i} style={{ marginBottom: 6 }} wrap={false}>
              <Text style={localePdfBoldStyle({ fontSize: 10 })}>
                {ed.institution}
              </Text>
              <Text style={{ fontFamily: pdfBody, fontSize: 9 }}>
                {[ed.degree, ed.field].filter(Boolean).join(' · ')}
              </Text>
              <Text
                style={{ fontFamily: pdfBody, fontSize: 8, color: '#4a5568' }}
              >
                {formatCvRange(ed.startDate, ed.endDate, layout.locale)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {skills.length ? (
        <View>
          <SectionTitle>{labels.skills}</SectionTitle>
          <Text style={{ fontFamily: pdfBody, fontSize: 9 }}>
            {skills.map((s) => s.name).join(' · ')}
          </Text>
        </View>
      ) : null}
    </>
  );
}
