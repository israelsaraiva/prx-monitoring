import { Kafka } from 'kafkajs';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { broker, topic, key, value, headers } = await request.json();

    if (!broker || !topic || !value) {
      return Response.json({ error: 'Missing required fields: broker, topic, value' }, { status: 400 });
    }

    const brokerList = broker
      .split(',')
      .map((b: string) => b.trim())
      .filter((b: string) => b.length > 0);

    if (brokerList.length === 0) {
      return Response.json({ error: 'Invalid broker configuration' }, { status: 400 });
    }

    const kafka = new Kafka({
      clientId: 'macc-producer',
      brokers: brokerList,
    });

    const producer = kafka.producer();

    try {
      await producer.connect();

      const messageHeaders: Record<string, string> = {};
      if (headers) {
        try {
          const parsedHeaders = typeof headers === 'string' ? JSON.parse(headers) : headers;
          if (typeof parsedHeaders === 'object' && parsedHeaders !== null) {
            Object.entries(parsedHeaders).forEach(([k, v]) => {
              messageHeaders[k] = String(v);
            });
          }
        } catch {
          // Invalid headers format, ignore
        }
      }

      const result = await producer.send({
        topic,
        messages: [
          {
            key: key || null,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            headers: messageHeaders,
          },
        ],
      });

      await producer.disconnect();

      return Response.json({
        success: true,
        topic,
        partition: result[0].partition,
        offset: result[0].offset,
      });
    } catch (error) {
      await producer.disconnect().catch(() => {
        // Ignore disconnect errors
      });
      throw error;
    }
  } catch (error) {
    console.error('Error producing message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
