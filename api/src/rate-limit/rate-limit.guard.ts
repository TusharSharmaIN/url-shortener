import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || 'unknown';
    const route = request.route?.path || request.path;
    const key = `${ip}:${route}`;

    const algorithm = process.env.RATE_LIMIT_ALGORITHM || 'fixed';
    const limit = Number(process.env.RATE_LIMIT_LIMIT) || 5;
    const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 60;

    const result =
      algorithm === 'sliding'
        ? await this.rateLimitService.checkSlidingWindow(key, limit, windowSeconds)
        : await this.rateLimitService.checkFixedWindow(key, limit, windowSeconds);
        
    if (!result.allowed) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}