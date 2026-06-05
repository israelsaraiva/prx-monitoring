# Copilot Instructions — MACC Monitoring Tool

## Commands

```bash
pnpm dev              # Start development server (http://localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm format           # Prettier (write)
pnpm format:check     # Prettier (check only)

# Kafka local testing
pnpm kafka:up         # Start Zookeeper + Kafka + Kafka UI (port 8080)
pnpm kafka:down       # Stop all Kafka services
pnpm kafka:produce    # Publish test messages to local Kafka
pnpm kafka:logs       # Tail Kafka logs

# GraphQL local testing
pnpm graphql:test     # Start test GraphQL/WebSocket server on port 4000
```

There are no automated tests in this repository.

## Architecture

This is a **Next.js 14 App Router** application (TypeScript strict mode, `output: 'standalone'` for Docker). It is a single-user internal developer tool with six features, each with its own route:

| Route              | Feature                                                  |
| ------------------ | -------------------------------------------------------- |
| `/graphql`         | GraphQL WebSocket subscription monitor                   |
| `/kafka`           | Kafka listener with flow-based message grouping          |
| `/json-viewer`     | Splunk NDJSON log file viewer                            |
| `/rest-client`     | HTTP REST client with collections, environments, history |
| `/curl-converter`  | cURL command ↔ request converter                         |
| `/markdown-viewer` | Markdown file renderer                                   |
| `/deliveries`      | Delivery tracking view                                   |

### Kafka Streaming Architecture

The Kafka feature uses a **Server-Sent Events (SSE) bridge** pattern:

1. **`POST /api/kafka/connect`** — creates a KafkaJS consumer, registers it in a module-level `Map<consumerId, ConsumerData>`, subscribes to topics (`fromBeginning: false`), and starts `consumer.run()`. Only one consumer is active at a time (all existing consumers are stopped on new connection).
2. **`GET /api/kafka/messages?consumerId=…`** — opens an SSE stream (`text/event-stream`). The route stores the stream controller in a shared `Map` (via `getMessageStreamsMap()`). A message queue (`getMessageQueueMap()`) handles messages that arrive before the SSE stream is ready.
3. **`POST /api/kafka/produce`** — sends messages back to Kafka.
4. **`DELETE /api/kafka/connect?consumerId=…`** — disconnects and cleans up the consumer.

The `sendKafkaMessage(consumerId, msg)` utility (in `app/api/kafka/utils.ts`) writes to the SSE stream or queues the message if the stream isn't open yet.

### flowId Extraction Priority

When a Kafka message arrives, `flowId` is resolved in this order:

1. Kafka message header: `flowId` / `flowid` / `flow-id`
2. `resource.flowId` (or `flowid`, `flow-id`, `flow_id`) in the parsed JSON body
3. Root-level `flowId` variants in the JSON body
4. Recursive search of all nested objects (excluding `resource` to avoid double-check)
5. Kafka message key

### Proxy Route

`POST /api/proxy` is a server-side HTTP proxy used by the REST client. It supports GET/POST/PUT/PATCH/DELETE, custom headers, JSON/text/form-data/urlencoded bodies, configurable timeout (default 30 s), and an optional SSL verification bypass (`NODE_TLS_REJECT_UNAUTHORIZED`).

### State Persistence

All user configuration is stored in `localStorage` — there is no backend database:

- **Kafka**: broker/topic saved configurations → `BrokerConfig[]` (keys managed in `KafkaListener` component)
- **Splunk viewer**: last uploaded file data → `lib/utils/local-storage.ts`
- **REST client**: collections, environments, history (last 100 entries), settings → `lib/rest-client-storage.ts` with keys prefixed `rest-client:`

Environment variable interpolation in the REST client uses `{{variableName}}` syntax.

## Conventions

### Path Alias

`@/*` maps to the repository root. Use it for all internal imports (e.g. `@/lib/utils`, `@/components/ui/button`).

### Client vs Server Components

App Router defaults to server components. Add `'use client'` only when needed (hooks, browser APIs). The root layout suppresses hydration warnings (`suppressHydrationWarning`) to handle theme flicker from `next-themes`.

### UI Components

- All base UI primitives live in `components/ui/` and are shadcn/ui wrappers around Radix UI.
- Icons come exclusively from `lucide-react`.
- Toast notifications use `sonner` (via `<Toaster />` in the root layout).
- Tailwind CSS with `tailwind-merge` (`cn()` helper from `lib/utils.ts`) for conditional class merging.

### Code Style

Prettier is enforced via a pre-commit hook (`lint-staged`):

- Single quotes, 120-char print width, `es5` trailing commas, LF line endings, 2-space indent.

### Git Commit Format

```
<type> <ticket>: <short description>
```

- **type**: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`, `ci`
- **ticket**: Jira ref `TP-<number>`, or `TP-0` when no ticket exists
- Short description: imperative mood, lowercase, no trailing period

Examples:

```
feat TP-5312000: add proactive consent endpoint for mobile users
fix TP-5319123: resolve header-too-large error on consent retrieval
chore TP-0: update dependencies to latest patch versions
```

Branch naming: `<type>/TP-<ticket>-<short-slug>` (e.g. `feat/TP-5312000-proactive-consent-endpoint`)

### Types and Utilities

- Domain types live in `lib/types/` (`kafka.ts`, `json-viewer.ts`).
- Pure utility functions live in `lib/utils/` (flow ID extraction, JSON parsing, message filtering, text highlight).
- The `@monaco-editor/react` and `@uiw/react-codemirror` editors are used for code/JSON input fields.
