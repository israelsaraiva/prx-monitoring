import { NextRequest } from 'next/server';

// Declare global types for our Maps
declare global {
  // eslint-disable-next-line no-var
  var kafkaMessageStreams: Map<string, ReadableStreamDefaultController> | undefined;
  // eslint-disable-next-line no-var
  var kafkaMessageQueues: Map<string, unknown[]> | undefined;
}

// Use globalThis to ensure the Map persists across hot reloads and module recompilations
const getMessageStreams = () => {
  if (!globalThis.kafkaMessageStreams) {
    globalThis.kafkaMessageStreams = new Map<string, ReadableStreamDefaultController>();
  }
  return globalThis.kafkaMessageStreams;
};

const getMessageQueues = () => {
  if (!globalThis.kafkaMessageQueues) {
    globalThis.kafkaMessageQueues = new Map<string, unknown[]>();
  }
  return globalThis.kafkaMessageQueues;
};

const messageStreams = getMessageStreams();
const messageQueues = getMessageQueues();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const consumerId = searchParams.get('consumerId');

  if (!consumerId) {
    return Response.json({ error: 'Missing consumerId' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      messageStreams.set(consumerId, controller);

      // Send queued messages if any
      const queue = messageQueues.get(consumerId);
      if (queue && queue.length > 0) {
        queue.forEach((message) => {
          try {
            const data = `data: ${JSON.stringify(message)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            console.error('Error sending queued message:', error);
          }
        });
        messageQueues.delete(consumerId);
      }

      try {
        const testMessage = `data: ${JSON.stringify({ type: 'connection-test', consumerId })}\n\n`;
        controller.enqueue(encoder.encode(testMessage));
      } catch {
        // Ignore errors sending test message
      }
    },
    cancel() {
      messageStreams.delete(consumerId);
      messageQueues.delete(consumerId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

export function sendKafkaMessage(consumerId: string, message: unknown) {
  const controller = messageStreams.get(consumerId);
  if (controller) {
    try {
      const data = `data: ${JSON.stringify(message)}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    } catch (error) {
      console.error('Error sending message to stream:', error);
      messageStreams.delete(consumerId);
    }
  } else {
    // Queue message until EventSource stream is ready
    if (!messageQueues.has(consumerId)) {
      messageQueues.set(consumerId, []);
    }
    const queue = messageQueues.get(consumerId);
    if (queue) {
      queue.push(message);
      // Limit queue size to prevent memory issues
      if (queue.length > 100) {
        queue.shift();
      }
    }
  }
}
