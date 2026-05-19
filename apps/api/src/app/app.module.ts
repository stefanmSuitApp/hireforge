import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { devUserMiddleware } from '../auth/dev-user.middleware';
import { jwtAuthMiddleware } from '../auth/jwt-auth.middleware';
import { correlationMiddleware } from '../observability/correlation.middleware';
import { CmsModule } from '../cms/cms.module';
import { CandidateModule } from '../candidate/candidate.module';
import { EmployerModule } from '../employer/employer.module';
import { ModerationModule } from '../moderation/moderation.module';
import { StaffModule } from '../staff/staff.module';
import { HealthModule } from '../health/health.module';
import { IntegrationModule } from '../integration/integration.module';
import { InternalModule } from '../internal/internal.module';
import { PublicJobsModule } from '../public-jobs/public-jobs.module';
import { BillingModule } from '../billing/billing.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    BillingModule,
    HealthModule,
    CmsModule,
    IntegrationModule,
    InternalModule,
    PublicJobsModule,
    AuthModule,
    EmployerModule,
    CandidateModule,
    ModerationModule,
    StaffModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(correlationMiddleware, devUserMiddleware, jwtAuthMiddleware)
      .forRoutes({
        path: '*path',
        method: RequestMethod.ALL,
      });
  }
}
