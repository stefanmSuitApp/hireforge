import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

import type { CvPdfLayoutInput } from 'contracts';

import { localePdfBoldStyle } from 'server-pdf/locale-fonts';

import { CV_LABELS, formatCvRange } from '../labels';
import { HeaderBlock, pdfBody } from '../sections';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: pdfBody, fontSize: 10 },
  row: { flexDirection: 'row' },
  left: { width: '32%', paddingRight: 16 },
  right: { width: '62%' },
  rule: { height: 1, backgroundColor: '#cbd5e0', marginVertical: 8 },
});

export function KlasicanDoc({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement {
  const labels = CV_LABELS[layout.locale];
  const { experiences, education, skills } = layout.profile;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.row}>
          <View style={styles.left}>
            <HeaderBlock layout={layout} nameSize={16} />
            <View style={styles.rule} />
            {skills.length ? (
              <View>
                <Text style={localePdfBoldStyle({ fontSize: 10 })}>
                  {labels.skills}
                </Text>
                <Text
                  style={{ fontFamily: pdfBody, fontSize: 9, marginTop: 4 }}
                >
                  {skills.map((s) => `• ${s.name}`).join('\n')}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.right}>
            {experiences.length ? (
              <View>
                <Text style={localePdfBoldStyle({ fontSize: 11 })}>
                  {labels.experience}
                </Text>
                {experiences.map((ex, i) => (
                  <View key={i} style={{ marginTop: 8 }} wrap={false}>
                    <Text style={localePdfBoldStyle({ fontSize: 10 })}>
                      {ex.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: pdfBody,
                        fontSize: 9,
                        color: '#2d3748',
                      }}
                    >
                      {ex.company}
                    </Text>
                    <Text
                      style={{
                        fontFamily: pdfBody,
                        fontSize: 8,
                        color: '#718096',
                      }}
                    >
                      {formatCvRange(ex.startDate, ex.endDate, layout.locale)}
                    </Text>
                    {ex.summary ? (
                      <Text
                        style={{
                          fontFamily: pdfBody,
                          fontSize: 9,
                          marginTop: 2,
                        }}
                      >
                        {ex.summary}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
            {education.length ? (
              <View style={{ marginTop: 12 }}>
                <Text style={localePdfBoldStyle({ fontSize: 11 })}>
                  {labels.education}
                </Text>
                {education.map((ed, i) => (
                  <View key={i} style={{ marginTop: 6 }} wrap={false}>
                    <Text style={localePdfBoldStyle({ fontSize: 10 })}>
                      {ed.institution}
                    </Text>
                    <Text style={{ fontFamily: pdfBody, fontSize: 9 }}>
                      {[ed.degree, ed.field].filter(Boolean).join(' · ')}
                    </Text>
                    <Text
                      style={{
                        fontFamily: pdfBody,
                        fontSize: 8,
                        color: '#718096',
                      }}
                    >
                      {formatCvRange(ed.startDate, ed.endDate, layout.locale)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
