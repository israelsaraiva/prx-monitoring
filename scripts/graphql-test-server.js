const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { buildSchema, graphql } = require('graphql');
const express = require('express');

const PORT = 4000;
const WS_PATH = '/graphql';

const schema = buildSchema(`
    type Message {
        id: ID!
        content: String!
        author: String!
        timestamp: String!
    }

    type Query {
        hello: String
        messages: [Message!]!
    }

    type Subscription {
        messageAdded: Message!
        counter: Int!
        randomData: String!
    }
`);

const messages = [];
let messageIdCounter = 0;
let counter = 0;

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'GraphQL Test Server is running',
    websocket: `ws://localhost:${PORT}${WS_PATH}`,
    subscriptions: ['messageAdded', 'counter', 'randomData'],
    exampleQueries: {
      messageAdded: `subscription {
                messageAdded {
                    id
                    content
                    author
                    timestamp
                }
            }`,
      counter: `subscription {
                counter
            }`,
      randomData: `subscription {
                randomData
            }`,
    },
  });
});

const server = createServer(app);
const wsServer = new WebSocketServer({
  server,
  path: WS_PATH,
});

const activeSubscriptions = new Map();

setInterval(() => {
  messageIdCounter++;
  const message = {
    id: String(messageIdCounter),
    content: `Test message ${messageIdCounter}`,
    author: 'Test Server',
    timestamp: new Date().toISOString(),
  };
  messages.push(message);

  activeSubscriptions.forEach((sub) => {
    if (sub.fieldName === 'messageAdded') {
      sub.emit({
        messageAdded: message,
      });
    }
  });
}, 10000);

setInterval(() => {
  counter++;
  activeSubscriptions.forEach((sub) => {
    if (sub.fieldName === 'counter') {
      sub.emit({ counter });
    }
  });
}, 10000);

setInterval(() => {
  const randomData = `Random: ${Math.random().toString(36).substring(7)} at ${new Date().toISOString()}`;
  activeSubscriptions.forEach((sub) => {
    if (sub.fieldName === 'randomData') {
      sub.emit({ randomData });
    }
  });
}, 10000);

useServer(
  {
    schema,
    execute: async (args) => {
      try {
        const result = await graphql({
          schema,
          source: args.document,
          variableValues: args.variableValues,
          rootValue: {
            hello: () => 'Hello from GraphQL Test Server!',
            messages: () => messages,
          },
        });
        return result;
      } catch (error) {
        console.error('Execute error:', error);
        throw error;
      }
    },
    subscribe: async (args) => {
      try {
        const document = args.document;
        const operation = document.definitions.find((def) => def.kind === 'OperationDefinition' && def.operation === 'subscription');

        if (!operation) {
          throw new Error('No subscription operation found in query');
        }

        const fieldName = operation.selectionSet.selections[0].name.value;
        const subscriptionId = Math.random().toString(36).substring(7);

        console.log(`📡 New subscription: ${fieldName} (${subscriptionId})`);

        const subscription = {
          fieldName,
          emit: (data) => {
            if (subscription.resolve) {
              subscription.resolve({ value: { data }, done: false });
              subscription.resolve = null;
            }
          },
        };

        activeSubscriptions.set(subscriptionId, subscription);

        return {
          [Symbol.asyncIterator]: async function* () {
            try {
              while (true) {
                yield await new Promise((resolve) => {
                  subscription.resolve = resolve;
                });
              }
            } finally {
              console.log(`🔌 Subscription ended: ${fieldName} (${subscriptionId})`);
              activeSubscriptions.delete(subscriptionId);
            }
          },
        };
      } catch (error) {
        console.error('Subscribe error:', error);
        throw error;
      }
    },
    onConnect: (ctx) => {
      console.log('✅ Client connected');
    },
    onDisconnect: (ctx, code, reason) => {
      console.log(`❌ Client disconnected (code: ${code}, reason: ${reason || 'none'})`);
    },
    onError: (ctx, msg, errors) => {
      console.error('❌ GraphQL error:', errors);
    },
  },
  wsServer
);

server.listen(PORT, () => {
  console.log(`\n🚀 GraphQL Test Server is running!`);
  console.log(`   HTTP: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}${WS_PATH}\n`);
  console.log(`📡 Available Subscriptions:`);
  console.log(`   1. messageAdded - Receives new messages every 10 seconds`);
  console.log(`   2. counter - Increments counter every 10 seconds`);
  console.log(`   3. randomData - Sends random data every 10 seconds\n`);
  console.log(`📝 Example Subscription Query:`);
  console.log(`   subscription {`);
  console.log(`     messageAdded {`);
  console.log(`       id`);
  console.log(`       content`);
  console.log(`       author`);
  console.log(`       timestamp`);
  console.log(`     }`);
  console.log(`   }\n`);
  console.log(`💡 Connect to: ws://localhost:${PORT}${WS_PATH}\n`);
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server...');
  wsServer.close();
  server.close();
  process.exit(0);
});
