import { JsonLogEntry, ParsedMessage } from '@/lib/types/json-viewer';
import { extractFlowIdFromObject } from './flow-id-extractor';
import {
  FLOW_ID_ALT_PATTERN,
  FLOW_ID_PATTERN,
  FLOW_ID_SOURCE_SPLUNK,
  TOPIC_SPLUNK_JSON,
  UNKNOWN_LEVEL,
} from './json-parser';

export function extractFlowId(structured: Record<string, unknown>, rawValue: string): string {
  if (structured.flowId) {
    return String(structured.flowId);
  }

  const extracted = extractFlowIdFromObject(structured);
  if (extracted) {
    return extracted;
  }

  try {
    const parsed = JSON.parse(rawValue);
    const extractedFromRaw = extractFlowIdFromObject(parsed);
    if (extractedFromRaw) {
      return extractedFromRaw;
    }
  } catch {
    if (structured.message && typeof structured.message === 'string') {
      const flowIdMatch = structured.message.match(FLOW_ID_PATTERN) || structured.message.match(FLOW_ID_ALT_PATTERN);
      if (flowIdMatch) {
        return flowIdMatch[1];
      }
    }
  }

  return UNKNOWN_LEVEL;
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

export function extractCommandAndError(
  rawValue: string,
  structured: Record<string, unknown>
): { commandName?: string; success?: boolean; errorMessage?: string } {
  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue);
      return extractCommandInfo(parsed.resource || {});
    } catch {
      if (structured.message && typeof structured.message === 'string') {
        try {
          const messageParsed = JSON.parse(structured.message);
          return extractCommandInfo(messageParsed.resource || {});
        } catch {
          // Not a JSON string, ignore
        }
      }
    }
  }

  return {};
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
  const rawValue = result['_raw'] || result._raw || JSON.stringify(result);
  const rawMessage =
    (result['_raw'] || result._raw) && typeof (result['_raw'] || result._raw) === 'string'
      ? String(result['_raw'] || result._raw)
      : undefined;

  const flowId = extractFlowId(structured, typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue));
  const { commandName, success, errorMessage } = extractCommandAndError(
    typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue),
    structured
  );

  const timestamp = result['@timestamp'] ? new Date(result['@timestamp']) : new Date();
  const containerName = result['kubernetes.container_name'] ? String(result['kubernetes.container_name']) : undefined;
  const level = extractLevel(result, structured);

  if (isUnknownLevel(level)) {
    return null;
  }

  const structuredMessage = extractMessage(result, structured);
  const value = typeof rawValue === 'string' ? formatJsonValue(rawValue) : JSON.stringify(rawValue);

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
  };
}

export function convertToKafkaMessages(entries: JsonLogEntry[]): ParsedMessage[] {
  return entries
    .map(convertEntryToMessage)
    .filter((msg): msg is ParsedMessage => msg !== null && !isUnknownLevel(msg.level));
}
