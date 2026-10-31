import { Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

import type { CvPdfLayoutInput } from 'contracts';

import {
  localePdfBodyFontFamily,
  localePdfBoldStyle,
} from 'server-pdf/locale-fonts';

import { CV_LABELS, formatCvRange } from './labels';

export const pdfBody = localePdfBodyFontFamily();

/** Phone, email and city on one line, whichever the candidate filled in. */
export function contactLine(layout: CvPdfLayoutInput): string {
  return [layout.phone, layout.email, layout.cityLine]
    .filter(Boolean)
    .join(' · ');
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
              {ex.summary ? (
                <Text
                  style={{ fontFamily: pdfBody, fontSize: 9, marginTop: 2 }}
                >
                  {ex.summary}
                </Text>
              ) : null}
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
