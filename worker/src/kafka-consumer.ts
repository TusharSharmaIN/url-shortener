import { Kafka, Consumer, logLevel } from "kafkajs";
import { insertClicks } from "./db";
import { logger } from "./logger";

const TOPIC = process.env.KAFKA_TOPIC || "clicks-topic";
const GROUP_ID = process.env.KAFKA_GROUP_ID || "clicks-consumer-group-kafka";
const BROKERS = (process.env.KAFKA_BROKER || "localhost:9092").split(",");

export async function startKafkaConsumer() {
  const kafka = new Kafka({
    clientId: "url-shortener-worker",
    brokers: BROKERS,
    retry: { retries: 8, initialRetryTime: 300 },
    logLevel: logLevel.ERROR,
  });

  // 1. Ensure Topic Creation
  const admin = kafka.admin();
  try {
    await admin.connect();
    const existingTopics = await admin.listTopics();
    if (!existingTopics.includes(TOPIC)) {
      logger.info(`Kafka topic "${TOPIC}" missing. Creating...`);
      await admin.createTopics({
        topics: [{ topic: TOPIC, numPartitions: 3, replicationFactor: 1 }],
      });
      logger.info(`Kafka topic "${TOPIC}" created.`);
    }
  } catch (err) {
    logger.warn("Failed topic validation via admin client:", err);
  } finally {
    await admin.disconnect().catch(() => {});
  }

  // 2. Initialize Consumer
  const consumer = kafka.consumer({ groupId: GROUP_ID });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });
  logger.info("Kafka consumer connected and subscribed.");

  // 3. Graceful Shutdown Hooks
  const shutdown = async () => {
    logger.info("Disconnecting Kafka consumer...");
    await consumer.disconnect();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  // 4. Batch Processing Loop with Poison-Pill Resilience
  await consumer.run({
    autoCommit: false,
    eachBatch: async ({ batch, resolveOffset, heartbeat, isStale }) => {
      const validEvents: Array<{ shortCode: string; timestamp: number }> = [];

      for (const message of batch.messages) {
        if (isStale()) break;
        if (!message.value) continue;

        try {
          const payload = JSON.parse(message.value.toString());
          if (payload && payload.shortCode && payload.timestamp) {
            validEvents.push(payload);
          } else {
            logger.warn(
              `Malformed payload skipped at offset ${message.offset}`,
            );
          }
        } catch (parseErr) {
          logger.error(
            `Poison pill (JSON parse error) at offset ${message.offset}`,
            parseErr,
          );
        }

        resolveOffset(message.offset);
        await heartbeat();
      }

      if (validEvents.length > 0) {
        await insertClicks(validEvents);
        await consumer.commitOffsets([
          {
            topic: batch.topic,
            partition: batch.partition,
            offset: (
              Number(batch.messages[batch.messages.length - 1].offset) + 1
            ).toString(),
          },
        ]);
        logger.info(
          `Batch inserted & committed ${validEvents.length} click events.`,
        );
      }
    },
  });
}
