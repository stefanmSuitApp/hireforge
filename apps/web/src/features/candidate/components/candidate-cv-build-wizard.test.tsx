// @vitest-environment jsdom
// T5.4 the CV builder: six steps, and what "save and generate" sends.
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
  t.stepIndicator.replace('{current}', String(n)).replace('{total}', '6');
const next = () =>
  userEvent.click(screen.getByRole('button', { name: t.next }));

describe('building a CV', () => {
  it('starts on step 1 with the profile filled in; Back is disabled', () => {
    renderWizard();
    expect(screen.getByText(step(1), { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText(t.fullName)).toHaveValue('  Jelena Jović ');
    expect(screen.getByRole('button', { name: t.back })).toBeDisabled();
  });

  it('walks the six steps, picks the first template, and saves trimmed data with a skill', async () => {
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
    await next(); // template
    expect(screen.getByText(step(5), { exact: false })).toBeInTheDocument();
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
});
