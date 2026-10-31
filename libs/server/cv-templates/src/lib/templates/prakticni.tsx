import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { ReactElement, ReactNode } from 'react';

import type { CvPdfLayoutInput } from 'contracts';

import { CV_LABELS, formatCvLanguage, formatCvRange } from '../labels';
import { DescriptionText, formatCertificate, KeepWithFirst } from '../sections';
import { accentOf, CV_INK, CV_MUTED, SANS, tint } from '../theme';

// Skills first for hands-on jobs (drivers, warehouse, kitchens, building):
// licence, start date, certificates and languages in a box at the top, then
// a short work history. Larger type; the phone number is easy to find.
const BASE = {
  fontFamily: SANS,
  fontSize: 10,
  color: CV_INK,
  lineHeight: 1.4,
};
const MUTED = { ...BASE, color: CV_MUTED };
const BOLD = { ...BASE, fontWeight: 700 };
const PAD = 36;

function Heading({
  accent,
  children,
}: {
  accent: string;
  children: string;
}): ReactElement {
  return (
    <Text
      style={{
        ...BOLD,
        fontSize: 10.5,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: accent,
        marginTop: 16,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

function BoxCell({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: ReactNode;
}): ReactElement {
  return (
    <View style={{ width: '50%', paddingRight: 12, marginBottom: 10 }}>
      <Text
        style={{
          ...BOLD,
          fontSize: 7.8,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          color: accent,
          marginBottom: 3,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

export function PrakticniDoc({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement {
  const accent = accentOf(layout);
  const labels = CV_LABELS[layout.locale];
  const p = layout.profile;
  const email = p.showEmail ? layout.email : null;
  const cells: ReactElement[] = [];
  if (p.drivingLicences.length) {
    cells.push(
      <BoxCell key="lic" label={labels.drivingLicence} accent={accent}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {p.drivingLicences.map((c) => (
            <Text
              key={c}
              style={{
                ...BOLD,
                fontSize: 11,
                color: '#FFFFFF',
                backgroundColor: accent,
                borderRadius: 3,
                paddingHorizontal: 6,
                marginRight: 4,
                marginBottom: 3,
              }}
            >
              {c}
            </Text>
          ))}
        </View>
      </BoxCell>,
    );
  }
  if (p.availability) {
    cells.push(
      <BoxCell key="avail" label={labels.availableFrom} accent={accent}>
        <Text style={BOLD}>{p.availability}</Text>
      </BoxCell>,
    );
  }
  if (p.certificates.length) {
    cells.push(
      <BoxCell key="certs" label={labels.certificates} accent={accent}>
        {p.certificates.map((c, i) => (
          <Text key={i} style={BASE}>
            {formatCertificate(c)}
          </Text>
        ))}
      </BoxCell>,
    );
  }
  if (p.languages.length) {
    cells.push(
      <BoxCell key="langs" label={labels.languages} accent={accent}>
        {p.languages.map((l) => (
          <Text key={l.name} style={BASE}>
            {formatCvLanguage(l.name, l.level, layout.locale)}
          </Text>
        ))}
      </BoxCell>,
    );
  }
  const extras: [string, string][] = [];
  if (p.digitalSkills) extras.push([labels.digitalSkills, p.digitalSkills]);
  if (p.links.length) {
    extras.push([
      labels.links,
      p.links.map((l) => `${l.label}: ${l.url}`).join(', '),
    ]);
  }

  return (
    <Document>
      <Page size="A4" style={{ ...BASE, paddingTop: 30, paddingBottom: 34 }}>
        {/* Pulled into the top margin: the band starts at the page edge on
            page 1, later pages keep their margin. */}
        <View
          style={{
            marginTop: -30,
            backgroundColor: tint(accent, 0.11),
            paddingTop: 30,
            paddingBottom: 22,
            paddingHorizontal: PAD,
            flexDirection: 'row',
            alignItems: 'flex-end',
          }}
        >
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={{ ...BOLD, fontSize: 26, lineHeight: 1.15 }}>
              {layout.fullName ?? 'CV'}
            </Text>
            {layout.headline ? (
              <Text
                style={{ ...BOLD, fontSize: 11.5, color: accent, marginTop: 2 }}
              >
                {layout.headline}
              </Text>
            ) : null}
            {layout.cityLine ? (
              <Text style={MUTED}>{layout.cityLine}</Text>
            ) : null}
          </View>
          {layout.phone || email ? (
            <View style={{ alignItems: 'flex-end' }}>
              {layout.phone ? (
                <>
                  <Text
                    style={{
                      ...BOLD,
                      fontSize: 7.8,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      color: CV_MUTED,
                    }}
                  >
                    {labels.callMe}
                  </Text>
                  <Text style={{ ...BOLD, fontSize: 15 }}>{layout.phone}</Text>
                </>
              ) : null}
              {email ? (
                <Text style={{ ...BASE, fontSize: 9 }}>{email}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: PAD, paddingTop: 18 }}>
          {cells.length ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                borderWidth: 1.4,
                borderColor: accent,
                borderRadius: 8,
                paddingTop: 13,
                paddingBottom: 3,
                paddingHorizontal: 15,
              }}
              wrap={false}
            >
              {cells}
            </View>
          ) : null}

          {p.summary ? (
            <KeepWithFirst
              head={<Heading accent={accent}>{labels.summary}</Heading>}
            >
              <Text style={BASE}>{p.summary}</Text>
            </KeepWithFirst>
          ) : null}

          {p.experiences.length ? (
            <KeepWithFirst
              head={<Heading accent={accent}>{labels.experience}</Heading>}
            >
              {p.experiences.map((ex, i) => (
                <View key={i} style={{ marginBottom: 8 }} wrap={false}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ ...BOLD, flex: 1, paddingRight: 8 }}>
                      {ex.title}
                    </Text>
                    <Text style={MUTED}>
                      {formatCvRange(ex.startDate, ex.endDate, layout.locale)}
                    </Text>
                  </View>
                  <Text style={MUTED}>{ex.company}</Text>
                  {ex.summary ? (
                    <DescriptionText text={ex.summary} style={BASE} />
                  ) : null}
                </View>
              ))}
            </KeepWithFirst>
          ) : null}

          {p.education.length ? (
            <KeepWithFirst
              head={<Heading accent={accent}>{labels.school}</Heading>}
            >
              {p.education.map((ed, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 3,
                  }}
                  wrap={false}
                >
                  <Text style={{ ...BASE, flex: 1, paddingRight: 8 }}>
                    {ed.degree || ed.field ? (
                      <Text style={BOLD}>
                        {[ed.degree, ed.field].filter(Boolean).join(' · ')}
                        ,{' '}
                      </Text>
                    ) : null}
                    {ed.institution}
                  </Text>
                  <Text style={MUTED}>
                    {formatCvRange(ed.startDate, ed.endDate, layout.locale)}
                  </Text>
                </View>
              ))}
            </KeepWithFirst>
          ) : null}

          {p.skills.length ? (
            <KeepWithFirst
              head={<Heading accent={accent}>{labels.skills}</Heading>}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {p.skills.map((s) => (
                  <Text
                    key={s.name}
                    style={{
                      ...BASE,
                      fontSize: 9.5,
                      backgroundColor: tint(accent, 0.11),
                      borderRadius: 8,
                      paddingHorizontal: 7,
                      paddingVertical: 1,
                      marginRight: 5,
                      marginBottom: 5,
                    }}
                  >
                    {s.name}
                  </Text>
                ))}
              </View>
            </KeepWithFirst>
          ) : null}

          {extras.length ? (
            <View style={{ marginTop: 10 }}>
              {extras.map(([label, value]) => (
                <Text key={label} style={{ ...BASE, fontSize: 9 }}>
                  <Text style={BOLD}>{label}: </Text>
                  {value}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
