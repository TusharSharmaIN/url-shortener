import { Module, Global, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

export const KAFKA_PRODUCER = 'KAFKA_PRODUCER';

const logger = new Logger('KafkaModule');

@Global()
@Module({
  providers: [
    {
      provide: KAFKA_PRODUCER,
      useFactory: async (): Promise<Producer | null> => {
        // Skip Kafka entirely if not configured to use it — don't block boot on a broker that isn't running.
        if (process.env.ANALYTICS_TRANSPORT !== 'kafka') {
          logger.log(
            'ANALYTICS_TRANSPORT is not "kafka" — skipping Kafka connection.',
          );
          return null;
        }

        const kafka = new Kafka({
          clientId: 'url-shortener-api',
          brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
          retry: { retries: 2 }, // fail fast instead of default long retry backoff
        });
        const producer = kafka.producer();

        try {
          await producer.connect();
          logger.log('Kafka producer connected.');
          return producer;
        } catch (err) {
          logger.error(
            'Kafka connection failed — continuing without Kafka.',
            err,
          );
          return null; // app boots successfully even if Kafka is unreachable
        }
      },
    },
  ],
  exports: [KAFKA_PRODUCER],
})
export class KafkaModule {}
