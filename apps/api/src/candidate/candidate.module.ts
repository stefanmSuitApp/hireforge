import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';

@Module({
  imports: [StorageModule],
  controllers: [CandidateController],
  providers: [CandidateService],
})
export class CandidateModule {}
