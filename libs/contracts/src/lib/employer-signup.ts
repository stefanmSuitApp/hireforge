import { z } from 'zod';

import { termsVersionSchema } from './candidate';

import {
  companyDomesticInputSchema,
  companyForeignInputSchema,
} from './companies';

/** The company part of an employer sign-up (also kept on a join request). */
export const selfSignupCompanyInputSchema = z.discriminatedUnion('isForeign', [
  companyDomesticInputSchema,
  companyForeignInputSchema,
]);

export const employerSelfSignupBodySchema = z
  .object({
    email: z.email().max(320),
    password: z.string().min(8).max(128),
    companySlug: z.string().min(1).max(80).optional(),
    /** UI locale, used for the verification email language and link. */
    locale: z.enum(['sr', 'en']).optional(),
    acceptedTermsVersion: termsVersionSchema.optional(),
    company: selfSignupCompanyInputSchema,
  })
  .strict();

export type EmployerSelfSignupBody = z.infer<
  typeof employerSelfSignupBodySchema
>;
