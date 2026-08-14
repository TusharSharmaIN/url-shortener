import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

@Injectable()
export class RateLimitService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async checkFixedWindow(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:fixed:${key}`;
    const count = await this.redis.incr(redisKey);

    if (count === 1) {
      // first request in this window — start the clock
      await this.redis.expire(redisKey, windowSeconds);
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
    };
  }

  async checkSlidingWindow(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:sliding:${key}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Drop entries older than our rolling window
    await this.redis.zremrangebyscore(redisKey, 0, windowStart);

    // Count what's left (requests still "inside" the window)
    const count = await this.redis.zcard(redisKey);

    if (count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Record this request — score AND member both = timestamp.
    // Using the timestamp as the member (not just score) keeps entries unique
    // even if two requests land in the same millisecond would collide otherwise,
    // so we add a small random suffix to guarantee uniqueness.
    const member = `${now}-${Math.random()}`;
    await this.redis.zadd(redisKey, now, member);

    // Self-cleanup: expire the whole key if unused for a while
    await this.redis.expire(redisKey, windowSeconds);

    return { allowed: true, remaining: limit - count - 1 };
  }
}
