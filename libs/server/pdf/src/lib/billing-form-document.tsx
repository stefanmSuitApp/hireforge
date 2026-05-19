import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { ReactElement } from 'react';

import {
  localePdfBoldStyle,
  localePdfBodyFontFamily,
  registerLocalePdfFonts,
} from './locale-pdf-fonts';

registerLocalePdfFonts();
const pdfBody = localePdfBodyFontFamily();

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: pdfBody },
  h1: localePdfBoldStyle({ fontSize: 16, marginBottom: 16 }),
  row: { marginBottom: 6 },
  label: localePdfBoldStyle({}),
  footer: { marginTop: 28, fontSize: 8, color: '#444444' },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '15%',
    fontSize: 36,
    color: '#DDDDDD',
    opacity: 0.35,
    transform: 'rotate(-35deg)',
    ...localePdfBoldStyle({}),
  },
});

export type BillingFormPdfProps = {
  locale: 'sr' | 'en';
  /** Localized document title, e.g. Predračun / Proforma */
  title: string;
  displayNumber: string;
  companyLegalName: string;
  issuedAtLabel: string;
  amountPrimaryLabel: string;
  /** RS clients: secondary line, e.g. RSD binding amount */
  amountSecondaryLabel?: string | null;
  wireLines: string[];
  refundFooter?: string | null;
  testModeWatermark: boolean;
};

export function BillingFormDocument({
  locale: _locale,
  title,
  displayNumber,
  companyLegalName,
  issuedAtLabel,
  amountPrimaryLabel,
  amountSecondaryLabel,
  wireLines,
  refundFooter,
  testModeWatermark,
}: BillingFormPdfProps): ReactElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {testModeWatermark ? <Text style={styles.watermark}>TEST</Text> : null}
        <Text style={styles.h1}>{title}</Text>
        <View style={styles.row}>
          <Text>
            <Text style={styles.label}># </Text>
            {displayNumber}
          </Text>
        </View>
        <View style={styles.row}>
          <Text>
            <Text style={styles.label}>
              {_locale === 'en' ? 'Bill to' : 'Kupac'}:{' '}
            </Text>
            {companyLegalName}
          </Text>
        </View>
        <View style={styles.row}>
          <Text>
            <Text style={styles.label}>
              {_locale === 'en' ? 'Issued' : 'Datum'}:{' '}
            </Text>
            {issuedAtLabel}
          </Text>
        </View>
        <View style={{ marginTop: 12, marginBottom: 12 }}>
          <Text style={styles.label}>
            {_locale === 'en' ? 'Amount' : 'Iznos'}
          </Text>
          <Text>{amountPrimaryLabel}</Text>
          {amountSecondaryLabel ? (
            <Text style={{ marginTop: 4 }}>{amountSecondaryLabel}</Text>
          ) : null}
        </View>
        {wireLines.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>
              {_locale === 'en' ? 'Payment (wire)' : 'Plaćanje (prenos)'}
            </Text>
            {wireLines.map((line, i) => (
              <Text key={i} style={{ marginTop: 2 }}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
        {refundFooter ? (
          <View style={styles.footer}>
            <Text style={styles.label}>
              {_locale === 'en' ? 'Refund policy' : 'Politika povraćaja'}
            </Text>
            <Text style={{ marginTop: 4 }}>{refundFooter}</Text>
          </View>
        ) : null}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 8, color: '#666666' }}>
            Šljakam — sljakam.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderBillingFormToBuffer(
  props: BillingFormPdfProps,
): Promise<Buffer> {
  return renderToBuffer(<BillingFormDocument {...props} />);
}
