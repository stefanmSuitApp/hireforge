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
import { accentOf, CV_INK, CV_MUTED, SANS } from '../theme';

// Lots of white space: big name, small coloured section titles in a left
// column, dates on the right. Look: Awesome-CV.
const BASE = {
  fontFamily: SANS,
  fontSize: 9.5,
  color: CV_INK,
  lineHeight: 1.45,
};

function makeTheme(accent: string): CvTheme {
  return {
    Title: ({ children }) => (
      <Text
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          color: accent,
          paddingTop: 1.5,
        }}
      >
        {children}
      </Text>
    ),
    body: BASE,
    bold: { ...BASE, fontWeight: 700 },
    muted: { ...BASE, fontSize: 8.8, color: CV_MUTED },
    sub: { ...BASE, color: CV_MUTED },
    entry: 'row',
    gap: 22,
    titleWidth: 104,
  };
}

/** "Nikola Petrović" → light first name(s), bold last word. */
function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return ['', full];
  return [parts.slice(0, -1).join(' ') + ' ', parts[parts.length - 1] ?? ''];
}

export function MinimalanDoc({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement {
  const accent = accentOf(layout);
  const theme = makeTheme(accent);
  const [first, last] = splitName(layout.fullName ?? 'CV');
  const contact = contactParts(layout);
  return (
    <Document>
      <Page
        size="A4"
        style={{ ...BASE, paddingVertical: 52, paddingHorizontal: 54 }}
      >
        <Text style={{ fontFamily: SANS, fontSize: 32, lineHeight: 1.05 }}>
          {first}
          <Text style={{ fontWeight: 700 }}>{last}</Text>
        </Text>
        {layout.headline ? (
          <Text
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
              color: accent,
              marginTop: 9,
            }}
          >
            {layout.headline}
          </Text>
        ) : null}
        {contact.length ? (
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}
          >
            {contact.map((c) => (
              <Text key={c} style={{ ...theme.muted, marginRight: 16 }}>
                {c}
              </Text>
            ))}
          </View>
        ) : null}
        <SummarySection layout={layout} theme={theme} />
        <ExperienceSection layout={layout} theme={theme} />
        <EducationSection layout={layout} theme={theme} />
        <ExtraLinesSection
          layout={layout}
          theme={theme}
          title={CV_LABELS[layout.locale].additional}
          withSkills
        />
      </Page>
    </Document>
  );
}
