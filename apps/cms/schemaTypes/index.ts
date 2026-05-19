import type { SchemaTypeDefinition } from 'sanity';

import { campaignCalendar } from './documents/campaignCalendar';
import { cvTemplate } from './documents/cvTemplate';
import { editorialPage } from './documents/editorialPage';
import { employerBranding } from './documents/employerBranding';
import { homeJobsDiscovery } from './documents/homeJobsDiscovery';
import {
  packageDefinition,
  packageEditorCapabilities,
  packageEntitlements,
  packagePriceRow,
  packageUpgradeMessageRow,
} from './documents/packageDefinition';
import { navigation } from './documents/navigation';
import { refundPolicy } from './documents/refundPolicy';
import { siteSettings } from './documents/siteSettings';
import { blockContent } from './objects/blockContent';
import { campaignSlot } from './objects/campaignSlot';
import { employerBenefit } from './objects/employerBenefit';
import { employerBenefitLocalized } from './objects/employerBenefitLocalized';
import { employerTestimonial } from './objects/employerTestimonial';
import { employerTestimonialLocalized } from './objects/employerTestimonialLocalized';
import { localeString, localeText } from './objects/locale';
import { navLink } from './objects/navLink';

export const schemaTypes: SchemaTypeDefinition[] = [
  blockContent,
  localeString,
  localeText,
  navLink,
  campaignSlot,
  packagePriceRow,
  packageUpgradeMessageRow,
  packageEditorCapabilities,
  packageEntitlements,
  employerBenefit,
  employerBenefitLocalized,
  employerTestimonial,
  employerTestimonialLocalized,
  siteSettings,
  navigation,
  homeJobsDiscovery,
  editorialPage,
  employerBranding,
  packageDefinition,
  refundPolicy,
  campaignCalendar,
  cvTemplate,
];
