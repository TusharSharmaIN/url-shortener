import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type Redis from 'ioredis';
import { Url } from './url.entity';
import { toBase62 } from './base62.util';
import { REDIS_CLIENT } from '../redis/redis.module';

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour
const STREAM_KEY = 'clicks-stream';

@Injectable()
export class UrlsService {
  private readonly logger = new Logger(UrlsService.name);

  constructor(
    @InjectRepository(Url)
    private readonly urlsRepository: Repository<Url>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
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

  async findByShortCode(shortCode: string): Promise<string | null> {
    const cached = await this.redis.get(`shortcode:${shortCode}`);
    if (cached) {
      this.logger.log(`Cache HIT for ${shortCode}`);
      this.recordClick(shortCode);
      return cached;
    }

    this.logger.log(`Cache MISS for ${shortCode}`);
    const url = await this.urlsRepository.findOneBy({ shortCode });
    if (!url) return null;

    await this.redis.set(
      `shortcode:${shortCode}`,
      url.longUrl,
      'EX',
      CACHE_TTL_SECONDS,
    );
    this.recordClick(shortCode);
    return url.longUrl;
  }

  async getStats(shortCode: string): Promise<{ shortCode: string; totalClicks: number }> {
    const result = await this.urlsRepository.query(
      `SELECT COUNT(*) as count FROM clicks WHERE short_code = $1`,
      [shortCode],
    );
    return { shortCode, totalClicks: parseInt(result[0].count, 10) };
  }

  private recordClick(shortCode: string): void {
    this.redis
      .xadd(
        STREAM_KEY,
        '*',
        'shortCode',
        shortCode,
        'timestamp',
        Date.now().toString(),
      )
      .catch((err) => this.logger.error('Failed to record click event', err));
  }
}
