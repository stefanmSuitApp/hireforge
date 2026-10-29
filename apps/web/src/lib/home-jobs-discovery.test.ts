import { describe, expect, it } from 'vitest';

import {
  buildCmsCategorySpotlightTiles,
  buildCmsCitySpotlightTiles,
} from './home-jobs-discovery';

const row = (slug: string) => ({ slug, imageUrl: null, labelOverride: null });

describe('CMS spotlight tiles', () => {
  it('skip categories the site does not have (their pages are 404s)', () => {
    const tiles = buildCmsCategorySpotlightTiles(
      [row('it'), row('finansije'), row('marketing')],
      [{ slug: 'it' }, { slug: 'marketing' }],
    );
    expect(tiles.map((t) => t.jobsHref)).toEqual([
      '/jobs/category/it',
      '/jobs/category/marketing',
    ]);
  });

  it('skip cities the site does not have', () => {
    const tiles = buildCmsCitySpotlightTiles(
      [row('beograd'), row('atlantida')],
      [{ slug: 'beograd' }],
    );
    expect(tiles.map((t) => t.slug)).toEqual(['beograd']);
  });

  it('carry the declined button text from the CMS ("Istraži Suboticu")', () => {
    const [tile] = buildCmsCitySpotlightTiles(
      [{ ...row('subotica'), exploreLabel: 'Istraži Suboticu' }],
      [{ slug: 'subotica' }],
    );
    expect(tile?.exploreLabel).toBe('Istraži Suboticu');
  });

  it('keep every tile when the taxonomy could not be loaded', () => {
    const tiles = buildCmsCategorySpotlightTiles([row('it'), row('pravo')], []);
    expect(tiles).toHaveLength(2);
  });
});
