import type { CvProfile, CvTemplateCode } from 'contracts';

/**
 * The template the picker preselects: hands-on profiles (a driving licence
 * or certificates, no portfolio links) get Praktičan, everyone else Klasičan.
 */
export function recommendCvTemplate(
  profile: Pick<CvProfile, 'drivingLicences' | 'certificates' | 'links'>,
): CvTemplateCode {
  const handsOn =
    profile.drivingLicences.length > 0 || profile.certificates.length > 0;
  return handsOn && profile.links.length === 0 ? 'prakticni' : 'klasican';
}
