import { testId } from './ids';

export interface SeedCompany {
  id: string;
  slug: string;
  legalName: string;
  pib: string;
  mb: string;
}

/**
 * Two companies whose legal names, slugs, PIB and MB look alike on purpose:
 * a query that matches loosely, or by prefix, shows up as an isolation bug.
 */
export const COMPANY_A: SeedCompany = {
  id: testId('company', 1),
  slug: 'gradnja-plus',
  legalName: 'Gradnja Plus d.o.o.',
  pib: '100000011',
  mb: '20000001',
};

export const COMPANY_B: SeedCompany = {
  id: testId('company', 2),
  slug: 'gradnja-plus-1',
  legalName: 'Gradnja Plus 1 d.o.o.',
  pib: '100000012',
  mb: '20000002',
};
