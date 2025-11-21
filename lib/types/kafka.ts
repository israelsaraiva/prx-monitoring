export interface KafkaMessage {
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

export interface BrokerConfig {
  id: string;
  name: string;
  broker: string;
  topics: string;
  createdAt: Date;
}
