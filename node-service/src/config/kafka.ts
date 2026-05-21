import { Kafka } from 'kafkajs';
import env from './env';

const kafka = new Kafka({
  clientId: 'ecowatch-node-service',
  brokers:  [env.KAFKA_BROKER],
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: env.KAFKA_GROUP });

export const connectKafka = async (): Promise<void> => {
  try {
    await producer.connect();
    await consumer.connect();
    console.log('✅ Kafka connected');
  } catch (error) {
    console.error('❌ Kafka connection failed:', error);
    process.exit(1);
  }
};

export default kafka;
