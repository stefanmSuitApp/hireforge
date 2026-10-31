// @vitest-environment jsdom
// T5.4 the CV builder: seven steps, and what "save and generate" sends.
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { messages, renderApp } from '@/test/render';
import { CandidateCvBuildWizard } from './candidate-cv-build-wizard';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/hooks/mutations/use-candidate-cv-save-and-generate', () => ({
  useCandidateCvSaveAndGenerateMutation: () => ({ mutate, isPending: false }),
}));
// The live PDF preview loads react-pdf in the browser; not what this test is about.
vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="pdf-preview" />,
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const t = messages.Candidate.cvBuild;
const INITIAL = {
  fullName: '  Jelena Jović ',
  phone: '',
  headline: 'Knjigovođa',
  cityId: null,
  cvProfile: { experiences: [], education: [], skills: [] },
} as never;

beforeEach(() => mutate.mockReset());

function renderWizard() {
  return renderApp(
    <CandidateCvBuildWizard
      locale="sr"
      email="ana@primer.rs"
      initial={INITIAL}
      cityGroups={[]}
      flatCities={[]}
      cmsTemplates={[]}
    />,
  );
}

const step = (n: number) =>
  t.stepIndicator.replace('{current}', String(n)).replace('{total}', '7');
const next = () =>
  userEvent.click(screen.getByRole('button', { name: t.next }));

describe('building a CV', () => {
  it('starts on step 1 with the profile filled in; Back is disabled', () => {
    renderWizard();
    expect(screen.getByText(step(1), { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText(t.fullName)).toHaveValue('  Jelena Jović ');
    expect(screen.getByRole('button', { name: t.back })).toBeDisabled();
  });

  it('walks the seven steps, picks the first template, and saves trimmed data with a skill', async () => {
    renderWizard();
    await next(); // experience
    await next(); // education
    await next(); // skills
    await userEvent.click(screen.getByRole('button', { name: t.addSkill }));
    // The row labels aren't tied to their inputs (it.fails below), so find it by role.
    const skillInputs = screen.getAllByRole('textbox');
    await userEvent.type(
      skillInputs[skillInputs.length - 1] as HTMLElement,
      '  Excel ',
    );
    await next(); // languages, licences, certificates
    await next(); // template
    expect(screen.getByText(step(6), { exact: false })).toBeInTheDocument();
    await next(); // generate
    expect(screen.getByRole('button', { name: t.next })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: t.generateCta }));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({
      templateCode: 'klasican',
      locale: 'sr',
      profile: {
        fullName: 'Jelena Jović',
        phone: null,
        headline: 'Knjigovođa',
        cityId: null,
        cvProfile: {
          experiences: [],
          education: [],
          skills: [{ name: 'Excel' }],
        },
      },
    });
  });

  // The experience, education and skill rows' labels used to have no
  // htmlFor, so screen readers didn't name those fields.
  it('every row field has a label a screen reader reads', async () => {
    renderWizard();
    await next(); // experience
    await userEvent.click(
      screen.getByRole('button', { name: t.addExperience }),
    );
    for (const label of [t.employer, t.jobTitle, t.summary]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    await next(); // education
    await userEvent.click(screen.getByRole('button', { name: t.addEducation }));
    for (const label of [t.institution, t.degree, t.field]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    await next(); // skills
    await userEvent.click(screen.getByRole('button', { name: t.addSkill }));
    expect(screen.getByLabelText(t.skillName)).toBeInTheDocument();
  });

  it('Back returns to the previous step without losing what was typed', async () => {
    renderWizard();
    await userEvent.clear(screen.getByLabelText(t.fullName));
    await userEvent.type(screen.getByLabelText(t.fullName), 'Marko');
    await next();
    await userEvent.click(screen.getByRole('button', { name: t.back }));
    expect(screen.getByLabelText(t.fullName)).toHaveValue('Marko');
  });

  // CV templates PR 2: languages, licence and certificates have their own step.
  it('the languages, licences and certificates step adds what the CV prints', async () => {
    renderWizard();
    await userEvent.type(screen.getByLabelText(t.aboutLabel), 'Vozač.');
    await userEvent.click(
      screen.getByLabelText(t.showEmail.replace('{email}', 'ana@primer.rs')),
    );
    for (let i = 0; i < 4; i++) await next();
    expect(
      screen.getByRole('heading', { name: t.stepExtras }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: t.addLanguage }));
    await userEvent.click(screen.getByRole('button', { name: t.addLanguage }));
    const names = screen.getAllByLabelText(t.languageName);
    await userEvent.type(names[0] as HTMLElement, 'Srpski');
    await userEvent.type(names[1] as HTMLElement, 'Engleski');
    await userEvent.selectOptions(
      screen.getAllByLabelText(t.languageLevel)[1] as HTMLElement,
      'B2',
    );
    await userEvent.click(screen.getByRole('button', { name: 'C' }));
    await userEvent.click(screen.getByRole('button', { name: 'B' }));
    await userEvent.click(screen.getByRole('button', { name: 'C' }));
    await userEvent.click(screen.getByRole('button', { name: 'CE' }));
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(
      screen.getByRole('button', { name: t.addCertificate }),
    );
    await userEvent.type(
      screen.getByLabelText(t.certificateName),
      'Rukovalac viljuškarom',
    );
    await userEvent.type(screen.getByLabelText(t.certificateYear), '2019x');
    await userEvent.type(screen.getByLabelText(t.availability), 'Odmah');

    await next(); // template
    await next(); // generate
    await userEvent.click(screen.getByRole('button', { name: t.generateCta }));
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({
      profile: {
        cvProfile: {
          summary: 'Vozač.',
          showEmail: false,
          languages: [
            { name: 'Srpski', level: 'native' },
            { name: 'Engleski', level: 'B2' },
          ],
          drivingLicences: ['B', 'CE'],
          certificates: [{ name: 'Rukovalac viljuškarom', year: 2019 }],
          availability: 'Odmah',
        },
      },
    });
  });

  // CV templates PR 4: five templates, each saying where it works best.
  it('the template step offers five templates with a badge each', async () => {
    renderWizard();
    for (let i = 0; i < 5; i++) await next();
    for (const name of Object.values(t.templateNames)) {
      expect(
        screen.getByRole('button', { name: new RegExp(name) }),
      ).toBeVisible();
    }
    expect(screen.getAllByText(t.badgeAtsSafe)).toHaveLength(4);
    expect(screen.getAllByText(t.badgeTwoColumns)).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: new RegExp(t.templateNames.moderan) }),
    ).toHaveTextContent(t.badgeTwoColumns);
  });

  // CV templates PR 5a: the colour picked in the template step is saved.
  it('the picked accent colour is saved with the profile', async () => {
    renderWizard();
    for (let i = 0; i < 5; i++) await next();
    const plum = screen.getByRole('radio', { name: t.accentNames.plum });
    // Klasičan (picked by default) is black and white: no colour choice.
    expect(plum).toBeDisabled();
    expect(screen.getByText(t.accentKlasicanNote)).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(t.templateNames.moderan) }),
    );
    await userEvent.click(plum);
    expect(plum).toBeChecked();
    await next(); // generate
    await userEvent.click(screen.getByRole('button', { name: t.generateCta }));
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({
      templateCode: 'moderan',
      profile: { cvProfile: { accent: 'plum' } },
    });
  });
});
