export interface JsonLogEntry {
  preview: boolean;
  result: {
    '@timestamp'?: string;
    _raw?: string;
    structured?: {
      message?: string;
      level?: string;
      logger_name?: string;
      flowId?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export interface ParsedMessage {
  id: string;
  flowId: string;
  timestamp: Date;
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string;
  flowIdSource?: string;
  containerName?: string;
  level?: string;
  rawMessage?: string;
  structuredMessage?: string;
}
