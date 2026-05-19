import { z } from 'zod';

import {
  companyDomesticInputSchema,
  companyForeignInputSchema,
} from './companies';

export const employerSelfSignupBodySchema = z
  .object({
    email: z.email().max(320),
    password: z.string().min(8).max(128),
    companySlug: z.string().min(1).max(80).optional(),
    company: z.discriminatedUnion('isForeign', [
      companyDomesticInputSchema,
      companyForeignInputSchema,
    ]),
  })
  .strict();

export type EmployerSelfSignupBody = z.infer<
  typeof employerSelfSignupBodySchema
>;
