import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Url } from './url.entity';
import { UrlsService } from './urls.service';
import { UrlsController } from './urls.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Url])],
  providers: [UrlsService],
  controllers: [UrlsController],
})
export class UrlsModule {}
