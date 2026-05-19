import { Injectable } from '@nestjs/common';
import { pingDb } from '../database';
import { pingRedis } from '../redis';

@Injectable()
export class AppService {
  async getData(): Promise<{
    message: string;
    postgres: 'up' | 'down';
    redis: 'up' | 'down';
  }> {
    const postgres = (await pingDb()) ? 'up' : 'down';
    const redis = (await pingRedis()) ? 'up' : 'down';
    return { message: 'Hello API', postgres, redis };
  }
}
