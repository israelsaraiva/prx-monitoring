'use client';

import { KafkaMessage } from '@/lib/types/kafka';
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

const STORAGE_KEYS = {
  broker: 'kafka-broker',
  topics: 'kafka-topics',
  messages: 'kafka-messages',
};

const MAX_STORED_MESSAGES = 200;

interface KafkaConnectionContextValue {
  broker: string;
  setBroker: Dispatch<SetStateAction<string>>;
  topics: string;
  setTopics: Dispatch<SetStateAction<string>>;
  fromBeginning: boolean;
  setFromBeginning: Dispatch<SetStateAction<boolean>>;
  messages: KafkaMessage[];
  setMessages: Dispatch<SetStateAction<KafkaMessage[]>>;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  resendMessage: (message: KafkaMessage) => Promise<void>;
}

const KafkaConnectionContext = createContext<KafkaConnectionContextValue | null>(null);

/**
 * Mounted once in the root layout so the Kafka SSE connection and its state
 * survive route changes between pages instead of being torn down whenever
 * the /kafka page component unmounts.
 */
export function KafkaConnectionProvider({ children }: { children: ReactNode }) {
  const [broker, setBroker] = useState('');
  const [topics, setTopics] = useState('');
  const [fromBeginning, setFromBeginning] = useState(false);
  const [messages, setMessages] = useState<KafkaMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const consumerIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const consumerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedBroker = localStorage.getItem(STORAGE_KEYS.broker);
    const savedTopics = localStorage.getItem(STORAGE_KEYS.topics);
    const savedMessages = localStorage.getItem(STORAGE_KEYS.messages);

    if (savedBroker) setBroker(savedBroker);
    if (savedTopics) setTopics(savedTopics);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages) as Array<Omit<KafkaMessage, 'timestamp'> & { timestamp: string }>;
        setMessages(parsed.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) })));
      } catch (error) {
        console.warn('Failed to load saved messages from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (broker) {
      localStorage.setItem(STORAGE_KEYS.broker, broker);
    } else {
      localStorage.removeItem(STORAGE_KEYS.broker);
    }
  }, [broker]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (topics) {
      localStorage.setItem(STORAGE_KEYS.topics, topics);
    } else {
      localStorage.removeItem(STORAGE_KEYS.topics);
    }
  }, [topics]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (messages.length > 0) {
      try {
        const toStore = messages.slice(0, MAX_STORED_MESSAGES);
        const serialized = JSON.stringify(toStore.map((msg) => ({ ...msg, timestamp: msg.timestamp.toISOString() })));
        localStorage.setItem(STORAGE_KEYS.messages, serialized);
      } catch (error) {
        console.warn('Failed to save messages to localStorage:', error);
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.messages);
    }
  }, [messages]);

  const disconnect = useCallback(async () => {
    if (consumerRef.current) {
      await consumerRef.current.stop();
      consumerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsReconnecting(false);
    toast.info('Disconnected', {
      description: 'Kafka consumer disconnected',
    });
  }, []);

  const connect = useCallback(async () => {
    if (!broker || !topics) {
      toast.error('Missing Information', {
        description: 'Please provide both broker and topics',
      });
      return;
    }

    if (isConnected) {
      await disconnect();
      return;
    }

    setIsConnecting(true);

    try {
      const consumerId = `consumer-${Date.now()}`;
      consumerIdRef.current = consumerId;

      // Create EventSource FIRST to ensure it's ready before consumer starts
      const eventSourceUrl = `/api/kafka/messages?consumerId=${consumerId}`;
      const eventSource = new EventSource(eventSourceUrl);
      eventSourceRef.current = eventSource;

      // Set up message handler BEFORE waiting for connection
      // This ensures messages are handled even if they arrive during connection
      let connectionTestReceived = false;
      let connectionResolve: (() => void) | null = null;
      let connectionReject: ((error: Error) => void) | null = null;
      let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connection-test') {
            connectionTestReceived = true;
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              connectionTimeout = null;
            }
            connectionResolve?.();
            return;
          }

          // Handle actual Kafka messages
          const kafkaMessage: KafkaMessage = {
            id: `${data.topic}-${data.partition}-${data.offset}`,
            flowId: data.flowId || 'unknown',
            timestamp: new Date(data.timestamp || Date.now()),
            topic: data.topic,
            partition: data.partition,
            offset: data.offset,
            key: data.key || null,
            value: data.value || '',
            headers: data.headers && Object.keys(data.headers).length > 0 ? data.headers : undefined,
            flowIdSource: data.flowIdSource || 'none',
          };

          setMessages((prev) => [kafkaMessage, ...prev]);
        } catch (error) {
          console.error('Error parsing message:', error, event.data);
        }
      };

      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          connectionReject?.(new Error('EventSource connection failed'));
          setIsConnecting(false);
          setIsReconnecting(false);
          setIsConnected(false);
          toast.error('Connection Lost', {
            description: 'Connection to message stream was lost. Please reconnect.',
          });
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          // SSE is auto-reconnecting — show indicator but don't treat as fatal
          setIsReconnecting(true);
        }
      };

      // Wait for EventSource to be ready (connection-test message) before connecting to Kafka
      // This ensures the server-side stream is registered and ready to receive messages
      await new Promise<void>((resolve, reject) => {
        connectionResolve = resolve;
        connectionReject = reject;

        connectionTimeout = setTimeout(() => {
          if (!connectionTestReceived) {
            eventSource.close();
            reject(new Error('EventSource connection timeout - did not receive connection-test message'));
          }
        }, 10000);

        // Check if we already received the test message (unlikely but possible)
        if (connectionTestReceived) {
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          resolve();
        }
      });

      // Now connect to Kafka after EventSource is ready
      const response = await fetch('/api/kafka/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker, topics, consumerId, fromBeginning }),
      });

      if (!response.ok) {
        const error = await response.json();
        eventSource.close();
        throw new Error(error.error || 'Failed to connect');
      }

      consumerRef.current = {
        stop: async () => {
          eventSource.close();
          if (consumerIdRef.current) {
            const consumerIdToDelete = consumerIdRef.current;
            consumerIdRef.current = null;
            try {
              const deleteResponse = await fetch(`/api/kafka/connect?consumerId=${consumerIdToDelete}`, {
                method: 'DELETE',
              });
              if (!deleteResponse.ok && deleteResponse.status !== 404) {
                const error = await deleteResponse.json().catch(() => ({ error: deleteResponse.statusText }));
                console.error('Failed to delete consumer:', error);
              }
            } catch (error) {
              console.error('Error deleting consumer:', error);
            }
          }
        },
      };

      setIsConnected(true);
      setIsConnecting(false);
      setIsReconnecting(false);
      toast.success('Connected', {
        description: `Successfully connected to Kafka broker${fromBeginning ? ' (from beginning)' : ''}`,
      });
    } catch (error) {
      setIsConnecting(false);
      setIsReconnecting(false);
      setIsConnected(false);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      let userMessage = 'Failed to connect to Kafka broker.';
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
        userMessage =
          'Cannot connect to Kafka broker. Please verify the broker address is correct and the broker is running.';
      } else if (errorMessage.includes('timeout')) {
        userMessage = 'Connection timeout. The broker may be unreachable or taking too long to respond.';
      } else if (errorMessage.includes('Failed to connect')) {
        userMessage = errorMessage;
      } else if (errorMessage.includes('Failed to subscribe')) {
        userMessage = errorMessage;
      } else if (errorMessage.includes('Invalid broker')) {
        userMessage = 'Invalid broker configuration. Please check the broker address format.';
      } else if (errorMessage.includes('No valid topics')) {
        userMessage = 'No valid topics provided. Please enter at least one topic name.';
      }

      toast.error('Connection Failed', {
        description: userMessage,
      });
    }
  }, [broker, topics, fromBeginning, isConnected, disconnect]);

  const resendMessage = useCallback(
    async (message: KafkaMessage) => {
      if (!broker) {
        toast.error('Missing Broker', {
          description: 'Please provide a broker endpoint',
        });
        return;
      }

      try {
        const response = await fetch('/api/kafka/produce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broker,
            topic: message.topic,
            key: message.key || null,
            value: message.value,
            headers: message.headers || null,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to resend message');
        }

        toast.success('Message Resent', {
          description: `Message resent to ${message.topic} (partition: ${result.partition}, offset: ${result.offset})`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error('Resend Failed', {
          description: errorMessage,
        });
      }
    },
    [broker]
  );

  // This provider lives in the root layout, so it only unmounts when the whole app does —
  // navigating between pages never tears down the SSE connection.
  useEffect(() => {
    return () => {
      if (consumerRef.current) {
        consumerRef.current.stop();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const value: KafkaConnectionContextValue = {
    broker,
    setBroker,
    topics,
    setTopics,
    fromBeginning,
    setFromBeginning,
    messages,
    setMessages,
    isConnected,
    isConnecting,
    isReconnecting,
    connect,
    disconnect,
    resendMessage,
  };

  return <KafkaConnectionContext.Provider value={value}>{children}</KafkaConnectionContext.Provider>;
}

export function useKafkaConnection() {
  const context = useContext(KafkaConnectionContext);
  if (!context) {
    throw new Error('useKafkaConnection must be used within a KafkaConnectionProvider');
  }
  return context;
}
