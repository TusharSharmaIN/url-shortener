import { Kafka } from "kafkajs";
import { insertClicks } from "./db";
import { logger } from "./logger";

const TOPIC = "clicks-topic";
const GROUP_ID = "clicks-consumer-group-kafka";

export async function startKafkaConsumer() {
  const kafka = new Kafka({
    clientId: "url-shortener-worker",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  });

  const consumer = kafka.consumer({
    groupId: GROUP_ID,
  });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  logger.info("Kafka consumer connected and subscribed.");

  await consumer.run({
    autoCommit: false, // we commit manually, only after a successful DB write
    eachMessage: async ({ message, partition, topic }) => {
      if (!message.value) return;

      const event = JSON.parse(message.value.toString()) as {
        shortCode: string;
        timestamp: number;
      };

      try {
        await insertClicks([event]);
        // Manual commit: tells Kafka "processed everything up to and including this offset"
        await consumer.commitOffsets([
          {
            topic,
            partition,
            offset: (Number(message.offset) + 1).toString(), // Kafka convention: commit offset = next offset to read
          },
        ]);
        logger.info(`Processed and committed click for ${event.shortCode}`);
      } catch (err) {
        logger.error(
          "Failed to process Kafka message, will retry on restart",
          err,
        );
        // deliberately don't commit — on restart, consumer resumes from last committed offset
      }
    },
  });
}
