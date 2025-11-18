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
  const flowIds = ['b29047e9-fa72-4375-834d-a39d6274ff31', 'c39058f0-gb83-5486-945e-b40f7385dg42', 'd40169g1-hc94-6597-a56f-c51g8496eh53'];
  const topics = ['user-events', 'order-processing', 'payment-events'];
  const commands = ['backendError', 'processOrder', 'validatePayment', 'sendNotification'];
  const microservices = ['proxify-fsm-84d5b87f9d-bx2rl', 'order-service-abc123', 'payment-gateway-xyz789'];

  console.log(`Producing messages to topic: ${topic}`);
  console.log(`Note: Make sure the consumer is connected before producing messages, or use 'fromBeginning: true' to read old messages`);

  const messages = [];

  // Generate messages following the new structure
  flowIds.forEach((flowId, flowIndex) => {
    const messageTopic = topics[flowIndex % topics.length] || topic;
    const command = commands[flowIndex % commands.length];
    const microservice = microservices[flowIndex % microservices.length];
    const messageCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < messageCount; i++) {
      const commandId = `${command}:${Date.now()}-${flowIndex}-${i}`;
      const success = i === messageCount - 1; // Last message is successful
      const errorMessage = !success && command === 'backendError' ? `the fsm with flowId ${flowId} is in final state and can not handle messages` : undefined;

      const messageData = {
        id: `command:${command.toUpperCase()}:${command}:${commandId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'command',
        environment: 'uat',
        hostname: microservice,
        origin: {
          name: microservice.split('-')[0],
          version: 'latest',
        },
        flow: command.toUpperCase(),
        resource: {
          commandId: commandId,
          success: success,
          type: command,
          payload: errorMessage
            ? {
                errorMessage: errorMessage,
              }
            : {
                status: i === 0 ? 'started' : i === messageCount - 1 ? 'completed' : 'processing',
                step: i + 1,
                totalSteps: messageCount,
              },
          headers: [],
          flowId: flowId,
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
    console.log(`   Commands: ${commands.join(', ')}`);
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
