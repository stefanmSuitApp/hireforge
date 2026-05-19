import { Global, Module } from '@nestjs/common';

import { BillingContentService } from './billing-content.service';
import { BillingPdfService } from './billing-pdf.service';
import { BillingStorageService } from './billing-storage.service';

@Global()
@Module({
  providers: [BillingContentService, BillingStorageService, BillingPdfService],
  exports: [BillingContentService, BillingStorageService, BillingPdfService],
})
export class BillingModule {}
