// @vitest-environment jsdom
// Dates follow the app's locale and zone, not the runtime's: the server (UTC,
// en-US) and the browser printed different text, a hydration error.
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { EmployerJobApplicationsTable } from './employer-job-applications-table';

describe('EmployerJobApplicationsTable', () => {
  it('shows when someone applied in Serbian, in Belgrade time', () => {
    renderApp(
      <EmployerJobApplicationsTable
        items={[
          {
            id: 'a1',
            status: 'submitted',
            candidateEmail: 'ana@example.com',
            // 00:30 on the 29th in Belgrade.
            createdAt: '2026-10-28T23:30:00.000Z',
            resumeOriginalFilename: null,
            coverLetterText: null,
          },
        ]}
      />,
    );
    const applied = screen.getByText((_, el) => el?.tagName === 'TIME');
    expect(applied.textContent).toMatch(/29\..*2026.*00:30/);
  });
});
