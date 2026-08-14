import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { UrlsService } from './urls.service';
import { CreateUrlDto } from './dtos/create-url.dto';

@Controller()
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @UseGuards(RateLimitGuard)
  @Post('shorten')
  async shorten(@Body() dto: CreateUrlDto) {
    const url = await this.urlsService.shorten(dto.longUrl);
    return {
      shortCode: url.shortCode,
      //   shortUrl: `${process.env.APP_URL}/${url.shortCode}`,
      shortUrl: `http://localhost:3000/${url.shortCode}`,
      longUrl: url.longUrl,
    };
  }

  @Get('stats/:code')
  async stats(@Param('code') code: string) {
    return this.urlsService.getStats(code);
  }

  @UseGuards(RateLimitGuard)
  @Get(':code')
  async redirect(@Param('code') code: string, @Res() res: Response) {
    const longUrl = await this.urlsService.findByShortCode(code);
    if (!longUrl) {
      throw new NotFoundException('URL not found');
    }
    return res.redirect(302, longUrl);
  }
}
