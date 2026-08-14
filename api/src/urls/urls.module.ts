import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Url } from './models/url.entity';
import { UrlsService } from './urls.service';
import { UrlsController } from './urls.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { ClickConsumerService } from './click-consumer.service';
import { Click } from './models/click.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Url, Click]), RateLimitModule],
  providers: [UrlsService, ClickConsumerService],
  controllers: [UrlsController],
})
export class UrlsModule {}
