import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Url } from './url.entity';
import { toBase62 } from './base62.util';

@Injectable()
export class UrlsService {
  constructor(
    @InjectRepository(Url)
    private readonly urlsRepository: Repository<Url>,
  ) {}

  async shorten(longUrl: string): Promise<Url> {
    const newUrl = this.urlsRepository.create({
      longUrl,
      shortCode: 'pending',
    });
    const saved = await this.urlsRepository.save(newUrl);

    // insert first (placeholder code), then update with the real code
    saved.shortCode = toBase62(saved.id);
    return this.urlsRepository.save(saved);
  }

  async findByShortCode(shortCode: string): Promise<Url | null> {
    return this.urlsRepository.findOneBy({ shortCode });
  }
}
