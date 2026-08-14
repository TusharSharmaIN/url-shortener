import "dotenv/config";
import Redis from "ioredis";
import { insertClicks } from "./db";
import { logger } from "./logger";
import { startKafkaConsumer } from "./kafka-consumer";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
});

const STREAM_KEY = "clicks-stream";
const GROUP_NAME = "clicks-consumer-group";
const CONSUMER_NAME = "worker-1";
const BATCH_SIZE = 10;
const BLOCK_MS = 5000;

async function ensureConsumerGroup() {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "$", "MKSTREAM");
    logger.info("Consumer group created");
  } catch (err: any) {
    if (err.message.includes("BUSYGROUP")) {
      logger.info("Consumer group already exists, continuing.");
    } else {
      throw err;
    }
  }
}

async function reclaimPendingEntries() {
  // '0' means "read from the beginning of this consumer's pending list" —
  // i.e. entries that were delivered to us before but never acked (e.g. we crashed).
  const response = await redis.xreadgroup(
    "GROUP",
    GROUP_NAME,
    CONSUMER_NAME,
    "COUNT",
    BATCH_SIZE,
    "STREAMS",
    STREAM_KEY,
    "0",
  );

  if (!response) return;

  const [[, entries]] = response as any;
  if (entries.length === 0) {
    logger.info("No pending entries to reclaim.");
    return;
  }

  logger.info(
    `Reclaiming ${entries.length} pending entrie(s) from before restart...`,
  );

  const events = entries.map(([, fields]: [string, string[]]) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
    return { shortCode: obj.shortCode, timestamp: obj.timestamp };
  });
  const entryIds = entries.map(([id]: [string]) => id);

  await insertClicks(events);
  await redis.xack(STREAM_KEY, GROUP_NAME, ...entryIds);
  logger.info(
    `Reclaimed and acked ${events.length} previously-pending click(s).`,
  );
}

async function processLoop() {
  while (true) {
    const response = await redis.xreadgroup(
      "GROUP",
      GROUP_NAME,
      CONSUMER_NAME,
      "COUNT",
      BATCH_SIZE,
      "BLOCK",
      BLOCK_MS,
      "STREAMS",
      STREAM_KEY,
      ">",
    );
    if (!response || response.length === 0) {
      continue;
    }

    const [[, entries]] = response as any;

    const events = entries.map(([, fields]: [string, string[]]) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        obj[fields[i]] = fields[i + 1];
      }
      return { shortCode: obj.shortCode, timestamp: obj.timestamp };
    });

    const entryIds = entries.map(([id]: [string]) => id);

    try {
      await insertClicks(events);
      // XACK: tell Redis "these entries are fully processed, stop tracking them as pending."
      await redis.xack(STREAM_KEY, GROUP_NAME, ...entryIds);
      logger.info(`Processed and acked ${events.length} click(s).`);
    } catch (err) {
      // Deliberately DON'T XACK here — if insert fails, entries stay "pending"
      // and will be re-claimed/retried on next restart. This is the durability guarantee.
      logger.error("Failed to process batch, will retry on restart:", err);
    }
  }
}

async function main() {
  const pong = await redis.ping();
  logger.info(`Worker connected to Redis: ${pong}`);
  await ensureConsumerGroup();
  await reclaimPendingEntries();

  if (process.env.ANALYTICS_TRANSPORT === "kafka") {
    logger.info("Starting Kafka consumer...");
    await startKafkaConsumer();
  } else {
    logger.info("Starting Redis Streams read loop...");
    await processLoop();
  }
}

main().catch((err) => {
  logger.error("Worker failed to start:", err);
  process.exit(1);
});
