// @vitest-environment jsdom
// Redesign A step 6: a company's CMS logo replaces its initials wherever
// the tile is shown; without one the initials stay.
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CompanyInitials } from './company-initials';
import { CompanyLogosProvider } from './providers/company-logos-provider';

const logos = { devlegion: 'https://cdn.sanity.io/images/x/logo.png' };

describe('CompanyInitials', () => {
  it('shows the CMS logo for a company that has one', () => {
    const { container } = render(
      <CompanyLogosProvider logos={logos}>
        <CompanyInitials name="DEVLEGION d.o.o." slug="devlegion" />
      </CompanyLogosProvider>,
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      logos.devlegion,
    );
  });

  it('falls back to the initials without a logo', () => {
    const { container } = render(
      <CompanyLogosProvider logos={logos}>
        <CompanyInitials name="Pekara Zlatno Zrno d.o.o." slug="pekara" />
      </CompanyLogosProvider>,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('PZ');
  });
});
