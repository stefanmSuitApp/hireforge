'use client';

import type { CandidateProfilePatch, CandidateResumeItem, CvTemplateCode } from 'contracts';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/i18n/navigation';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { webHttp } from '@/lib/http/web-axios';

const TOAST_ID = 'candidate-cv-generate';

type Vars = {
  profile: CandidateProfilePatch;
  templateCode: CvTemplateCode;
};

export function useCandidateCvSaveAndGenerateMutation() {
  const router = useRouter();
  const t = useTranslations('Candidate.cvBuild');
  const tErrors = useTranslations('Errors');

  return useMutation({
    mutationFn: async (vars: Vars): Promise<CandidateResumeItem> => {
      await webHttp.patch('/api/candidate/profile', vars.profile);
      const res = await webHttp.post<CandidateResumeItem>(
        '/api/candidate/resumes/generate',
        { templateCode: vars.templateCode },
      );
      return res.data;
    },
    onMutate: () => {
      toast.loading(t('toastSaving'), { id: TOAST_ID });
    },
    onSuccess: () => {
      toast.success(t('toastGenerated'), { id: TOAST_ID });
      router.push('/candidate/profile');
    },
    onError: (err) => {
      toast.error(
        getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator),
        { id: TOAST_ID },
      );
    },
  });
}
