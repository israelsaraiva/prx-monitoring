# FlowID Message Linking Feature

This document explains how the Kafka message linking functionality works in the Subscriber Tool.

## Overview

The application now automatically links Kafka messages by their `flowId` field. When messages contain the same `flowId`, they are grouped together in the visualization to show the message flow.

## FlowID Detection

The application tries to extract the `flowId` from messages in the following priority order:

### 1. Message Headers
- `flowId`
- `flowid` 
- `flow-id`

### 2. JSON Content (NEW)
The application now parses the message content as JSON and looks for:
- `"flowId": "value"`
- `"flowid": "value"`
- `"flow-id": "value"`
- `"flow_id": "value"`

### 3. Message Key (Fallback)
If no flowId is found in headers or JSON content, the message key is used as the flowId.

## Example Message with FlowID in JSON

```json
{
  "flowId": "21f5c43a-c009-4fd7-a1ef-bbf95fd33e3e",
  "timestamp": "2023-11-18T10:00:00Z",
  "data": {
    "userId": "12345",
    "action": "purchase",
    "amount": 99.99
  }
}
```

## Features

### Message Grouping
- Messages with the same `flowId` are grouped together
- Groups are sorted by the latest message timestamp
- Each group shows the number of messages in the flow

### Visual Enhancements
- FlowID is prominently displayed in a code block
- Messages show their source of flowId (JSON, header, key, etc.)
- JSON content highlights the flowId field with background colors
- Duration between first and last message is shown

### Statistics
The Kafka tab now shows:
- Number of unique flows
- Total number of messages
- Number of messages with successfully linked flowIds

## Usage

1. Connect to your Kafka broker
2. Subscribe to topics that contain messages with flowId fields
3. Messages will automatically be grouped by their flowId
4. The visualization will show:
   - Flow groups with highlighted flowIds
   - Individual messages with timestamps and content
   - Source of flowId detection (header, JSON content, key)
   - Visual connections between messages in the same flow

## Supported FlowID Formats

The application is flexible and supports various naming conventions:
- `flowId` (camelCase)
- `flowid` (lowercase)
- `flow-id` (kebab-case)
- `flow_id` (snake_case)

This ensures compatibility with different messaging patterns and naming conventions.
