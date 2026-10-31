import { Image, Text, View } from '@react-pdf/renderer';
import { Children, type ReactElement, type ReactNode } from 'react';

import type { CvPdfLayoutInput } from 'contracts';

import { CV_LABELS, formatCvLanguage, formatCvRange } from './labels';
import type { PdfStyle } from './theme';

/** How a template draws headings and text; the sections only arrange content. */
export type CvTheme = {
  /** Section heading. */
  Title: (props: { children: string }) => ReactElement;
  body: PdfStyle;
  bold: PdfStyle;
  muted: PdfStyle;
  /** Company / school line under a title (e.g. italic in Klasičan). */
  sub: PdfStyle;
  /**
   * `row`: title left, dates right, company below.
   * `stacked`: title, then "company · dates".
   */
  entry: 'row' | 'stacked';
  /** Space above each section. */
  gap: number;
  /** Titles in a left column this wide (pt) instead of above the content. */
  titleWidth?: number;
};

/** The candidate's photo, when they have one and switched it on. */
export function CvPhoto({
  layout,
  size,
  round,
  ring,
}: {
  layout: CvPdfLayoutInput;
  size: number;
  round: boolean;
  ring?: string;
}): ReactElement | null {
  if (!layout.photo || !layout.profile.showPhoto) return null;
  return (
    <Image
      // Bytes on the server, a same-origin URL in the browser preview.
      src={layout.photo as never}
      style={{
        width: size,
        height: size,
        objectFit: 'cover',
        borderRadius: round ? size / 2 : 6,
        ...(ring ? { borderWidth: 3, borderColor: ring } : {}),
      }}
    />
  );
}

/** Phone, email (unless hidden) and city, whichever the candidate has. */
export function contactParts(layout: CvPdfLayoutInput): string[] {
  const email = layout.profile.showEmail ? layout.email : null;
  return [layout.phone, email, layout.cityLine].filter((p): p is string =>
    Boolean(p),
  );
}

/** A job description: lines starting with "-" or "•" become bullets. */
export function DescriptionText({
  text,
  style,
}: {
  text: string;
  style: PdfStyle;
}): ReactElement {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <View style={{ marginTop: 2 }}>
      {lines.map((line, i) => {
        const bullet = /^[-•]\s*/.exec(line);
        return bullet ? (
          <View key={i} style={{ flexDirection: 'row', marginTop: 1 }}>
            <Text style={{ ...style, width: 9 }}>•</Text>
            <Text style={{ ...style, flex: 1 }}>
              {line.slice(bullet[0].length)}
            </Text>
          </View>
        ) : (
          <Text key={i} style={style}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

/** A heading never ends a page alone: it is kept with the first entry. */
export function KeepWithFirst({
  head,
  children,
  style,
}: {
  head: ReactNode;
  children: ReactNode;
  style?: PdfStyle;
}): ReactElement {
  const [first, ...rest] = Children.toArray(children);
  return (
    <View style={style}>
      <View wrap={false}>
        {head}
        {first}
      </View>
      {rest}
    </View>
  );
}

function Section({
  theme,
  title,
  children,
}: {
  theme: CvTheme;
  title: string;
  children: ReactNode;
}): ReactElement {
  if (theme.titleWidth) {
    // One row per entry, the title in the first: it can't be split from it.
    return (
      <View style={{ marginTop: theme.gap }}>
        {Children.toArray(children).map((item, i) => (
          <View key={i} style={{ flexDirection: 'row' }} wrap={false}>
            <View style={{ width: theme.titleWidth, paddingRight: 12 }}>
              {i === 0 ? <theme.Title>{title}</theme.Title> : null}
            </View>
            <View style={{ flex: 1 }}>{item}</View>
          </View>
        ))}
      </View>
    );
  }
  return (
    <KeepWithFirst
      style={{ marginTop: theme.gap }}
      head={<theme.Title>{title}</theme.Title>}
    >
      {children}
    </KeepWithFirst>
  );
}

type SectionProps = { layout: CvPdfLayoutInput; theme: CvTheme };

export function SummarySection({
  layout,
  theme,
}: SectionProps): ReactElement | null {
  if (!layout.profile.summary) return null;
  return (
    <Section theme={theme} title={CV_LABELS[layout.locale].summary}>
      <Text style={theme.body}>{layout.profile.summary}</Text>
    </Section>
  );
}

function Entry({
  theme,
  title,
  sub,
  dates,
  description,
}: {
  theme: CvTheme;
  title: string;
  sub: string;
  dates: string;
  description?: string;
}): ReactElement {
  return (
    <View style={{ marginBottom: 7 }} wrap={false}>
      {theme.entry === 'row' ? (
        <>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Text style={{ ...theme.bold, flex: 1, paddingRight: 8 }}>
              {title}
            </Text>
            <Text style={theme.muted}>{dates}</Text>
          </View>
          {sub ? <Text style={theme.sub}>{sub}</Text> : null}
        </>
      ) : (
        <>
          <Text style={theme.bold}>{title}</Text>
          <Text style={theme.muted}>
            {[sub, dates].filter(Boolean).join(' · ')}
          </Text>
        </>
      )}
      {description ? (
        <DescriptionText text={description} style={theme.body} />
      ) : null}
    </View>
  );
}

export function ExperienceSection({
  layout,
  theme,
}: SectionProps): ReactElement | null {
  const { experiences } = layout.profile;
  if (!experiences.length) return null;
  return (
    <Section theme={theme} title={CV_LABELS[layout.locale].experience}>
      {experiences.map((ex, i) => (
        <Entry
          key={i}
          theme={theme}
          title={ex.title}
          sub={ex.company}
          dates={formatCvRange(ex.startDate, ex.endDate, layout.locale)}
          description={ex.summary}
        />
      ))}
    </Section>
  );
}

export function EducationSection({
  layout,
  theme,
}: SectionProps): ReactElement | null {
  const { education } = layout.profile;
  if (!education.length) return null;
  return (
    <Section theme={theme} title={CV_LABELS[layout.locale].education}>
      {education.map((ed, i) => (
        <Entry
          key={i}
          theme={theme}
          title={ed.institution}
          sub={[ed.degree, ed.field].filter(Boolean).join(' · ')}
          dates={formatCvRange(ed.startDate, ed.endDate, layout.locale)}
        />
      ))}
    </Section>
  );
}

/** The candidate's extras as "Label: value" lines. */
export function extraLines(
  layout: CvPdfLayoutInput,
  { withSkills }: { withSkills: boolean },
): [label: string, value: string][] {
  const labels = CV_LABELS[layout.locale];
  const p = layout.profile;
  const lines: [string, string][] = [];
  if (withSkills && p.skills.length) {
    lines.push([labels.skills, p.skills.map((s) => s.name).join(', ')]);
  }
  if (p.drivingLicences.length) {
    lines.push([labels.drivingLicence, p.drivingLicences.join(', ')]);
  }
  if (p.certificates.length) {
    lines.push([
      labels.certificates,
      p.certificates.map(formatCertificate).join('; '),
    ]);
  }
  if (p.languages.length) {
    lines.push([
      labels.languages,
      p.languages
        .map((l) => formatCvLanguage(l.name, l.level, layout.locale))
        .join(', '),
    ]);
  }
  if (p.digitalSkills) lines.push([labels.digitalSkills, p.digitalSkills]);
  if (p.availability) lines.push([labels.availableFrom, p.availability]);
  if (p.links.length) {
    lines.push([
      labels.links,
      p.links.map((l) => `${l.label}: ${l.url}`).join(', '),
    ]);
  }
  return lines;
}

export function formatCertificate(c: {
  name: string;
  issuer?: string;
  year?: number;
}): string {
  return (
    [c.name, c.issuer].filter(Boolean).join(', ') +
    (c.year ? ` (${c.year})` : '')
  );
}

/** One section of "Label: value" lines (skills, licence, languages, …). */
export function ExtraLinesSection({
  layout,
  theme,
  title,
  withSkills,
}: SectionProps & {
  title: string;
  withSkills: boolean;
}): ReactElement | null {
  const lines = extraLines(layout, { withSkills });
  if (!lines.length) return null;
  return (
    <Section theme={theme} title={title}>
      {lines.map(([label, value]) => (
        <Text key={label} style={{ ...theme.body, marginTop: 1 }}>
          <Text style={theme.bold}>{label}: </Text>
          {value}
        </Text>
      ))}
    </Section>
  );
}
