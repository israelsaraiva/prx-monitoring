# Kafka Setup for Testing

This guide explains how to set up a local Kafka instance for testing the Subscriber Tool.

## Quick Start

### Prerequisites

- Docker and Docker Compose installed on your system

### Starting Kafka

1. **Start the Kafka cluster:**

   ```bash
   docker-compose up -d
   ```

2. **Verify services are running:**

   ```bash
   docker-compose ps
   ```

3. **Check Kafka logs:**
   ```bash
   docker-compose logs -f kafka
   ```

### Stopping Kafka

```bash
docker-compose down
```

To also remove volumes (clean slate):

```bash
docker-compose down -v
```

## Services

The setup includes three services:

1. **Zookeeper** (port 2181)
   - Required by Kafka for coordination
   - Not directly accessed by the application

2. **Kafka Broker** (port 9092)
   - Main Kafka broker accessible at `localhost:9092`
   - Use this address in the Subscriber Tool

3. **Kafka UI** (port 8080)
   - Web interface for managing Kafka
   - Access at http://localhost:8080
   - Useful for creating topics, viewing messages, and monitoring

## Using with Subscriber Tool

1. Start the Kafka cluster using `docker-compose up -d`

2. In the Subscriber Tool:
   - **Broker Endpoint:** `localhost:9092`
   - **Topics:** Enter topic names (comma-separated), e.g., `test-topic,user-events`

3. Create topics (optional):
   - Topics are auto-created when messages are produced
   - Or use Kafka UI at http://localhost:8080 to create them manually
   - Or use the Kafka CLI (see below)

## Creating Test Topics

### Using Kafka UI

1. Open http://localhost:8080
2. Navigate to "Topics"
3. Click "Add a Topic"
4. Enter topic name and settings
5. Click "Create Topic"

### Using Kafka CLI (inside container)

```bash
# Create a topic
docker exec -it kafka-broker kafka-topics --create \
  --bootstrap-server localhost:9093 \
  --topic test-topic \
  --partitions 1 \
  --replication-factor 1

# List topics
docker exec -it kafka-broker kafka-topics --list \
  --bootstrap-server localhost:9093

# Produce test messages
docker exec -it kafka-broker kafka-console-producer \
  --bootstrap-server localhost:9093 \
  --topic test-topic

# Consume messages
docker exec -it kafka-broker kafka-console-consumer \
  --bootstrap-server localhost:9093 \
  --topic test-topic \
  --from-beginning
```

## Producing Test Messages with FlowId

To test the flowId linking feature, produce messages with flowId in headers or JSON content:

### Using Kafka CLI with Headers

```bash
# Note: kafka-console-producer doesn't support headers directly
# Use a script or Kafka UI instead
```

### Using Kafka UI

1. Go to http://localhost:8080
2. Select your topic
3. Click "Produce Message"
4. Add message with flowId in JSON:
   ```json
   {
     "flowId": "test-flow-123",
     "message": "Test message",
     "data": {
       "userId": "user-1",
       "action": "test-action"
     }
   }
   ```

### Using a Simple Producer Script

Create a file `produce-test-messages.js`:

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'test-producer',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

async function produceMessages() {
  await producer.connect();

  const messages = [
    {
      topic: 'test-topic',
      messages: [
        {
          headers: { flowId: 'flow-123' },
          value: JSON.stringify({ message: 'Message 1', flowId: 'flow-123' }),
        },
      ],
    },
    {
      topic: 'test-topic',
      messages: [
        {
          headers: { flowId: 'flow-123' },
          value: JSON.stringify({ message: 'Message 2', flowId: 'flow-123' }),
        },
      ],
    },
  ];

  await producer.sendBatch({ topicMessages: messages });
  await producer.disconnect();
  console.log('Messages sent!');
}

produceMessages().catch(console.error);
```

Run with: `node produce-test-messages.js`

## Troubleshooting

### Kafka not accessible

- Ensure Docker is running
- Check if ports 9092, 2181, and 8080 are available
- Verify containers are running: `docker-compose ps`

### Connection timeout

- Wait a few seconds after starting containers for Kafka to fully initialize
- Check Kafka logs: `docker-compose logs kafka`

### Topics not appearing

- Topics are auto-created when first message is produced
- Use Kafka UI to verify topics exist
- Check topic list: `docker exec kafka-broker kafka-topics --list --bootstrap-server localhost:9093`

## Configuration

The Kafka setup uses default settings suitable for local development:

- Single broker (not suitable for production)
- Auto topic creation enabled
- No authentication/authorization
- Plaintext protocol

For production use, configure proper security, replication, and multiple brokers.
