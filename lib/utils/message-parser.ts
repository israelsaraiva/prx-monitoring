export interface ParsedMessageData {
  commandName?: string;
  sourceMicroservice?: string;
  success?: boolean;
  errorMessage?: string;
  rawValue: string;
}

export function parseMessage(value: string): ParsedMessageData {
  try {
    const parsed = JSON.parse(value);
    const resource = parsed.resource || {};
    const commandId = resource.commandId || resource.type || '';
    const commandName = commandId.includes(':') ? commandId.split(':')[0] : commandId;
    const sourceMicroservice = parsed.sourceMicroservice || resource.sourceMicroservice || parsed.host || resource.host;

    return {
      commandName,
      sourceMicroservice,
      success: resource.success,
      errorMessage: resource.payload?.errorMessage || resource.payload?.error,
      rawValue: value,
    };
  } catch {
    return { rawValue: value };
  }
}

export function formatMessageContent(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 4);
  } catch {
    return value;
  }
}
