import { Controller, Post, Body } from '@nestjs/common';
import { UrlsService } from './urls.service';
import { CreateUrlDto } from './dto/create-url.dto';

@Controller()
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

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
}
