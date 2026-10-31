import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

import type { CvPdfLayoutInput } from 'contracts';

import { CV_LABELS } from '../labels';
import {
  contactParts,
  EducationSection,
  ExperienceSection,
  ExtraLinesSection,
  SummarySection,
  type CvTheme,
} from '../sections';
import { CV_INK, CV_MUTED, SANS, SERIF } from '../theme';

// One column, black on white, serif headings over a rule: reads cleanly in
// CV scanners (ATS). Look: Jake's Resume / Harvard-style resume.
const BASE = {
  fontFamily: SANS,
  fontSize: 9.5,
  color: CV_INK,
  lineHeight: 1.4,
};

const theme: CvTheme = {
  Title: ({ children }) => (
    <Text
      style={{
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: 10.5,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: CV_INK,
        borderBottomWidth: 0.9,
        borderBottomColor: CV_INK,
        paddingBottom: 1.5,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  ),
  body: { ...BASE, textAlign: 'justify' },
  bold: { ...BASE, fontWeight: 700 },
  muted: { ...BASE, color: CV_INK },
  sub: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 9.5, color: CV_INK },
  entry: 'row',
  gap: 13,
};

export function KlasicanDoc({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement {
  const labels = CV_LABELS[layout.locale];
  const p = layout.profile;
  const onlySkills =
    !p.drivingLicences.length &&
    !p.certificates.length &&
    !p.languages.length &&
    !p.digitalSkills &&
    !p.links.length;
  return (
    <Document>
      <Page
        size="A4"
        style={{ ...BASE, paddingVertical: 42, paddingHorizontal: 46 }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: 25,
              lineHeight: 1.25,
            }}
          >
            {layout.fullName ?? 'CV'}
          </Text>
          {layout.headline ? (
            <Text
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: 10.5,
                lineHeight: 1.4,
                marginTop: 2,
              }}
            >
              {layout.headline}
            </Text>
          ) : null}
          {contactParts(layout).length ? (
            <Text
              style={{ ...BASE, fontSize: 9, marginTop: 4, color: CV_MUTED }}
            >
              {contactParts(layout).join(' · ')}
            </Text>
          ) : null}
        </View>
        <SummarySection layout={layout} theme={theme} />
        <ExperienceSection layout={layout} theme={theme} />
        <EducationSection layout={layout} theme={theme} />
        <ExtraLinesSection
          layout={layout}
          theme={theme}
          title={onlySkills ? labels.skills : labels.skillsAndMore}
          withSkills
        />
      </Page>
    </Document>
  );
}
