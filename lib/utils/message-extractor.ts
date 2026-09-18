import { JsonLogEntry, ParsedMessage } from '@/lib/types/json-viewer';
import { extractFlowIdFromObject } from './flow-id-extractor';
import {
  FLOW_ID_ALT_PATTERN,
  FLOW_ID_PATTERN,
  FLOW_ID_SOURCE_SPLUNK,
  TOPIC_SPLUNK_JSON,
  UNKNOWN_LEVEL,
} from './json-parser';

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getStructuredMessageText(
  result: Record<string, unknown>,
  structured: Record<string, unknown>
): string | undefined {
  const messageValue = structured.message ?? result['structured.message'];
  return typeof messageValue === 'string' ? messageValue : undefined;
}

export function resolveEventBody(
  result: Record<string, unknown>,
  structured: Record<string, unknown>,
  rawValue: string
): Record<string, unknown> {
  const structuredMessageBody = parseJsonObject(getStructuredMessageText(result, structured));
  if (structuredMessageBody) {
    return structuredMessageBody;
  }

  const envelope = parseJsonObject(rawValue);
  if (envelope) {
    const envelopeStructured = envelope.structured as Record<string, unknown> | undefined;
    const bodyFromEnvelope = parseJsonObject(envelopeStructured?.message);
    if (bodyFromEnvelope) {
      return bodyFromEnvelope;
    }
    if (envelope.resource) {
      return envelope;
    }
  }

  return {};
}

export function extractFlowId(
  body: Record<string, unknown>,
  structured: Record<string, unknown>,
  structuredMessageText?: string
): string {
  const resource = (body.resource as Record<string, unknown>) || {};
  if (resource.flowId) {
    return String(resource.flowId);
  }
  if (body.flowId) {
    return String(body.flowId);
  }
  if (structured.flowId) {
    return String(structured.flowId);
  }

  const extracted = extractFlowIdFromObject(structured);
  if (extracted) {
    return extracted;
  }

  if (structuredMessageText) {
    const flowIdMatch =
      structuredMessageText.match(FLOW_ID_PATTERN) || structuredMessageText.match(FLOW_ID_ALT_PATTERN);
    if (flowIdMatch) {
      return flowIdMatch[1];
    }
  }

  return UNKNOWN_LEVEL;
}

export function extractEventInfo(body: Record<string, unknown>): { eventType?: string; flowName?: string } {
  const result: { eventType?: string; flowName?: string } = {};

  if (body.type) {
    result.eventType = String(body.type);
  }
  if (body.flow) {
    result.flowName = String(body.flow);
  }

  return result;
}

export function extractCommandInfo(resource: Record<string, unknown>): {
  commandName?: string;
  success?: boolean;
  errorMessage?: string;
} {
  const result: { commandName?: string; success?: boolean; errorMessage?: string } = {};

  if (resource.commandId) {
    const commandId = String(resource.commandId);
    result.commandName = commandId.includes(':') ? commandId.split(':')[0] : commandId;
  } else if (resource.type) {
    result.commandName = String(resource.type);
  }

  if (resource.success !== undefined) {
    result.success = Boolean(resource.success);
  }

  if (resource.payload) {
    const payload = resource.payload as Record<string, unknown>;
    result.errorMessage = payload.errorMessage
      ? String(payload.errorMessage)
      : payload.error
        ? String(payload.error)
        : undefined;
  }

  return result;
}

export function extractCommandAndError(body: Record<string, unknown>): {
  commandName?: string;
  success?: boolean;
  errorMessage?: string;
} {
  return extractCommandInfo((body.resource as Record<string, unknown>) || {});
}

export function extractLevel(result: Record<string, unknown>, structured: Record<string, unknown>): string | undefined {
  if (result['structured.level']) {
    return String(result['structured.level']).trim();
  }
  if (structured.level) {
    return String(structured.level).trim();
  }
  if (result['level']) {
    return String(result['level']).trim();
  }
  if (structured['level']) {
    return String(structured['level']).trim();
  }
  return undefined;
}

export function isUnknownLevel(level: string | undefined): boolean {
  return level ? level.toLowerCase() === UNKNOWN_LEVEL : false;
}

export function extractMessage(
  result: Record<string, unknown>,
  structured: Record<string, unknown>
): string | undefined {
  if (result['structured.message']) {
    return String(result['structured.message']);
  }
  if (structured.message) {
    return String(structured.message);
  }
  if (result['message']) {
    return String(result['message']);
  }
  if (result.message) {
    return String(result.message);
  }
  return undefined;
}

export function formatJsonValue(rawValue: string): string {
  try {
    const parsed = JSON.parse(rawValue);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return rawValue;
  }
}

export function convertEntryToMessage(entry: JsonLogEntry, index: number): ParsedMessage | null {
  const result = entry.result || {};
  const structured = (result['structured'] || result.structured || {}) as Record<string, unknown>;
  const raw = result['_raw'];
  const rawValueStr = typeof raw === 'string' ? raw : JSON.stringify(result);
  const rawMessage = typeof raw === 'string' ? raw : undefined;

  const structuredMessageText = getStructuredMessageText(result, structured);
  const body = resolveEventBody(result, structured, rawValueStr);

  const flowId = extractFlowId(body, structured, structuredMessageText);
  const { commandName } = extractCommandAndError(body);
  const { eventType, flowName } = extractEventInfo(body);

  const timestampValue = result['_time'] || result['@timestamp'] || structured['@timestamp'];
  const timestamp = timestampValue ? new Date(timestampValue as string) : new Date();
  const containerName = result['kubernetes.container_name'] ? String(result['kubernetes.container_name']) : undefined;
  const level = extractLevel(result, structured);

  if (isUnknownLevel(level)) {
    return null;
  }

  const structuredMessage = extractMessage(result, structured);
  const value = Object.keys(body).length > 0 ? JSON.stringify(body, null, 2) : formatJsonValue(rawValueStr);

  return {
    id: `json-${index}`,
    flowId: `${flowId}-${index}`,
    timestamp,
    topic: TOPIC_SPLUNK_JSON,
    partition: 0,
    offset: String(index),
    key: commandName || null,
    value,
    flowIdSource: FLOW_ID_SOURCE_SPLUNK,
    containerName,
    level,
    rawMessage,
    structuredMessage,
    eventType,
    flowName,
  };
}

export function convertToKafkaMessages(entries: JsonLogEntry[]): ParsedMessage[] {
  return entries
    .map(convertEntryToMessage)
    .filter((msg): msg is ParsedMessage => msg !== null && !isUnknownLevel(msg.level));
}
