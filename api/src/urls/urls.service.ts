import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type Redis from 'ioredis';
import { Url } from './models/url.entity';
import { toBase62 } from './utils/base62.util';
import { REDIS_CLIENT } from '../redis/redis.module';
import type { Producer } from 'kafkajs';
import { KAFKA_PRODUCER } from '../kafka/kafka.module';

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour
const STREAM_KEY = 'clicks-stream';
const TOPIC = 'clicks-topic';

@Injectable()
export class UrlsService {
  private readonly logger = new Logger(UrlsService.name);

  constructor(
    @InjectRepository(Url)
    private readonly urlsRepository: Repository<Url>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    @Inject(KAFKA_PRODUCER)
    private readonly kafkaProducer: Producer,
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

  async getStats(
    shortCode: string,
  ): Promise<{ shortCode: string; totalClicks: number }> {
    const result = await this.urlsRepository.query(
      `SELECT COUNT(*) as count FROM clicks WHERE short_code = $1`,
      [shortCode],
    );
    return { shortCode, totalClicks: parseInt(result[0].count, 10) };
  }

  private recordClick(shortCode: string): void {
    const eventPayload = { shortCode, timestamp: Date.now().toString() };

    if (process.env.ANALYTICS_TRANSPORT === 'kafka' && this.kafkaProducer) {
      this.kafkaProducer
        .send({
          topic: TOPIC,
          messages: [{ value: JSON.stringify(eventPayload) }],
        })
        .catch((err) =>
          this.logger.error('Failed to send click event to Kafka', err),
        );
    } else {
      this.redis
        .xadd(
          'clicks-stream',
          '*',
          'shortCode',
          shortCode,
          'timestamp',
          eventPayload.timestamp,
        )
        .catch((err) =>
          this.logger.error(
            'Failed to record click event to Redis Stream',
            err,
          ),
        );
    }
  }
}
