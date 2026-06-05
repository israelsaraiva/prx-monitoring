import { NextRequest } from 'next/server';
import { getMessageQueuesMap, getMessageStreamsMap } from '../utils';

const messageStreams = getMessageStreamsMap();
const messageQueues = getMessageQueuesMap();

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

      // Send a keepalive comment every 15 seconds to prevent proxy/load-balancer idle timeouts
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          clearInterval(keepaliveInterval);
        }
      }, 15000);

      // Store interval reference on the controller so cancel() can clear it
      (controller as unknown as { _keepaliveInterval: ReturnType<typeof setInterval> })._keepaliveInterval =
        keepaliveInterval;
    },
    cancel(controller) {
      const interval = (controller as unknown as { _keepaliveInterval?: ReturnType<typeof setInterval> })
        ._keepaliveInterval;
      if (interval) {
        clearInterval(interval);
      }
      messageStreams.delete(consumerId);
      messageQueues.delete(consumerId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
