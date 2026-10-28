import { describe, expect, it } from 'vitest';

import { nestApiUrl } from './nest-api-url';

describe('nestApiUrl', () => {
  it('builds URLs under the Nest /api prefix', () => {
    expect(nestApiUrl('http://api:4000', 'public/jobs')).toBe(
      'http://api:4000/api/public/jobs',
    );
    expect(nestApiUrl('http://api:4000/api/', '/employer/jobs?x=1')).toBe(
      'http://api:4000/api/employer/jobs?x=1',
    );
  });

  it('refuses paths that climb out of the intended route (decoded params)', () => {
    expect(
      nestApiUrl(
        'http://api:4000',
        'public/jobs/../../auth/staff/login/external-click',
      ),
    ).toBeNull();
    expect(nestApiUrl('http://api:4000', 'employer/jobs/./x')).toBeNull();
    expect(nestApiUrl('http://api:4000', 'employer/jobs/a\\..\\b')).toBeNull();
  });
});
