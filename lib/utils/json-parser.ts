import { JsonLogEntry } from '@/lib/types/json-viewer';

export const UNKNOWN_LEVEL = 'unknown';
export const FLOW_ID_PATTERN = /Flow ID:?\s*([a-f0-9-]{36})/i;
export const FLOW_ID_ALT_PATTERN = /flowId[=:]\s*([a-f0-9-]{36})/i;
export const TOPIC_SPLUNK_JSON = 'splunk-json';
export const FLOW_ID_SOURCE_SPLUNK = 'splunk';

export function parseSingleJson(text: string): JsonLogEntry[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return [parsed];
    }
    return null;
  } catch {
    return null;
  }
}

export function parseNdjson(text: string): { entries: JsonLogEntry[]; errors: string[] } {
  const lines = text.split('\n');
  const entries: JsonLogEntry[] = [];
  const errors: string[] = [];
  let accumulatedJson = '';
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() && !accumulatedJson.trim()) continue;

    accumulatedJson += (accumulatedJson ? '\n' : '') + line;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
    }

    if (braceCount === 0 && bracketCount === 0 && accumulatedJson.trim()) {
      try {
        const parsed = JSON.parse(accumulatedJson.trim());
        if (Array.isArray(parsed)) {
          entries.push(...parsed);
        } else if (typeof parsed === 'object' && parsed !== null) {
          entries.push(parsed);
        } else {
          errors.push(`Line ${i + 1}: Invalid JSON format`);
        }
      } catch (lineError) {
        errors.push(`Line ${i + 1}: ${lineError instanceof Error ? lineError.message : 'Parse error'}`);
      }
      accumulatedJson = '';
      braceCount = 0;
      bracketCount = 0;
      inString = false;
      escapeNext = false;
    }
  }

  if (accumulatedJson.trim() && braceCount === 0 && bracketCount === 0) {
    try {
      const parsed = JSON.parse(accumulatedJson.trim());
      if (Array.isArray(parsed)) {
        entries.push(...parsed);
      } else if (typeof parsed === 'object' && parsed !== null) {
        entries.push(parsed);
      }
    } catch {
      if (accumulatedJson.trim()) {
        errors.push('Final entry: Parse error');
      }
    }
  }

  return { entries, errors };
}

export function parseJsonFile(text: string): { entries: JsonLogEntry[]; error: string | null } {
  if (!text || text.trim().length === 0) {
    return { entries: [], error: 'File is empty' };
  }

  const singleJsonResult = parseSingleJson(text);
  if (singleJsonResult) {
    return { entries: singleJsonResult, error: null };
  }

  const { entries, errors } = parseNdjson(text);
  if (entries.length === 0) {
    return { entries: [], error: 'Failed to parse any JSON entries' };
  }

  const error =
    errors.length > 0
      ? `Parsed ${entries.length} entries with ${errors.length} error(s). First error: ${errors[0]}`
      : null;
  return { entries, error };
}
