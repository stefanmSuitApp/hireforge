import { Module } from '@nestjs/common';

import { JobDescriptionMediaPublicController } from './job-description-media-public.controller';
import { JobDescriptionMediaService } from './job-description-media.service';
import { JobMediaStorageService } from './job-media-storage.service';

@Module({
  controllers: [JobDescriptionMediaPublicController],
  providers: [JobMediaStorageService, JobDescriptionMediaService],
  exports: [JobDescriptionMediaService],
})
export class JobMediaModule {}
