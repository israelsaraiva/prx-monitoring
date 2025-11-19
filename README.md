# MACC Monitoring Tool

A Next.js application for real-time monitoring of GraphQL subscriptions and Kafka messages, with advanced message flow tracking and visualization capabilities.

## Features

### GraphQL Subscriptions

- **Real-time Subscription Support**: Connect to GraphQL endpoints and subscribe to real-time data streams
- **Custom Headers Configuration**: Add authentication headers and custom connection parameters
- **Connection Validation**: Test your GraphQL endpoint connection before subscribing
- **Message History**: View all received subscription messages with timestamps
- **Formatted JSON Display**: Automatically formatted message content for better readability

### Kafka Listener

- **Multi-topic Message Consumption**: Subscribe to multiple Kafka topics simultaneously
- **Flow-based Message Grouping**: Messages automatically grouped by `flowId` for easy tracking
- **Message Search**: Search messages by content, topic, flowId, or key
- **Send & Resend Messages**: Send new messages or resend existing ones directly from the UI
- **Message Flow Visualization**: Interactive graph showing message relationships
- **Saved Configurations**: Save and quickly switch between broker/topic configurations
- **Simplified Message Cards**: Quick view showing command name, source, status, and errors
- **Expandable Details**: Click to view full message JSON content

### General Features

- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Mode**: Built-in theme support with smooth transitions
- **Smooth Page Transitions**: Fade-in animations when navigating between pages
- **Local Testing**: Built-in test servers for both GraphQL and Kafka

## Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- Docker and Docker Compose (for local Kafka testing)

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Home Page

The home page provides access to both monitoring tools:

- **GraphQL Subscriptions**: Click "Open GraphQL Subscriptions" to monitor GraphQL real-time data
- **Kafka Listener**: Click "Open Kafka Listener" to monitor Kafka message streams

---

## GraphQL Subscriptions

### Connecting to a GraphQL Endpoint

1. **Navigate to GraphQL Page**: Click "Open GraphQL Subscriptions" from the home page
2. **Enter Endpoint URL**:
   - Format: `ws://localhost:4000/graphql` or `wss://your-server.com/graphql`
   - Must be a WebSocket URL (starts with `ws://` or `wss://`)
3. **Add Headers (Optional)**:
   - Enter JSON format headers, e.g., `{"Authorization": "Bearer token123"}`
   - Headers are sent during the WebSocket connection handshake
4. **Validate Connection (Optional)**:
   - Click "Validate Connection" to test the endpoint before subscribing
   - This verifies the WebSocket connection can be established
5. **Connect**: Click "Connect" to establish the WebSocket connection
6. **Enter Subscription Query**:
   - Write your GraphQL subscription query
   - Example:
     ```graphql
     subscription {
       messageAdded {
         id
         content
         author
         timestamp
       }
     }
     ```
7. **Subscribe**: Click "Subscribe" to start receiving real-time messages

### GraphQL Features

- **Connection Status**: Badge shows "Connected" or "Disconnected" status
- **Subscription Status**: Badge shows "Subscribed" or "Not Subscribed" status
- **Received Messages**: All subscription messages are displayed with timestamps
- **Clear Messages**: Use "Clear Messages" to remove all received messages
- **Disconnect**: Click "Disconnect" to close the WebSocket connection

### Testing GraphQL Locally

The project includes a local GraphQL test server for testing subscriptions.

#### Start the Test Server

```bash
# Start the GraphQL test server
pnpm graphql:test
```

The server will start on `http://localhost:4000` with WebSocket endpoint at `ws://localhost:4000/graphql`.

#### Available Test Subscriptions

The test server provides three subscriptions that emit data every 10 seconds:

1. **messageAdded**: Receives new messages

   ```graphql
   subscription {
     messageAdded {
       id
       content
       author
       timestamp
     }
   }
   ```

2. **counter**: Increments counter

   ```graphql
   subscription {
     counter
   }
   ```

3. **randomData**: Sends random data
   ```graphql
   subscription {
     randomData
   }
   ```

#### Using the Test Server

1. Start the test server: `pnpm graphql:test`
2. In the application:
   - Endpoint: `ws://localhost:4000/graphql`
   - Headers: Leave empty or add custom headers as JSON
   - Click "Connect"
   - Enter one of the subscription queries above
   - Click "Subscribe"
   - Messages will appear every 10 seconds

---

## Kafka Listener

### Connecting to Kafka

1. **Navigate to Kafka Page**: Click "Open Kafka Listener" from the home page
2. **Enter Broker Endpoint(s)**:
   - Format: `localhost:9092` or `broker1:9092,broker2:9092` for multiple brokers
3. **Enter Topics**:
   - Comma-separated list: `topic1,topic2,topic3`
4. **Connect**: Click "Connect" to start consuming messages
5. **View Messages**: Messages appear in the "Message Flow Visualization" panel on the right

> **Important**: Kafka messages are only received from the point when you connect to the topic. Messages that were published before you connected will not be displayed. This ensures you only see real-time messages after establishing the connection.

### Kafka Features

#### Saved Configurations

- **Save Configurations**: Save frequently used broker/topic combinations
- **Quick Load**: Load saved configurations with one click
- **Edit/Delete**: Manage your saved configurations

#### Message Flow Visualization

- **Flow Grouping**: Messages automatically grouped by `flowId`
- **Expand/Collapse**: Click on a flowId to expand/collapse all messages in that flow
- **Message Cards**: Each message shows:
  - Topic badge
  - Command name (extracted from `resource.commandId`)
  - Source microservice (from `hostname`)
  - Success/failure status
  - Error messages (if present)
  - Timestamp
- **Message Details**: Click "Message Details" to view full JSON content
- **Search**: Use the search bar to filter messages by content, topic, flowId, or key

#### Send Messages

- **Send Message Button**: Opens a dialog to send new messages
- **Use for Send**: Click "Use for Send" on any message to load its parameters into the send form
- **Resend**: Click "Resend" to immediately resend a message as-is
- **Message Parameters**:
  - Topic (required)
  - Key (optional)
  - Headers (JSON, optional)
  - Message Value (JSON, required)

### Testing Kafka Locally

The project includes Docker Compose configuration for local Kafka testing.

#### Start Local Kafka

```bash
# Start Kafka, Zookeeper, and Kafka UI
pnpm kafka:up

# Check service status
pnpm kafka:status

# View Kafka logs
pnpm kafka:logs
```

This starts:

- **Zookeeper**: Port 2181
- **Kafka Broker**: Port 9092
- **Kafka UI**: http://localhost:8080 (Web interface for Kafka management)

#### Produce Test Messages

```bash
# Produce test messages to Kafka
pnpm kafka:produce
```

This script produces test messages with:

- Multiple flowIds for testing flow grouping
- Various topics: `user-events`, `order-processing`, `payment-events`, `notifications`
- Different command types: `backendError`, `processOrder`, `validatePayment`, `sendNotification`
- Success and failure scenarios

#### Using Local Kafka

1. **Start Kafka**: `pnpm kafka:up`
2. **Wait for services**: Give it 10-15 seconds for Kafka to fully start
3. **In the application**:
   - Click "Use Test Kafka" button (auto-fills `localhost:9092` and default topics)
   - Or manually enter:
     - Broker: `localhost:9092`
     - Topics: `user-events,order-processing,payment-events,notifications`
   - Click "Connect"
4. **Produce messages**: In a separate terminal, run `pnpm kafka:produce`
5. **View messages**: Messages will appear in the Message Flow Visualization panel

#### Stop Local Kafka

```bash
# Stop all services
pnpm kafka:down
```

### Message Format

The application expects Kafka messages in the following format:

```json
{
  "id": "command:BACKEND_FAMILY_CIRCLE:backendError:backendError:d6d802c4-4942-4dbf-8631-139ea483ce72",
  "createdAt": "2025-11-18T15:49:54.851Z",
  "updatedAt": "2025-11-18T15:49:54.851Z",
  "type": "command",
  "environment": "uat",
  "hostname": "proxify-fsm-84d5b87f9d-bx2rl",
  "origin": {
    "name": "proxify-fsm",
    "version": "latest"
  },
  "flow": "BACKEND_FAMILY_CIRCLE",
  "resource": {
    "commandId": "backendError:d6d802c4-4942-4dbf-8631-139ea483ce72",
    "success": true,
    "type": "backendError",
    "payload": {
      "errorMessage": "the fsm with flowId b29047e9-fa72-4375-834d-a39d6274ff31 is in final state and can not handle messages"
    },
    "headers": [],
    "flowId": "b29047e9-fa72-4375-834d-a39d6274ff31"
  }
}
```

### FlowId Extraction Priority

The application extracts `flowId` in the following priority order:

1. `resource.flowId` (highest priority)
2. Direct `flowId` fields at root level
3. Recursive search in nested objects
4. Kafka message headers
5. Message key (if available)

---

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm kafka:up` - Start local Kafka services (Zookeeper, Kafka, Kafka UI)
- `pnpm kafka:down` - Stop local Kafka services
- `pnpm kafka:logs` - View Kafka logs
- `pnpm kafka:status` - Check service status
- `pnpm kafka:produce` - Produce test messages to Kafka
- `pnpm graphql:test` - Start local GraphQL test server

## Project Structure

```
├── app/
│   ├── api/
│   │   └── kafka/
│   │       ├── connect/     # Kafka connection API
│   │       ├── messages/    # Message streaming API
│   │       └── produce/     # Message production API
│   ├── graphql/
│   │   └── page.tsx         # GraphQL subscriptions page
│   ├── kafka/
│   │   └── page.tsx         # Kafka listener page
│   ├── page.tsx             # Home page
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/
│   ├── GraphQLSubscription.tsx  # GraphQL subscription component
│   ├── KafkaListener.tsx        # Kafka connection UI
│   ├── MessageFlowGraph.tsx     # Message visualization component
│   ├── PageTransition.tsx       # Page transition animations
│   └── ui/                      # UI components (shadcn/ui)
├── scripts/
│   ├── produce-test-messages.js  # Kafka test message producer
│   └── graphql-test-server.js   # GraphQL test server
├── docker-compose.yml           # Local Kafka setup
└── README.md                    # This file
```

## Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **KafkaJS** - Kafka client library
- **graphql-ws** - GraphQL WebSocket client
- **shadcn/ui** - UI component library
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

## License

Private project - All rights reserved
