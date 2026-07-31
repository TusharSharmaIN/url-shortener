import 'dotenv/config';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

async function main() {
  const pong = await redis.ping();
  console.log('Worker connected to Redis:', pong);
}

main().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});