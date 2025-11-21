import { FLOW_ID_ALT_PATTERN, FLOW_ID_PATTERN } from './json-parser';

export function extractFlowIdFromObject(obj: Record<string, unknown>): string | null {
  if (obj.flowId) {
    return String(obj.flowId);
  }

  if (obj.resource && typeof obj.resource === 'object') {
    const resource = obj.resource as Record<string, unknown>;
    if (resource.flowId) {
      return String(resource.flowId);
    }
  }

  if (obj.message && typeof obj.message === 'string') {
    const flowIdMatch = obj.message.match(FLOW_ID_PATTERN) || obj.message.match(FLOW_ID_ALT_PATTERN);
    if (flowIdMatch) {
      return flowIdMatch[1];
    }

    try {
      const messageParsed = JSON.parse(obj.message);
      if (messageParsed.resource?.flowId) {
        return String(messageParsed.resource.flowId);
      }
      if (messageParsed.flowId) {
        return String(messageParsed.flowId);
      }
    } catch {
      // Not a JSON string, ignore
    }
  }

  return null;
}
