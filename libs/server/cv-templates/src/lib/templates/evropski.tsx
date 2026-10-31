import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { ReactElement, ReactNode } from 'react';

import type { CvPdfLayoutInput } from 'contracts';

import { CV_LABELS, cvLevelBand, formatCvRange } from '../labels';
import { DescriptionText, formatCertificate, KeepWithFirst } from '../sections';
import { CV_ACCENT, CV_INK, CV_MUTED, CV_RULE, SANS, tint } from '../theme';

// The European (Europass) structure Serbian candidates and public employers
// know: a label column beside the content, row by row, CEFR language levels.
// Not the official Europass: no name or logo.
const LABEL_WIDTH = 122;
const BASE = {
  fontFamily: SANS,
  fontSize: 9,
  color: CV_INK,
  lineHeight: 1.4,
};
const MUTED = { ...BASE, color: CV_MUTED };
const BOLD = { ...BASE, fontWeight: 700 };

function Heading({
  accent,
  children,
}: {
  accent: string;
  children: string;
}): ReactElement {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
      <Text
        style={{
          ...BOLD,
          fontSize: 9.5,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          color: accent,
          marginRight: 8,
        }}
      >
        {children}
      </Text>
      <View
        style={{ flex: 1, height: 0.7, backgroundColor: tint(accent, 0.35) }}
      />
    </View>
  );
}

function Row({
  label,
  date,
  accent,
  children,
}: {
  label: string;
  /** Dates read as plain text, not as a coloured label. */
  date?: boolean;
  accent: string;
  children: ReactNode;
}): ReactElement {
  return (
    <View style={{ flexDirection: 'row', marginTop: 7 }} wrap={false}>
      <Text
        style={
          date
            ? {
                ...MUTED,
                width: LABEL_WIDTH,
                textAlign: 'right',
                paddingRight: 14,
              }
            : {
                ...BOLD,
                width: LABEL_WIDTH,
                textAlign: 'right',
                paddingRight: 14,
                fontSize: 7.8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: accent,
                paddingTop: 1,
              }
        }
      >
        {label}
      </Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export function EvropskiDoc({
  layout,
}: {
  layout: CvPdfLayoutInput;
}): ReactElement {
  const accent = CV_ACCENT;
  const labels = CV_LABELS[layout.locale];
  const p = layout.profile;
  const email = p.showEmail ? layout.email : null;
  const native = p.languages.filter((l) => l.level === 'native');
  const other = p.languages.filter((l) => l.level !== 'native');
  const hasPersonal =
    layout.phone ||
    email ||
    layout.cityLine ||
    p.links.length ||
    p.availability;
  const hasSkills =
    p.skills.length ||
    p.digitalSkills ||
    p.drivingLicences.length ||
    p.certificates.length;
  return (
    <Document>
      <Page
        size="A4"
        style={{ ...BASE, paddingVertical: 34, paddingHorizontal: 38 }}
      >
        <View
          style={{
            paddingBottom: 11,
            borderBottomWidth: 1.4,
            borderBottomColor: accent,
          }}
        >
          <Text
            style={{
              ...BOLD,
              fontSize: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              color: accent,
            }}
          >
            {labels.cvKicker}
          </Text>
          <Text
            style={{ ...BOLD, fontSize: 21, lineHeight: 1.2, marginTop: 1 }}
          >
            {layout.fullName ?? 'CV'}
          </Text>
          {layout.headline ? (
            <Text style={MUTED}>{layout.headline}</Text>
          ) : null}
        </View>

        {hasPersonal ? (
          <KeepWithFirst
            head={<Heading accent={accent}>{labels.personal}</Heading>}
          >
            {layout.phone ? (
              <Row label={labels.phone} accent={accent}>
                <Text style={BASE}>{layout.phone}</Text>
              </Row>
            ) : null}
            {email ? (
              <Row label={labels.email} accent={accent}>
                <Text style={BASE}>{email}</Text>
              </Row>
            ) : null}
            {layout.cityLine ? (
              <Row label={labels.city} accent={accent}>
                <Text style={BASE}>{layout.cityLine}</Text>
              </Row>
            ) : null}
            {p.availability ? (
              <Row label={labels.availableFrom} accent={accent}>
                <Text style={BASE}>{p.availability}</Text>
              </Row>
            ) : null}
            {p.links.map((l) => (
              <Row key={l.url} label={l.label} accent={accent}>
                <Text style={BASE}>{l.url}</Text>
              </Row>
            ))}
          </KeepWithFirst>
        ) : null}

        {p.summary ? (
          <KeepWithFirst
            head={<Heading accent={accent}>{labels.summary}</Heading>}
          >
            <Row label="" accent={accent}>
              <Text style={BASE}>{p.summary}</Text>
            </Row>
          </KeepWithFirst>
        ) : null}

        {p.experiences.length ? (
          <KeepWithFirst
            head={<Heading accent={accent}>{labels.experience}</Heading>}
          >
            {p.experiences.map((ex, i) => (
              <Row
                key={i}
                date
                label={formatCvRange(ex.startDate, ex.endDate, layout.locale)}
                accent={accent}
              >
                <Text style={BOLD}>{ex.title}</Text>
                <Text style={MUTED}>{ex.company}</Text>
                {ex.summary ? (
                  <DescriptionText text={ex.summary} style={BASE} />
                ) : null}
              </Row>
            ))}
          </KeepWithFirst>
        ) : null}

        {p.education.length ? (
          <KeepWithFirst
            head={<Heading accent={accent}>{labels.education}</Heading>}
          >
            {p.education.map((ed, i) => (
              <Row
                key={i}
                date
                label={formatCvRange(ed.startDate, ed.endDate, layout.locale)}
                accent={accent}
              >
                <Text style={BOLD}>
                  {[ed.degree, ed.field].filter(Boolean).join(' · ') ||
                    ed.institution}
                </Text>
                {ed.degree || ed.field ? (
                  <Text style={MUTED}>{ed.institution}</Text>
                ) : null}
              </Row>
            ))}
          </KeepWithFirst>
        ) : null}

        {p.languages.length ? (
          <KeepWithFirst
            head={<Heading accent={accent}>{labels.languages}</Heading>}
          >
            {native.length ? (
              <Row label={labels.motherTongue} accent={accent}>
                <Text style={BASE}>{native.map((l) => l.name).join(', ')}</Text>
              </Row>
            ) : null}
            {other.length ? (
              <Row label={labels.otherLanguages} accent={accent}>
                <View style={{ borderWidth: 0.7, borderColor: CV_RULE }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: tint(accent, 0.11),
                    }}
                  >
                    {[
                      labels.language,
                      labels.cefrLevel,
                      labels.levelDescription,
                    ].map((h) => (
                      <Text
                        key={h}
                        style={{
                          ...BOLD,
                          flex: 1,
                          fontSize: 8,
                          color: accent,
                          paddingVertical: 2,
                          paddingHorizontal: 5,
                        }}
                      >
                        {h}
                      </Text>
                    ))}
                  </View>
                  {other.map((l) => (
                    <View
                      key={l.name}
                      style={{
                        flexDirection: 'row',
                        borderTopWidth: 0.7,
                        borderTopColor: CV_RULE,
                      }}
                    >
                      {[
                        l.name,
                        l.level,
                        cvLevelBand(l.level, layout.locale),
                      ].map((cell, j) => (
                        <Text
                          key={j}
                          style={{
                            ...BASE,
                            flex: 1,
                            paddingVertical: 2,
                            paddingHorizontal: 5,
                          }}
                        >
                          {cell}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              </Row>
            ) : null}
          </KeepWithFirst>
        ) : null}

        {hasSkills ? (
          <KeepWithFirst
            head={<Heading accent={accent}>{labels.skillsAndMore}</Heading>}
          >
            {p.skills.length ? (
              <Row label={labels.skills} accent={accent}>
                <Text style={BASE}>
                  {p.skills.map((s) => s.name).join(', ')}
                </Text>
              </Row>
            ) : null}
            {p.digitalSkills ? (
              <Row label={labels.digitalSkills} accent={accent}>
                <Text style={BASE}>{p.digitalSkills}</Text>
              </Row>
            ) : null}
            {p.drivingLicences.length ? (
              <Row label={labels.drivingLicence} accent={accent}>
                <Text style={BASE}>{p.drivingLicences.join(', ')}</Text>
              </Row>
            ) : null}
            {p.certificates.length ? (
              <Row label={labels.certificates} accent={accent}>
                {p.certificates.map((c, i) => (
                  <Text key={i} style={BASE}>
                    {formatCertificate(c)}
                  </Text>
                ))}
              </Row>
            ) : null}
          </KeepWithFirst>
        ) : null}
      </Page>
    </Document>
  );
}
