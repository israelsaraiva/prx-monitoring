import { NextRequest } from 'next/server';

const messageStreams = new Map<string, ReadableStreamDefaultController>();
const messageQueues = new Map<string, unknown[]>();

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
