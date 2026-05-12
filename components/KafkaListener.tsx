'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrokerConfig, KafkaMessage } from '@/lib/types/kafka';
import { Edit, Loader2, Play, Plus, Save, Settings, Square, Trash2, X, XCircle, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface KafkaListenerProps {
  broker: string;
  setBroker: (value: string) => void;
  topics: string;
  setTopics: (value: string) => void;
  messages: KafkaMessage[];
  setMessages: (messages: KafkaMessage[] | ((prev: KafkaMessage[]) => KafkaMessage[])) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  onDisconnect: () => void;
  onClear: () => void;
  onUseMessageForSend?: (message: KafkaMessage) => void;
}

export function KafkaListener({
  broker,
  setBroker,
  topics,
  setTopics,
  messages,
  setMessages,
  isConnected,
  setIsConnected,
  onDisconnect,
  onClear,
  onUseMessageForSend,
}: KafkaListenerProps) {
  const consumerIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const consumerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  // Connection loading state
  const [isConnecting, setIsConnecting] = useState(false);

  // Broker configuration management
  const [savedConfigs, setSavedConfigs] = useState<BrokerConfig[]>([]);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configName, setConfigName] = useState('');
  const [editingConfig, setEditingConfig] = useState<string | null>(null);

  // Load saved configurations from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kafka-broker-configs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Array<Omit<BrokerConfig, 'createdAt'> & { createdAt: string }>;
        const configs: BrokerConfig[] = parsed.map((config) => ({
          ...config,
          createdAt: new Date(config.createdAt),
        }));
        setSavedConfigs(configs);
      } catch (error) {
        console.error('Error loading saved configs:', error);
      }
    }
  }, []);

  // Save configurations to localStorage whenever they change
  useEffect(() => {
    if (savedConfigs.length > 0) {
      localStorage.setItem('kafka-broker-configs', JSON.stringify(savedConfigs));
    }
  }, [savedConfigs]);

  const saveCurrentConfig = () => {
    if (!configName.trim()) {
      toast.error('Config Name Required', {
        description: 'Please enter a name for this configuration',
      });
      return;
    }

    if (!broker.trim() || !topics.trim()) {
      toast.error('Missing Information', {
        description: 'Please provide both broker and topics before saving',
      });
      return;
    }

    const newConfig: BrokerConfig = {
      id: editingConfig || `config-${Date.now()}`,
      name: configName.trim(),
      broker: broker.trim(),
      topics: topics.trim(),
      createdAt: new Date(),
    };

    if (editingConfig) {
      // Update existing config
      setSavedConfigs((prev) => prev.map((config) => (config.id === editingConfig ? newConfig : config)));
      toast.success('Configuration Updated', {
        description: `Configuration "${configName}" has been updated`,
      });
      setEditingConfig(null);
    } else {
      // Check if name already exists
      if (savedConfigs.some((config) => config.name === configName)) {
        toast.error('Name Already Exists', {
          description: 'Please choose a different name for this configuration',
        });
        return;
      }

      // Add new config
      setSavedConfigs((prev) => [...prev, newConfig]);
      toast.success('Configuration Saved', {
        description: `Configuration "${configName}" has been saved`,
      });
    }

    setConfigName('');
    setShowConfigPanel(false);
  };

  const loadConfig = (config: BrokerConfig) => {
    if (isConnected) {
      toast.error('Disconnect First', {
        description: 'Please disconnect from current broker before switching configurations',
      });
      return;
    }

    setBroker(config.broker);
    setTopics(config.topics);
    setMessages([]); // Clear current messages when switching configs
    toast.success('Configuration Loaded', {
      description: `Loaded "${config.name}" - ${config.broker}`,
    });
  };

  const deleteConfig = (configId: string) => {
    setSavedConfigs((prev) => prev.filter((config) => config.id !== configId));
    toast.success('Configuration Deleted', {
      description: 'Configuration has been removed',
    });
  };

  const startEditConfig = (config: BrokerConfig) => {
    if (isConnected) {
      toast.error('Disconnect First', {
        description: 'Please disconnect from current broker before editing configurations',
      });
      return;
    }

    setConfigName(config.name);
    setBroker(config.broker);
    setTopics(config.topics);
    setEditingConfig(config.id);
    setShowConfigPanel(true);
  };

  const connectToTestKafka = () => {
    if (isConnected) {
      toast.error('Disconnect First', {
        description: 'Please disconnect from current broker before switching',
      });
      return;
    }

    setBroker('localhost:9092');
    setTopics('test-topic,user-events,order-processing,payment-events,notifications');
    toast.info('Test Kafka Configuration Loaded', {
      description: 'Broker and topics set for local Docker Kafka instance',
    });
  };

  const connect = async () => {
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

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connection-test') {
            connectionTestReceived = true;
            if (connectionResolve) {
              connectionResolve();
            }
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
            flowIdSource: data.flowIdSource || 'none',
          };

          setMessages((prev) => [kafkaMessage, ...prev]);
        } catch (error) {
          console.error('Error parsing message:', error, event.data);
        }
      };

      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          if (connectionReject) {
            connectionReject(new Error('EventSource connection failed'));
          }
          setIsConnecting(false);
          setIsConnected(false);
          toast.error('Connection Lost', {
            description: 'Connection to message stream was lost. Please reconnect.',
          });
        }
      };

      // Wait for EventSource to be ready (connection-test message) before connecting to Kafka
      // This ensures the server-side stream is registered and ready to receive messages
      await new Promise<void>((resolve, reject) => {
        connectionResolve = resolve;
        connectionReject = reject;

        const timeout = setTimeout(() => {
          if (!connectionTestReceived) {
            eventSource.close();
            reject(new Error('EventSource connection timeout - did not receive connection-test message'));
          }
        }, 10000);

        // Check if we already received the test message (unlikely but possible)
        if (connectionTestReceived) {
          clearTimeout(timeout);
          resolve();
        }
      });

      // Now connect to Kafka after EventSource is ready
      const response = await fetch('/api/kafka/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker, topics, consumerId }),
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
              const response = await fetch(`/api/kafka/connect?consumerId=${consumerIdToDelete}`, {
                method: 'DELETE',
              });
              if (!response.ok && response.status !== 404) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
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
      toast.success('Connected', {
        description: 'Successfully connected to Kafka broker',
      });
    } catch (error) {
      setIsConnecting(false);
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
  };

  const disconnect = async () => {
    if (consumerRef.current) {
      await consumerRef.current.stop();
      consumerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    onDisconnect();
    toast.info('Disconnected', {
      description: 'Kafka consumer disconnected',
    });
  };

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
            headers: null,
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

  useEffect(() => {
    return () => {
      // Only cleanup on unmount, not on tab switch
      if (consumerRef.current) {
        consumerRef.current.stop();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Expose function to resend message via window (for KafkaMessageFlowGraph)
  useEffect(() => {
    (window as { resendKafkaMessage?: (message: KafkaMessage) => void }).resendKafkaMessage = (
      message: KafkaMessage
    ) => {
      resendMessage(message);
    };

    return () => {
      delete (window as { resendKafkaMessage?: (message: KafkaMessage) => void }).resendKafkaMessage;
    };
  }, [broker, resendMessage]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Title Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Listener Config</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Connect to a broker and listen to messages from topics
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
            isConnected
              ? 'bg-teal-100/80 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800'
              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50'
          }`}
        >
          {isConnected ? (
            <>
              <div className="h-2 w-2 rounded-full bg-teal-500 dark:bg-teal-400 animate-pulse" /> Connected
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3" /> Disconnected
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Saved Configurations Block */}
        <div className="border border-slate-200/60 dark:border-slate-800/60 rounded-xl bg-white/40 dark:bg-slate-950/40 overflow-hidden backdrop-blur-sm shadow-sm">
          <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-white/60 dark:bg-slate-900/60">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 tracking-wide uppercase">
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              Saved Configurations ({savedConfigs.length})
            </h3>
            <div className="flex items-center gap-2">
              {savedConfigs.length > 0 && (
                <button
                  onClick={() => {
                    localStorage.removeItem('kafka-broker-configs');
                    setSavedConfigs([]);
                    toast.success('All Configurations Cleared');
                  }}
                  className="text-[10px] text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 rounded transition-colors"
                  disabled={isConnected}
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => {
                  setShowConfigPanel(!showConfigPanel);
                  setEditingConfig(null);
                  setConfigName('');
                }}
                className="flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
                disabled={isConnected}
              >
                {showConfigPanel ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {showConfigPanel ? 'Cancel' : 'Add New'}
              </button>
            </div>
          </div>

          {/* Save/Edit Configuration Panel */}
          {showConfigPanel && (
            <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  placeholder="Configuration name (e.g., 'Local Dev', 'Staging')..."
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveCurrentConfig();
                    } else if (e.key === 'Escape') {
                      setShowConfigPanel(false);
                      setEditingConfig(null);
                      setConfigName('');
                    }
                  }}
                  className="flex-1 h-9 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors shadow-inner"
                  autoFocus
                />
                <button
                  onClick={saveCurrentConfig}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 h-9 rounded text-xs font-semibold flex items-center justify-center transition-colors shadow-sm"
                >
                  <Save className="h-3.5 w-3.5 mr-2" />
                  {editingConfig ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Detailed Configurations List */}
          {savedConfigs.length > 0 && (
            <div className="p-4 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="flex flex-col p-3 border border-slate-200/80 dark:border-slate-800/80 rounded-lg bg-white/60 dark:bg-slate-900/60 hover:border-teal-300 dark:hover:border-teal-700/50 transition-colors group relative shadow-sm"
                  >
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{config.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1 truncate max-w-full">{config.broker}</p>
                    </div>

                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditConfig(config)}
                        disabled={isConnected}
                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded transition-colors"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteConfig(config.id)}
                        disabled={isConnected}
                        className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 rounded transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => loadConfig(config)}
                      disabled={isConnected}
                      className="mt-3 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs py-1.5 rounded disabled:opacity-50 transition-colors font-medium shadow-sm"
                    >
                      Load Config
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {savedConfigs.length === 0 && !showConfigPanel && (
            <div className="text-center py-10 px-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">No saved configurations yet</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500">
                Save your broker and topics combinations for quick switching
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="broker" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Broker Endpoint(s)
              </label>
              <button
                onClick={connectToTestKafka}
                disabled={isConnected}
                className="flex items-center text-[10px] text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors font-medium bg-teal-50 dark:bg-teal-950/30 px-2 py-1 rounded"
              >
                <Zap className="mr-1 h-3 w-3" />
                Use Test Kafka
              </button>
            </div>
            <input
              id="broker"
              placeholder="localhost:9092 or broker1:9092,broker2:9092"
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              disabled={isConnected}
              className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors disabled:opacity-50 shadow-inner"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="topics" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Topics (comma-separated)
            </label>
            <input
              id="topics"
              placeholder="topic1,topic2,topic3"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              disabled={isConnected}
              className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors disabled:opacity-50 shadow-inner"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <button
            onClick={connect}
            disabled={isConnecting}
            className={`h-10 w-full flex items-center justify-center rounded text-xs font-semibold transition-all shadow-sm
                ${
                  isConnected
                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-900/30 dark:hover:border-red-800/50'
                    : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-md border border-teal-700/50'
                } disabled:opacity-50`}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
              </>
            ) : isConnected ? (
              <>
                <Square className="mr-2 h-3.5 w-3.5" /> Disconnect
              </>
            ) : (
              <>
                <Play className="mr-2 h-3.5 w-3.5 fill-current" /> Connect
              </>
            )}
          </button>
          <button
            onClick={() => setMessages([])}
            className="h-10 w-full flex items-center justify-center rounded text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-900/80 dark:border-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-sm"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Messages
          </button>
        </div>
      </div>
    </div>
  );
}
