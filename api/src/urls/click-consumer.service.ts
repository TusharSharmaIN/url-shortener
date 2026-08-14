import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type Redis from 'ioredis';
import { Url } from './models/url.entity';
import { REDIS_CLIENT } from '../redis/redis.module';

const STREAM_KEY = 'clicks-stream';
const GROUP_NAME = 'clicks-consumer-group';
const CONSUMER_NAME = 'embedded-consumer-1';
const BATCH_SIZE = 10;
const BLOCK_MS = 5000;

@Injectable()
export class ClickConsumerService implements OnModuleInit {
  private readonly logger = new Logger(ClickConsumerService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(Url) private readonly urlsRepository: Repository<Url>,
  ) {}

  async onModuleInit() {
    // Only run the embedded consumer when explicitly enabled —
    // keeps local Docker Compose (which uses the separate `worker` container) unaffected.
    if (process.env.EMBEDDED_WORKER !== 'true') return;

    this.logger.log('Starting embedded click consumer...');
    await this.ensureConsumerGroup();
    await this.reclaimPendingEntries();
    this.processLoop(); // deliberately not awaited — runs forever in the background
  }

  private async ensureConsumerGroup() {
    try {
      await this.redis.xgroup(
        'CREATE',
        STREAM_KEY,
        GROUP_NAME,
        '$',
        'MKSTREAM',
      );
    } catch (err: any) {
      if (!err.message.includes('BUSYGROUP')) throw err;
    }
  }

  private async insertClicks(
    events: { shortCode: string; timestamp: string }[],
  ) {
    if (events.length === 0) return;
    const values = events
      .map(
        (e) =>
          `('${e.shortCode}', to_timestamp(${Number(e.timestamp) / 1000}))`,
      )
      .join(', ');
    await this.urlsRepository.query(
      `INSERT INTO clicks (short_code, clicked_at) VALUES ${values}`,
    );
  }

  private async reclaimPendingEntries() {
    const response: any = await this.redis.xreadgroup(
      'GROUP',
      GROUP_NAME,
      CONSUMER_NAME,
      'COUNT',
      BATCH_SIZE,
      'STREAMS',
      STREAM_KEY,
      '0',
    );
    if (!response) return;
    const [[, entries]] = response;
    if (entries.length === 0) return;

    const events = entries.map(([, fields]: [string, string[]]) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
      return { shortCode: obj.shortCode, timestamp: obj.timestamp };
    });
    const entryIds = entries.map(([id]: [string]) => id);

    await this.insertClicks(events);
    await this.redis.xack(STREAM_KEY, GROUP_NAME, ...entryIds);
    this.logger.log(`Reclaimed ${events.length} pending click(s).`);
  }

  private async processLoop() {
    while (true) {
      try {
        const response: any = await this.redis.xreadgroup(
          'GROUP',
          GROUP_NAME,
          CONSUMER_NAME,
          'COUNT',
          BATCH_SIZE,
          'BLOCK',
          BLOCK_MS,
          'STREAMS',
          STREAM_KEY,
          '>',
        );
        if (!response) continue;

        const [[, entries]] = response;
        const events = entries.map(([, fields]: [string, string[]]) => {
          const obj: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2)
            obj[fields[i]] = fields[i + 1];
          return { shortCode: obj.shortCode, timestamp: obj.timestamp };
        });
        const entryIds = entries.map(([id]: [string]) => id);

        await this.insertClicks(events);
        await this.redis.xack(STREAM_KEY, GROUP_NAME, ...entryIds);
        this.logger.log(`Processed and acked ${events.length} click(s).`);
      } catch (err) {
        this.logger.error('Error in embedded consumer loop', err);
        await new Promise((r) => setTimeout(r, 2000)); // brief backoff before retrying
      }
    }
  }
}
