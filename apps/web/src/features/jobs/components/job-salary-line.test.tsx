// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { JobSalaryLine } from './job-salary-line';

const text = () => screen.getByTestId('job-salary').textContent;

describe('JobSalaryLine', () => {
  it('a monthly net range, in Serbian number format', () => {
    renderApp(
      <JobSalaryLine
        salary={{ min: 60000, max: 80000, period: 'month', basis: 'net' }}
      />,
    );
    expect(text()).toBe('60.000–80.000 RSD neto mesečno');
  });

  it('an hourly floor and a daily gross ceiling', () => {
    const { unmount } = renderApp(
      <JobSalaryLine
        salary={{ min: 400, max: null, period: 'hour', basis: 'net' }}
      />,
    );
    expect(text()).toBe('od 400 RSD neto po satu');
    unmount();
    renderApp(
      <JobSalaryLine
        salary={{ min: null, max: 5000, period: 'day', basis: 'gross' }}
      />,
    );
    expect(text()).toBe('do 5.000 RSD bruto dnevno');
  });

  it('renders nothing without a salary', () => {
    const { container } = renderApp(<JobSalaryLine salary={null} />);
    expect(container.textContent).toBe('');
  });
});
