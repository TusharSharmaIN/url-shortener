import { Module, Global, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

export const KAFKA_PRODUCER = 'KAFKA_PRODUCER';

@Global()
@Module({
  providers: [
    {
      provide: KAFKA_PRODUCER,
      useFactory: async (): Promise<Producer> => {
        const kafka = new Kafka({
          clientId: 'url-shortener-api',
          brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        });
        const producer = kafka.producer();
        await producer.connect();
        return producer;
      },
    },
  ],
  exports: [KAFKA_PRODUCER],
})
export class KafkaModule {}