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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { UrlsService } from './urls.service';
import { CreateUrlDto } from './dtos/create-url.dto';

@ApiTags('urls')
@Controller()
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @ApiOperation({ summary: 'Create a short URL' })
  @ApiResponse({ status: 201, description: 'Short URL created' })
  @ApiResponse({ status: 400, description: 'Invalid URL' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @UseGuards(RateLimitGuard)
  @Post('shorten')
  async shorten(@Body() dto: CreateUrlDto) {
    const url = await this.urlsService.shorten(dto.longUrl);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return {
      shortCode: url.shortCode,
      shortUrl: `${baseUrl}/${url.shortCode}`,
      longUrl: url.longUrl,
    };
  }

  @ApiOperation({
    summary: 'Redirect to the original URL',
    description:
      'Returns a 302 redirect. Browser-based testing tools may show a fetch/CORS error when the redirect target is cross-origin — this is expected; test with curl -i to see the raw response.',
  })
  @ApiParam({ name: 'code', example: '1' })
  @ApiResponse({ status: 302, description: 'Redirects to the long URL' })
  @ApiResponse({ status: 404, description: 'Short code not found' })
  @UseGuards(RateLimitGuard)
  @Get(':code')
  async redirect(@Param('code') code: string, @Res() res: Response) {
    const longUrl = await this.urlsService.findByShortCode(code);
    if (!longUrl) {
      throw new NotFoundException('URL not found');
    }
    return res.redirect(302, longUrl);
  }

  @ApiOperation({ summary: 'Get click stats for a short code' })
  @ApiParam({ name: 'code', example: '1' })
  @Get('stats/:code')
  async stats(@Param('code') code: string) {
    return this.urlsService.getStats(code);
  }
}
