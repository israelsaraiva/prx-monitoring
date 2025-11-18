const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'test-producer',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

async function produceTestMessages() {
  try {
    await producer.connect();
    console.log('Connected to Kafka broker');
  } catch (error) {
    console.error('Failed to connect to Kafka broker:', error);
    console.error('Make sure Kafka is running: pnpm kafka:up');
    process.exit(1);
  }

  const topic = process.argv[2] || 'test-topic';
  const flowIds = ['flow-123', 'flow-456', 'flow-789', 'flow-abc'];
  const topics = ['user-events', 'order-processing', 'payment-events', 'notifications'];

  console.log(`Producing messages to topic: ${topic}`);
  console.log(`Note: Make sure the consumer is connected before producing messages, or use 'fromBeginning: true' to read old messages`);

  const messages = [];

  // Generate messages with flowIds in headers
  flowIds.forEach((flowId, flowIndex) => {
    const messageTopic = topics[flowIndex % topics.length] || topic;
    const messageCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < messageCount; i++) {
      const messageData = {
        flowId,
        eventType: i === 0 ? 'started' : i === messageCount - 1 ? 'completed' : 'processing',
        step: i + 1,
        totalSteps: messageCount,
        data: {
          userId: `user-${flowIndex + 1}`,
          action: `action-${i + 1}`,
          timestamp: new Date().toISOString(),
          metadata: {
            source: 'test-producer',
            version: '1.0',
          },
        },
      };

      messages.push({
        topic: messageTopic,
        messages: [
          {
            headers: {
              flowId: flowId,
            },
            key: `key-${flowId}-${i}`,
            value: JSON.stringify(messageData, null, 2),
          },
        ],
      });
    }
  });

  // Generate messages with flowId in JSON content only
  for (let i = 0; i < 2; i++) {
    const flowId = `json-flow-${i + 1}`;
    const messageData = {
      flowId,
      message: `Test message with flowId in JSON content ${i + 1}`,
      data: {
        test: true,
        index: i + 1,
      },
    };

    messages.push({
      topic: topic,
      messages: [
        {
          key: null,
          value: JSON.stringify(messageData, null, 2),
        },
      ],
    });
  }

  // Generate messages without flowId
  for (let i = 0; i < 2; i++) {
    messages.push({
      topic: topic,
      messages: [
        {
          key: null,
          value: JSON.stringify(
            {
              message: `Test message without flowId ${i + 1}`,
              data: { test: true },
            },
            null,
            2
          ),
        },
      ],
    });
  }

  try {
    // Group messages by topic for batch sending
    const messagesByTopic = new Map();
    messages.forEach((msg) => {
      if (!messagesByTopic.has(msg.topic)) {
        messagesByTopic.set(msg.topic, []);
      }
      messagesByTopic.get(msg.topic).push(...msg.messages);
    });

    // Send all messages for each topic in a single batch
    for (const [topic, topicMessages] of messagesByTopic.entries()) {
      await producer.send({
        topic: topic,
        messages: topicMessages,
      });
      console.log(`Sent ${topicMessages.length} message(s) to ${topic}`);
    }

    console.log(`\n✅ Successfully produced messages!`);
    console.log(`   Topics used: ${[...messagesByTopic.keys()].join(', ')}`);
    console.log(`   Total messages: ${messages.reduce((sum, m) => sum + m.messages.length, 0)}`);
    console.log(`   FlowIds: ${flowIds.join(', ')}`);
  } catch (error) {
    console.error('Error producing messages:', error);
    throw error;
  } finally {
    await producer.disconnect();
    console.log('Disconnected from Kafka broker');
  }
}

produceTestMessages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
