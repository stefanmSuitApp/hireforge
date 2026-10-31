import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

import type { CvPdfLayoutInput } from 'contracts';

import { localePdfBoldStyle } from 'server-pdf/locale-fonts';

import { CV_LABELS } from '../labels';
import {
  BodySections,
  contactLine,
  ExtraSections,
  pdfBody,
  SummarySection,
} from '../sections';

const styles = StyleSheet.create({
  page: { fontFamily: pdfBody, fontSize: 10, flexDirection: 'row' },
  sidebar: {
    width: '28%',
    backgroundColor: '#1a365d',
    color: '#ffffff',
    padding: 20,
  },
  main: { width: '72%', padding: 28 },
});

function SidebarHeader({ layout }: { layout: CvPdfLayoutInput }): ReactElement {
  const contact = contactLine(layout);
  return (
    <View>
      <Text style={localePdfBoldStyle({ fontSize: 14, color: '#ffffff' })}>
        {layout.fullName ?? 'CV'}
      </Text>
      {layout.headline ? (
        <Text
          style={{
            fontFamily: pdfBody,
            fontSize: 9,
            marginTop: 4,
            color: '#e2e8f0',
          }}
        >
          {layout.headline}
        </Text>
      ) : null}
      {contact ? (
        <Text
          style={{
            fontFamily: pdfBody,
            fontSize: 8,
            marginTop: 6,
            color: '#cbd5e0',
          }}
        >
          {contact}
        </Text>
      ) : null}
    </View>
  );
}

export function ModeranDoc({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement {
  const { skills } = layout.profile;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.sidebar}>
          <SidebarHeader layout={layout} />
          {skills.length ? (
            <View style={{ marginTop: 16 }}>
              <Text
                style={localePdfBoldStyle({ fontSize: 10, color: '#ffffff' })}
              >
                {CV_LABELS[layout.locale].skills}
              </Text>
              <Text
                style={{
                  fontFamily: pdfBody,
                  fontSize: 9,
                  marginTop: 6,
                  color: '#ffffff',
                }}
              >
                {skills.map((s) => `• ${s.name}`).join('\n')}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.main}>
          <SummarySection layout={layout} />
          <BodySections layout={layout} />
          <ExtraSections layout={layout} />
        </View>
      </Page>
    </Document>
  );
}
