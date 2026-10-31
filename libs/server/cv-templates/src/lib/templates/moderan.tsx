import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { ReactElement, ReactNode } from 'react';

import type { CvPdfLayoutInput } from 'contracts';

import { CV_LABELS, formatCvLanguage } from '../labels';
import {
  contactParts,
  CvPhoto,
  EducationSection,
  ExperienceSection,
  formatCertificate,
  KeepWithFirst,
  SummarySection,
  type CvTheme,
} from '../sections';
import { accentOf, CV_INK, CV_MUTED, SANS, tint } from '../theme';

// Coloured sidebar (contact, skills, languages, licence) beside the story.
// Two columns: for a person to read, not the safest for CV scanners.
const SIDEBAR = 0.34 * 595;
const BASE = {
  fontFamily: SANS,
  fontSize: 9.5,
  color: CV_INK,
  lineHeight: 1.4,
};
const ON_ACCENT = '#FFFFFF';
const SIDE_TEXT = {
  fontFamily: SANS,
  fontSize: 9,
  color: ON_ACCENT,
  lineHeight: 1.45,
};

function makeTheme(accent: string): CvTheme {
  return {
    Title: ({ children }) => (
      <Text
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          color: accent,
          marginBottom: 6,
        }}
      >
        {children}
      </Text>
    ),
    body: BASE,
    bold: { ...BASE, fontWeight: 700, fontSize: 10 },
    muted: { ...BASE, fontSize: 8.8, color: CV_MUTED },
    sub: { ...BASE, color: CV_MUTED },
    entry: 'stacked',
    gap: 16,
  };
}

function SideGroup({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: ReactNode;
}): ReactElement {
  return (
    <View style={{ marginTop: 18 }}>
      <Text
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          color: ON_ACCENT,
          paddingBottom: 3,
          marginBottom: 5,
          borderBottomWidth: 0.7,
          borderBottomColor: tint(accent, 0.6),
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export function ModeranDoc({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement {
  const accent = accentOf(layout);
  const theme = makeTheme(accent);
  const labels = CV_LABELS[layout.locale];
  const p = layout.profile;
  const contact = contactParts(layout);
  return (
    <Document>
      <Page
        size="A4"
        style={{
          ...BASE,
          paddingTop: 38,
          paddingBottom: 38,
          paddingLeft: SIDEBAR + 30,
          paddingRight: 34,
        }}
      >
        {/* The colour runs down every page; its content sits on page 1. */}
        <View
          fixed
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: SIDEBAR,
            backgroundColor: accent,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 20,
            left: 24,
            width: SIDEBAR - 48,
          }}
        >
          <View style={{ alignItems: 'center', marginTop: 18 }}>
            <CvPhoto
              layout={layout}
              size={112}
              round
              ring={tint(accent, 0.75)}
            />
          </View>
          {contact.length || p.links.length ? (
            <SideGroup title={labels.contact} accent={accent}>
              {contact.map((c) => (
                <Text key={c} style={SIDE_TEXT}>
                  {c}
                </Text>
              ))}
              {p.links.map((l) => (
                <Text key={l.url} style={SIDE_TEXT}>
                  {l.label}: {l.url}
                </Text>
              ))}
            </SideGroup>
          ) : null}
          {p.skills.length ? (
            <SideGroup title={labels.skills} accent={accent}>
              {p.skills.length <= 12 ? (
                p.skills.map((s) => (
                  <Text key={s.name} style={SIDE_TEXT}>
                    {s.name}
                  </Text>
                ))
              ) : (
                <Text style={SIDE_TEXT}>
                  {p.skills.map((s) => s.name).join(' · ')}
                </Text>
              )}
            </SideGroup>
          ) : null}
          {p.digitalSkills ? (
            <SideGroup title={labels.digitalSkills} accent={accent}>
              <Text style={SIDE_TEXT}>{p.digitalSkills}</Text>
            </SideGroup>
          ) : null}
          {p.languages.length ? (
            <SideGroup title={labels.languages} accent={accent}>
              {p.languages.map((l) => (
                <Text key={l.name} style={SIDE_TEXT}>
                  {formatCvLanguage(l.name, l.level, layout.locale)}
                </Text>
              ))}
            </SideGroup>
          ) : null}
          {p.availability ? (
            <SideGroup title={labels.availableFrom} accent={accent}>
              <Text style={SIDE_TEXT}>{p.availability}</Text>
            </SideGroup>
          ) : null}
          {p.drivingLicences.length ? (
            <SideGroup title={labels.drivingLicence} accent={accent}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {p.drivingLicences.map((c) => (
                  <Text
                    key={c}
                    style={{
                      ...SIDE_TEXT,
                      fontWeight: 700,
                      borderWidth: 1,
                      borderColor: ON_ACCENT,
                      borderRadius: 3,
                      paddingHorizontal: 5,
                      marginRight: 4,
                      marginBottom: 4,
                    }}
                  >
                    {c}
                  </Text>
                ))}
              </View>
            </SideGroup>
          ) : null}
        </View>

        <Text
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 27,
            lineHeight: 1.1,
          }}
        >
          {layout.fullName ?? 'CV'}
        </Text>
        {layout.headline ? (
          <Text
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 11,
              color: accent,
              marginTop: 3,
            }}
          >
            {layout.headline}
          </Text>
        ) : null}
        <SummarySection layout={layout} theme={theme} />
        <ExperienceSection layout={layout} theme={theme} />
        <EducationSection layout={layout} theme={theme} />
        {p.certificates.length ? (
          <KeepWithFirst
            style={{ marginTop: theme.gap }}
            head={<theme.Title>{labels.certificates}</theme.Title>}
          >
            {p.certificates.map((c, i) => (
              <Text key={i} style={BASE}>
                {formatCertificate(c)}
              </Text>
            ))}
          </KeepWithFirst>
        ) : null}
      </Page>
    </Document>
  );
}
