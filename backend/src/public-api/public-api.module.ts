import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { ThrottlerModule } from '@nestjs/throttler';

// Module for the public api which defines a throttler guard
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'public-api',
          ttl: 60000, // up to 10 requests per minute
          limit: 10,
        },
      ],
    }),
  ],
  controllers: [TopicsController],
  providers: [TopicsService]
})
export class PublicApiModule {}