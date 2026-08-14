import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Url } from './url.entity';
import { UrlsService } from './urls.service';
import { UrlsController } from './urls.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { ClickConsumerService } from './click-consumer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Url]), RateLimitModule],
  providers: [UrlsService, ClickConsumerService],
  controllers: [UrlsController],
})
export class UrlsModule {}
