import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

import type { CvPdfLayoutInput } from 'contracts';

import { localePdfBoldStyle } from 'server-pdf/locale-fonts';

import { BodySections, contactLine, pdfBody } from '../sections';

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: pdfBody, fontSize: 10 },
});

export function MinimalanDoc({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement {
  const contact = contactLine(layout);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={localePdfBoldStyle({ fontSize: 22, letterSpacing: -0.5 })}>
          {layout.fullName ?? 'CV'}
        </Text>
        {layout.headline ? (
          <Text
            style={{
              fontFamily: pdfBody,
              fontSize: 11,
              marginTop: 6,
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
              color: '#718096',
            }}
          >
            {contact}
          </Text>
        ) : null}
        <View
          style={{
            height: 1,
            backgroundColor: '#000',
            marginVertical: 16,
            width: 48,
          }}
        />
        <BodySections layout={layout} />
      </Page>
    </Document>
  );
}
