"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Play,
  Square,
  Trash2,
  Activity,
  CheckCircle2,
  XCircle,
  Hash,
  Clock,
  Save,
  Settings,
  ChevronDown,
  Plus,
  Edit,
  X,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface KafkaMessage {
  id: string;
  flowId: string;
  timestamp: Date;
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string;
  flowIdSource?: string;
}

interface BrokerConfig {
  id: string;
  name: string;
  broker: string;
  topics: string;
  createdAt: Date;
}

interface KafkaListenerProps {
  broker: string;
  setBroker: (value: string) => void;
  topics: string;
  setTopics: (value: string) => void;
  messages: KafkaMessage[];
  setMessages: (
    messages: KafkaMessage[] | ((prev: KafkaMessage[]) => KafkaMessage[])
  ) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  onDisconnect: () => void;
  onClear: () => void;
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
}: KafkaListenerProps) {
  const consumerIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const consumerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  // Connection loading state
  const [isConnecting, setIsConnecting] = useState(false);

  // Broker configuration management
  const [savedConfigs, setSavedConfigs] = useState<BrokerConfig[]>([]);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configName, setConfigName] = useState("");
  const [editingConfig, setEditingConfig] = useState<string | null>(null);

  // Load saved configurations from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("kafka-broker-configs");
    if (saved) {
      try {
        const configs = JSON.parse(saved).map((config: any) => ({
          ...config,
          createdAt: new Date(config.createdAt),
        }));
        setSavedConfigs(configs);
      } catch (error) {
        console.error("Error loading saved configs:", error);
      }
    }
  }, []);

  // Save configurations to localStorage whenever they change
  useEffect(() => {
    if (savedConfigs.length > 0) {
      localStorage.setItem(
        "kafka-broker-configs",
        JSON.stringify(savedConfigs)
      );
    }
  }, [savedConfigs]);

  const saveCurrentConfig = () => {
    if (!configName.trim()) {
      toast.error("Config Name Required", {
        description: "Please enter a name for this configuration",
      });
      return;
    }

    if (!broker.trim() || !topics.trim()) {
      toast.error("Missing Information", {
        description: "Please provide both broker and topics before saving",
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
      setSavedConfigs((prev) =>
        prev.map((config) => (config.id === editingConfig ? newConfig : config))
      );
      toast.success("Configuration Updated", {
        description: `Configuration "${configName}" has been updated`,
      });
      setEditingConfig(null);
    } else {
      // Check if name already exists
      if (savedConfigs.some((config) => config.name === configName)) {
        toast.error("Name Already Exists", {
          description: "Please choose a different name for this configuration",
        });
        return;
      }

      // Add new config
      setSavedConfigs((prev) => [...prev, newConfig]);
      toast.success("Configuration Saved", {
        description: `Configuration "${configName}" has been saved`,
      });
    }

    setConfigName("");
    setShowConfigPanel(false);
  };

  const loadConfig = (config: BrokerConfig) => {
    if (isConnected) {
      toast.error("Disconnect First", {
        description:
          "Please disconnect from current broker before switching configurations",
      });
      return;
    }

    setBroker(config.broker);
    setTopics(config.topics);
    setMessages([]); // Clear current messages when switching configs
    toast.success("Configuration Loaded", {
      description: `Loaded "${config.name}" - ${config.broker}`,
    });
  };

  const deleteConfig = (configId: string) => {
    setSavedConfigs((prev) => prev.filter((config) => config.id !== configId));
    toast.success("Configuration Deleted", {
      description: "Configuration has been removed",
    });
  };

  const startEditConfig = (config: BrokerConfig) => {
    if (isConnected) {
      toast.error("Disconnect First", {
        description:
          "Please disconnect from current broker before editing configurations",
      });
      return;
    }

    setConfigName(config.name);
    setBroker(config.broker);
    setTopics(config.topics);
    setEditingConfig(config.id);
    setShowConfigPanel(true);
  };

  const connect = async () => {
    if (!broker || !topics) {
      toast.error("Missing Information", {
        description: "Please provide both broker and topics",
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

      const response = await fetch("/api/kafka/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broker, topics, consumerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to connect");
      }

      const eventSourceUrl = `/api/kafka/messages?consumerId=${consumerId}`;
      const eventSource = new EventSource(eventSourceUrl);
      eventSourceRef.current = eventSource;

      let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
      let hasReceivedTestMessage = false;

      connectionTimeout = setTimeout(() => {
        if (!hasReceivedTestMessage && eventSource.readyState === EventSource.CONNECTING) {
          eventSource.close();
          setIsConnecting(false);
          setIsConnected(false);
          toast.error("Connection Timeout", {
            description: "Failed to establish connection to message stream. Please try again.",
          });
        }
      }, 5000);

      eventSource.onopen = () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "connection-test") {
            hasReceivedTestMessage = true;
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              connectionTimeout = null;
            }
            return;
          }

          const kafkaMessage: KafkaMessage = {
            id: `${data.topic}-${data.partition}-${data.offset}`,
            flowId: data.flowId || "unknown",
            timestamp: new Date(data.timestamp || Date.now()),
            topic: data.topic,
            partition: data.partition,
            offset: data.offset,
            key: data.key || null,
            value: data.value || "",
            flowIdSource: data.flowIdSource || "none",
          };

          setMessages((prev) => [kafkaMessage, ...prev]);
        } catch {
          // Ignore parsing errors for malformed messages
        }
      };

      eventSource.onerror = () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }

        if (eventSource.readyState === EventSource.CLOSED) {
          setIsConnecting(false);
          setIsConnected(false);
          
          if (!hasReceivedTestMessage) {
            toast.error("Connection Failed", {
              description: "Unable to establish connection to message stream. Please check your network connection and try again.",
            });
          } else {
            toast.error("Connection Lost", {
              description: "Connection to message stream was lost. Please reconnect.",
            });
          }
        }
      };

      consumerRef.current = {
        stop: async () => {
          eventSource.close();
          if (consumerIdRef.current) {
            await fetch(
              `/api/kafka/connect?consumerId=${consumerIdRef.current}`,
              {
                method: "DELETE",
              }
            );
          }
        },
      };

      setIsConnected(true);
      setIsConnecting(false);
      toast.success("Connected", {
        description: "Successfully connected to Kafka broker",
      });
    } catch (error) {
      setIsConnecting(false);
      setIsConnected(false);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      let userMessage = "Failed to connect to Kafka broker.";
      if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENOTFOUND")) {
        userMessage = "Cannot connect to Kafka broker. Please verify the broker address is correct and the broker is running.";
      } else if (errorMessage.includes("timeout")) {
        userMessage = "Connection timeout. The broker may be unreachable or taking too long to respond.";
      } else if (errorMessage.includes("Failed to connect")) {
        userMessage = errorMessage;
      } else if (errorMessage.includes("Failed to subscribe")) {
        userMessage = errorMessage;
      } else if (errorMessage.includes("Invalid broker")) {
        userMessage = "Invalid broker configuration. Please check the broker address format.";
      } else if (errorMessage.includes("No valid topics")) {
        userMessage = "No valid topics provided. Please enter at least one topic name.";
      }
      
      toast.error("Connection Failed", {
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
    toast.info("Disconnected", {
      description: "Kafka consumer disconnected",
    });
  };

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

  return (
    <div className="flex flex-col lg:h-full">
      <Card className="border-2 border-teal-200/50 shadow-lg bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-teal-800/30 flex flex-col lg:h-full">
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md flex-shrink-0">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl">Kafka Listener</CardTitle>
              </div>
            </div>
            <Badge
              variant={isConnected ? "success" : "secondary"}
              className="gap-1.5 text-xs sm:text-sm"
            >
              {isConnected ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>
          <CardDescription className="mt-1 text-xs sm:text-sm">
            Connect to a Kafka broker and listen to messages from specified
            topics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 lg:flex-1 lg:overflow-y-auto lg:min-h-0">
          {/* Broker Configuration Management */}
          <div className="border border-slate-200/60 dark:border-slate-700/40 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                Saved Configurations ({savedConfigs.length})
              </h3>
              <div className="flex gap-2 w-full sm:w-auto">
                {savedConfigs.length > 0 && (
                  <Button
                    onClick={() => {
                      localStorage.removeItem("kafka-broker-configs");
                      setSavedConfigs([]);
                      toast.success("All Configurations Cleared");
                    }}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    disabled={isConnected}
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setShowConfigPanel(!showConfigPanel);
                    setEditingConfig(null);
                    setConfigName("");
                  }}
                  variant="outline"
                  size="sm"
                  disabled={isConnected}
                >
                  {showConfigPanel ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {showConfigPanel ? "Cancel" : "Add New"}
                </Button>
              </div>
            </div>

            {/* Save/Edit Configuration Panel */}
            {showConfigPanel && (
              <div className="space-y-3 p-3 border border-slate-200/60 dark:border-slate-700/40 rounded-md bg-white dark:bg-slate-800 mb-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Configuration name (e.g., 'Local Dev', 'Staging')..."
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveCurrentConfig();
                      } else if (e.key === "Escape") {
                        setShowConfigPanel(false);
                        setEditingConfig(null);
                        setConfigName("");
                      }
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <Button onClick={saveCurrentConfig} size="sm" className="w-full sm:w-auto">
                    <Save className="h-4 w-4 mr-1" />
                    {editingConfig ? "Update" : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editingConfig
                    ? "Update the broker and topics fields below, then click Update"
                    : "Fill in the broker and topics fields below, then save this configuration"}
                </p>
              </div>
            )}

            {/* Quick Load Buttons for Saved Configurations */}
            {savedConfigs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Quick Load:</p>
                <div className="flex flex-wrap gap-2">
                  {savedConfigs.slice(0, 4).map((config) => (
                    <Button
                      key={config.id}
                      onClick={() => loadConfig(config)}
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                      disabled={isConnected}
                    >
                      {config.name}
                    </Button>
                  ))}
                  {savedConfigs.length > 4 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                      disabled
                    >
                      +{savedConfigs.length - 4} more...
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Configurations List */}
            {savedConfigs.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm font-medium cursor-pointer hover:text-primary">
                  View All Configurations ({savedConfigs.length})
                </summary>
                <div className="space-y-2 max-h-40 overflow-y-auto mt-2 border border-slate-200/60 dark:border-slate-700/40 rounded p-2 bg-white dark:bg-slate-800">
                  {savedConfigs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-center gap-2 p-2 border border-slate-200/50 dark:border-slate-700/30 rounded-md bg-slate-50 dark:bg-slate-700"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {config.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {config.broker}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Topics: {config.topics}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {config.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          onClick={() => loadConfig(config)}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={isConnected}
                        >
                          Load
                        </Button>
                        <Button
                          onClick={() => startEditConfig(config)}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={isConnected}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => deleteConfig(config.id)}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                          disabled={isConnected}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {savedConfigs.length === 0 && !showConfigPanel && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">
                  No saved configurations yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Save your broker and topics combinations for quick switching
                </p>
              </div>
            )}
          </div>

            <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="broker" className="text-sm font-medium">
                Broker Endpoint(s)
              </Label>
              <Input
                id="broker"
                placeholder="localhost:9092 or broker1:9092,broker2:9092"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                disabled={isConnected}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topics" className="text-sm font-medium">
                Topics (comma-separated)
              </Label>
              <Input
                id="topics"
                placeholder="topic1,topic2,topic3"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                disabled={isConnected}
                className="h-10"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={connect}
              variant={isConnected ? "destructive" : "default"}
              size="lg"
              className="w-full sm:min-w-[140px] sm:w-auto"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : isConnected ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Disconnect
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Connect
                </>
              )}
            </Button>
            <Button onClick={() => setMessages([])} variant="outline" size="lg" className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Messages
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
