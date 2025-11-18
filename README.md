# MACC Subscriber Tool

A Next.js application for visualizing and monitoring Kafka messages, with a focus on message flow tracking and command monitoring.

## Features

- **Kafka Message Visualization**: Real-time visualization of Kafka messages grouped by `flowId`
- **Simplified Message Cards**: Quick view showing:
  - Command name (extracted from `resource.commandId`)
  - Source microservice (from `hostname`)
  - Success status (true/false)
  - Error messages (if present)
  - Topic information
- **Expandable Details**: Click on flowId or message details to view full JSON content
- **Smooth Animations**: Staggered fade-in and slide-in animations for better UX
- **GraphQL Subscriptions**: Support for GraphQL subscription monitoring
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Mode**: Built-in theme support

## Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- Docker and Docker Compose (for local Kafka testing)

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install
```

### Local Kafka Setup

The project includes a Docker Compose configuration for local Kafka testing. See [KAFKA-SETUP.md](./KAFKA-SETUP.md) for detailed instructions.

```bash
# Start Kafka, Zookeeper, and Kafka UI
pnpm kafka:up

# Stop all services
pnpm kafka:down

# View Kafka logs
pnpm kafka:logs

# Check service status
pnpm kafka:status

# Produce test messages
pnpm kafka:produce
```

### Development

```bash
# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Connecting to Kafka

1. Enter your Kafka broker endpoint(s) (e.g., `localhost:9092`)
2. Enter the topics you want to subscribe to (comma-separated)
3. Click "Connect" to start consuming messages

### Using Test Kafka

For quick testing, click the "Use Test Kafka" button to automatically configure:

- Broker: `localhost:9092`
- Default topics for testing

### Message Flow Visualization

- **Flow Groups**: Messages are automatically grouped by `flowId`
- **Expand Flow**: Click on a flowId to expand/collapse all messages in that flow
- **Message Cards**: Each card shows:
  - Topic badge
  - Command name
  - Source microservice
  - Success/failure status
  - Error messages (if any)
- **View Details**: Click "Message Details" on any message card to see the full JSON content

## Message Format

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

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm kafka:up` - Start local Kafka services
- `pnpm kafka:down` - Stop local Kafka services
- `pnpm kafka:logs` - View Kafka logs
- `pnpm kafka:status` - Check service status
- `pnpm kafka:produce` - Produce test messages

## Project Structure

```
├── app/
│   ├── api/
│   │   └── kafka/
│   │       ├── connect/     # Kafka connection API
│   │       └── messages/    # Message streaming API
│   ├── page.tsx             # Main application page
│   └── layout.tsx            # Root layout
├── components/
│   ├── MessageFlowGraph.tsx # Message visualization component
│   ├── KafkaListener.tsx    # Kafka connection UI
│   ├── GraphQLSubscription.tsx
│   ├── JsonViewer.tsx       # JSON viewer component
│   └── ui/                  # UI components (shadcn/ui)
├── scripts/
│   └── produce-test-messages.js  # Test message producer
├── docker-compose.yml        # Local Kafka setup
└── KAFKA-SETUP.md           # Kafka setup documentation
```

## Technologies

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **KafkaJS** - Kafka client
- **Monaco Editor** - JSON viewer
- **shadcn/ui** - UI components
- **Lucide React** - Icons

## License

Private project - All rights reserved
