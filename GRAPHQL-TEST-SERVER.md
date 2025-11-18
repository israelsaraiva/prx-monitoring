# GraphQL Test Server

A local test server for testing GraphQL subscriptions.

## Quick Start

```bash
# Start the test server
pnpm graphql:test
```

The server will start on `http://localhost:4000` with WebSocket endpoint at `ws://localhost:4000/graphql`.

## Usage in the App

1. Start the test server: `pnpm graphql:test`
2. In the GraphQL Subscription tab:
   - **Endpoint URL**: `ws://localhost:4000/graphql`
   - **Headers (JSON)**: Leave empty or add custom headers as JSON
   - Click **Connect**
   - Enter a subscription query (see examples below)
   - Click **Subscribe**

## Available Subscriptions

### 1. messageAdded

Receives new messages every 2 seconds.

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

### 2. counter

Increments a counter every 2 seconds.

```graphql
subscription {
  counter
}
```

### 3. randomData

Sends random data every 2 seconds.

```graphql
subscription {
  randomData
}
```

## Example Queries

### Full Message Subscription

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

### Counter Subscription

```graphql
subscription {
  counter
}
```

### Random Data Subscription

```graphql
subscription {
  randomData
}
```

## Server Information

- **HTTP Port**: 4000
- **WebSocket Path**: `/graphql`
- **Full WebSocket URL**: `ws://localhost:4000/graphql`

Visit `http://localhost:4000` in your browser to see server information and example queries.

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.
