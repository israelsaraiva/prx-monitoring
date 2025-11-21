import { EachMessagePayload, Kafka } from 'kafkajs';
import { NextRequest } from 'next/server';
import { sendKafkaMessage } from '../utils';

interface ConsumerData {
  consumer: ReturnType<Kafka['consumer']>;
  runPromise: Promise<void> | null;
  stop: () => Promise<void>;
}

const consumers = new Map<string, ConsumerData>();

const CONNECTION_TIMEOUT = 10000;

export async function POST(request: NextRequest) {
  try {
    const { broker, topics, consumerId } = await request.json();

    if (!broker || !topics || !consumerId) {
      return Response.json({ error: 'Missing required fields: broker, topics, consumerId' }, { status: 400 });
    }

    // Stop all existing consumers to prevent orphaned consumers
    // This ensures only one active consumer at a time
    const consumerIdsToStop = Array.from(consumers.keys());

    const stopPromises = consumerIdsToStop.map(async (id) => {
      const existingConsumer = consumers.get(id);
      if (existingConsumer) {
        try {
          // Remove from map first to prevent message processing
          consumers.delete(id);
          await existingConsumer.stop();
        } catch (error) {
          console.error(`Error stopping consumer ${id}:`, error);
          // Ensure it's removed even if stop fails
          consumers.delete(id);
        }
      } else {
        consumers.delete(id);
      }
    });

    // Wait for all consumers to stop (with timeout)
    await Promise.race([
      Promise.all(stopPromises),
      new Promise((resolve) => setTimeout(resolve, 5000)), // 5 second timeout
    ]);

    const brokerList = broker
      .split(',')
      .map((b: string) => b.trim())
      .filter(Boolean);
    if (brokerList.length === 0) {
      return Response.json({ error: 'Invalid broker configuration' }, { status: 400 });
    }

    const kafka = new Kafka({
      brokers: brokerList,
      clientId: 'subscriber-tool',
      connectionTimeout: CONNECTION_TIMEOUT,
      requestTimeout: CONNECTION_TIMEOUT,
    });

    const consumer = kafka.consumer({
      groupId: `subscriber-tool-${consumerId}`,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    try {
      await Promise.race([
        consumer.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT)),
      ]);
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? `Failed to connect to Kafka broker: ${error.message}`
              : 'Failed to connect to Kafka broker',
        },
        { status: 500 }
      );
    }

    const topicList = topics
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
    if (topicList.length === 0) {
      await consumer.disconnect();
      return Response.json({ error: 'No valid topics provided' }, { status: 400 });
    }

    try {
      await consumer.subscribe({ topics: topicList, fromBeginning: false });
    } catch (error) {
      await consumer.disconnect();
      return Response.json(
        {
          error:
            error instanceof Error
              ? `Failed to subscribe to topics: ${error.message}`
              : 'Failed to subscribe to topics',
        },
        { status: 500 }
      );
    }

    // Add consumer to map first so messages can be queued if EventSource isn't ready yet
    const stop = async () => {
      try {
        await consumer.stop();
        await consumer.disconnect();
      } catch (error) {
        console.error(`Error stopping consumer ${consumerId}:`, error);
      }
      consumers.delete(consumerId);
    };

    consumers.set(consumerId, { consumer, runPromise: null, stop });

    const runPromise = consumer
      .run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          // Check if this consumer is still in the map (not stopped)
          if (!consumers.has(consumerId)) {
            return;
          }

          try {
            let flowId = 'unknown';
            let flowIdSource = 'none';

            if (message.headers) {
              const flowIdHeader = message.headers.flowId || message.headers.flowid || message.headers['flow-id'];
              if (flowIdHeader) {
                flowId = flowIdHeader.toString();
                flowIdSource = 'header';
              }
            }

            if (flowId === 'unknown' && message.value) {
              try {
                const messageContent = message.value.toString();
                const parsedContent = JSON.parse(messageContent);

                const findFlowId = (obj: Record<string, unknown>): string | null => {
                  if (typeof obj !== 'object' || obj === null) return null;

                  // Priority 1: Check resource.flowId first
                  if (obj.resource && typeof obj.resource === 'object' && obj.resource !== null) {
                    const resource = obj.resource as Record<string, unknown>;
                    if (resource.flowId) return String(resource.flowId);
                    if (resource.flowid) return String(resource.flowid);
                    if (resource['flow-id']) return String(resource['flow-id']);
                    if (resource['flow_id']) return String(resource['flow_id']);
                  }

                  // Priority 2: Check direct flowId fields at root level
                  if (obj.flowId) return String(obj.flowId);
                  if (obj.flowid) return String(obj.flowid);
                  if (obj['flow-id']) return String(obj['flow-id']);
                  if (obj['flow_id']) return String(obj['flow_id']);

                  // Priority 3: Recursively search in nested objects (excluding resource to avoid duplicate checks)
                  for (const [key, value] of Object.entries(obj)) {
                    if (key !== 'resource' && typeof value === 'object' && value !== null) {
                      const found = findFlowId(value as Record<string, unknown>);
                      if (found) return found;
                    }
                  }

                  return null;
                };

                const foundFlowId = findFlowId(parsedContent);
                if (foundFlowId) {
                  flowId = foundFlowId;
                  flowIdSource = 'json-content';
                }
              } catch {
                // If JSON parsing fails, continue with other methods
              }
            }

            if (flowId === 'unknown' && message.key) {
              flowId = message.key.toString();
              flowIdSource = 'key';
            }

            const kafkaMessage = {
              type: 'message',
              topic,
              partition,
              offset: String(message.offset),
              key: message.key?.toString() || null,
              value: message.value?.toString() || '',
              headers: message.headers
                ? Object.fromEntries(Object.entries(message.headers).map(([k, v]) => [k, v?.toString()]))
                : {},
              timestamp: Date.now(),
              flowId,
              flowIdSource,
            };

            sendKafkaMessage(consumerId, kafkaMessage);
          } catch (error) {
            console.error('Error processing Kafka message:', error);
          }
        },
        eachBatch: async ({ batch }) => {
          // Check if this consumer is still in the map (not stopped)
          if (!consumers.has(consumerId)) {
            return;
          }
        },
      })
      .catch((error) => {
        console.error(`Error in consumer.run() for ${consumerId}:`, error);
        consumers.delete(consumerId);
      });

    // Update the runPromise in the map
    const consumerData = consumers.get(consumerId);
    if (consumerData) {
      consumerData.runPromise = runPromise;
    }

    // Wait for the consumer to join the consumer group and be ready to receive messages
    // This ensures messages produced after connection will be received
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return Response.json({ success: true, consumerId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return Response.json(
        {
          error: `Cannot connect to Kafka broker. Please check if the broker is running and accessible at the provided address.`,
        },
        { status: 500 }
      );
    }

    return Response.json({ error: `Failed to connect to Kafka: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const consumerId = searchParams.get('consumerId');

    if (!consumerId) {
      return Response.json({ error: 'Missing consumerId' }, { status: 400 });
    }

    const consumerData = consumers.get(consumerId);
    if (consumerData) {
      try {
        await consumerData.stop();
      } catch (error) {
        console.error('Error stopping consumer:', error);
      }
      consumers.delete(consumerId);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Consumer not found' }, { status: 404 });
  } catch (error) {
    console.error('DELETE error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
