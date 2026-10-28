import type { HttpException } from '@nestjs/common';
import type { TransitionJobPublishedResult } from 'server-jobs';

import { codedBadRequest, codedConflict } from '../http/coded-http';

type PublishFailureCode = Extract<
  TransitionJobPublishedResult,
  { ok: false }
>['code'];

/** Maps a failed `transitionJobToPublished` to the HTTP error staff UIs show. */
export function publishFailure(code: PublishFailureCode): HttpException {
  switch (code) {
    case 'JOB_INVALID_STATE':
      return codedConflict(
        'JOB_INVALID_STATE',
        'This job changed state meanwhile and can no longer be published',
      );
    case 'JOB_SUBSCRIPTION_NOT_ACTIVE':
      return codedBadRequest(
        'JOB_SUBSCRIPTION_NOT_ACTIVE',
        "The job's package subscription is not active",
      );
    case 'JOB_SLUG_COLLISION':
      return codedBadRequest(
        'JOB_SLUG_COLLISION',
        'Could not allocate a unique job slug; retry publish',
      );
  }
}
