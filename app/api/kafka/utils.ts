declare global {
  var kafkaMessageStreams: Map<string, ReadableStreamDefaultController> | undefined;
  var kafkaMessageQueues: Map<string, unknown[]> | undefined;
}

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

export function sendKafkaMessage(consumerId: string, message: unknown) {
  const messageStreams = getMessageStreams();
  const messageQueues = getMessageQueues();

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
    if (!messageQueues.has(consumerId)) {
      messageQueues.set(consumerId, []);
    }
    const queue = messageQueues.get(consumerId);
    if (queue) {
      queue.push(message);
      if (queue.length > 100) {
        queue.shift();
      }
    }
  }
}

export function getMessageStreamsMap() {
  return getMessageStreams();
}

export function getMessageQueuesMap() {
  return getMessageQueues();
}
