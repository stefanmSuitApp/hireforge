import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

import type { CvPdfLayoutInput, CvTemplateCode } from 'contracts';

import {
  localePdfBodyFontFamily,
  localePdfBoldStyle,
  registerLocalePdfFonts,
} from 'server-pdf/locale-fonts';

registerLocalePdfFonts();
const pdfBody = localePdfBodyFontFamily();

function formatRange(start: string, end?: string | null): string {
  if (end) {
    return `${start} — ${end}`;
  }
  return `${start} — present`;
}

function SectionTitle({ children }: { children: string }): ReactElement {
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

function HeaderBlock({
  layout,
  nameSize,
}: {
  layout: CvPdfLayoutInput;
  nameSize: number;
}): ReactElement {
  return (
    <View style={{ marginBottom: 14 }}>
      {layout.fullName ? (
        <Text style={localePdfBoldStyle({ fontSize: nameSize })}>{layout.fullName}</Text>
      ) : (
        <Text style={localePdfBoldStyle({ fontSize: nameSize })}>CV</Text>
      )}
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
      {layout.phone || layout.cityLine ? (
        <Text
          style={{
            fontFamily: pdfBody,
            fontSize: 9,
            marginTop: 4,
            color: '#4a5568',
          }}
        >
          {[layout.phone, layout.cityLine].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}

function BodySections({ layout }: { layout: CvPdfLayoutInput }): ReactElement {
  return (
    <>
      {layout.profile.experiences.length ? (
        <View>
          <SectionTitle>Experience</SectionTitle>
          {layout.profile.experiences.map((ex, i) => (
            <View key={i} style={{ marginBottom: 6 }} wrap={false}>
              <Text style={localePdfBoldStyle({ fontSize: 10 })}>
                {ex.title} · {ex.company}
              </Text>
              <Text style={{ fontFamily: pdfBody, fontSize: 8, color: '#4a5568' }}>
                {formatRange(ex.startDate, ex.endDate ?? null)}
              </Text>
              {ex.summary ? (
                <Text style={{ fontFamily: pdfBody, fontSize: 9, marginTop: 2 }}>
                  {ex.summary}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {layout.profile.education.length ? (
        <View>
          <SectionTitle>Education</SectionTitle>
          {layout.profile.education.map((ed, i) => (
            <View key={i} style={{ marginBottom: 6 }} wrap={false}>
              <Text style={localePdfBoldStyle({ fontSize: 10 })}>{ed.institution}</Text>
              <Text style={{ fontFamily: pdfBody, fontSize: 9 }}>
                {[ed.degree, ed.field].filter(Boolean).join(' · ')}
              </Text>
              <Text style={{ fontFamily: pdfBody, fontSize: 8, color: '#4a5568' }}>
                {formatRange(ed.startDate, ed.endDate ?? null)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {layout.profile.skills.length ? (
        <View>
          <SectionTitle>Skills</SectionTitle>
          <Text style={{ fontFamily: pdfBody, fontSize: 9 }}>
            {layout.profile.skills.map((s) => s.name).join(' · ')}
          </Text>
        </View>
      ) : null}
    </>
  );
}

const stylesClassic = StyleSheet.create({
  page: { padding: 40, fontFamily: pdfBody, fontSize: 10 },
  row: { flexDirection: 'row' },
  left: { width: '32%', paddingRight: 16 },
  right: { width: '62%' },
  rule: { height: 1, backgroundColor: '#cbd5e0', marginVertical: 8 },
});

function KlasicanDoc({ layout }: { layout: CvPdfLayoutInput }): ReactElement {
  return (
    <Document>
      <Page size="A4" style={stylesClassic.page}>
        <View style={stylesClassic.row}>
          <View style={stylesClassic.left}>
            <HeaderBlock layout={layout} nameSize={16} />
            <View style={stylesClassic.rule} />
            {layout.profile.skills.length ? (
              <View>
                <Text style={localePdfBoldStyle({ fontSize: 10 })}>Skills</Text>
                <Text style={{ fontFamily: pdfBody, fontSize: 9, marginTop: 4 }}>
                  {layout.profile.skills.map((s) => `• ${s.name}`).join('\n')}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={stylesClassic.right}>
            {layout.profile.experiences.length ? (
              <View>
                <Text style={localePdfBoldStyle({ fontSize: 11 })}>Experience</Text>
                {layout.profile.experiences.map((ex, i) => (
                  <View key={i} style={{ marginTop: 8 }} wrap={false}>
                    <Text style={localePdfBoldStyle({ fontSize: 10 })}>{ex.title}</Text>
                    <Text style={{ fontFamily: pdfBody, fontSize: 9, color: '#2d3748' }}>
                      {ex.company}
                    </Text>
                    <Text style={{ fontFamily: pdfBody, fontSize: 8, color: '#718096' }}>
                      {formatRange(ex.startDate, ex.endDate ?? null)}
                    </Text>
                    {ex.summary ? (
                      <Text style={{ fontFamily: pdfBody, fontSize: 9, marginTop: 2 }}>
                        {ex.summary}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
            {layout.profile.education.length ? (
              <View style={{ marginTop: 12 }}>
                <Text style={localePdfBoldStyle({ fontSize: 11 })}>Education</Text>
                {layout.profile.education.map((ed, i) => (
                  <View key={i} style={{ marginTop: 6 }} wrap={false}>
                    <Text style={localePdfBoldStyle({ fontSize: 10 })}>{ed.institution}</Text>
                    <Text style={{ fontFamily: pdfBody, fontSize: 9 }}>
                      {[ed.degree, ed.field].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={{ fontFamily: pdfBody, fontSize: 8, color: '#718096' }}>
                      {formatRange(ed.startDate, ed.endDate ?? null)}
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

const stylesModeran = StyleSheet.create({
  page: { fontFamily: pdfBody, fontSize: 10, flexDirection: 'row' },
  sidebar: {
    width: '28%',
    backgroundColor: '#1a365d',
    color: '#ffffff',
    padding: 20,
  },
  main: { width: '72%', padding: 28 },
});

function ModeranSidebarHeader({ layout }: { layout: CvPdfLayoutInput }): ReactElement {
  return (
    <View>
      {layout.fullName ? (
        <Text style={localePdfBoldStyle({ fontSize: 14, color: '#ffffff' })}>
          {layout.fullName}
        </Text>
      ) : (
        <Text style={localePdfBoldStyle({ fontSize: 14, color: '#ffffff' })}>CV</Text>
      )}
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
      {layout.phone || layout.cityLine ? (
        <Text
          style={{
            fontFamily: pdfBody,
            fontSize: 8,
            marginTop: 6,
            color: '#cbd5e0',
          }}
        >
          {[layout.phone, layout.cityLine].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}

function ModeranDoc({ layout }: { layout: CvPdfLayoutInput }): ReactElement {
  return (
    <Document>
      <Page size="A4" style={stylesModeran.page}>
        <View style={stylesModeran.sidebar}>
          <ModeranSidebarHeader layout={layout} />
          {layout.profile.skills.length ? (
            <View style={{ marginTop: 16 }}>
              <Text style={localePdfBoldStyle({ fontSize: 10, color: '#ffffff' })}>
                Skills
              </Text>
              <Text
                style={{
                  fontFamily: pdfBody,
                  fontSize: 9,
                  marginTop: 6,
                  color: '#ffffff',
                }}
              >
                {layout.profile.skills.map((s) => `• ${s.name}`).join('\n')}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={stylesModeran.main}>
          <BodySections layout={layout} />
        </View>
      </Page>
    </Document>
  );
}

const stylesMinimal = StyleSheet.create({
  page: { padding: 48, fontFamily: pdfBody, fontSize: 10 },
});

function MinimalanDoc({ layout }: { layout: CvPdfLayoutInput }): ReactElement {
  return (
    <Document>
      <Page size="A4" style={stylesMinimal.page}>
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
        {layout.phone || layout.cityLine ? (
          <Text
            style={{
              fontFamily: pdfBody,
              fontSize: 9,
              marginTop: 4,
              color: '#718096',
            }}
          >
            {[layout.phone, layout.cityLine].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        <View style={{ height: 1, backgroundColor: '#000', marginVertical: 16, width: 48 }} />
        <BodySections layout={layout} />
      </Page>
    </Document>
  );
}

export function CvPdfDocument({
  templateCode,
  layout,
}: {
  templateCode: CvTemplateCode;
  layout: CvPdfLayoutInput;
}): ReactElement {
  switch (templateCode) {
    case 'klasican':
      return <KlasicanDoc layout={layout} />;
    case 'moderan':
      return <ModeranDoc layout={layout} />;
    case 'minimalan':
      return <MinimalanDoc layout={layout} />;
    default: {
      const _x: never = templateCode;
      return _x;
    }
  }
}
