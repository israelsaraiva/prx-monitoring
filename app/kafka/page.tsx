'use client';

import { KafkaListener } from '@/components/KafkaListener';
import { KafkaMessageFlowGraph } from '@/components/KafkaMessageFlowGraph';
import { SendMessageForm } from '@/components/SendMessageForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { KafkaMessage } from '@/lib/types/kafka';
import { Activity, ArrowLeft, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const STORAGE_KEYS = {
  kafkaBroker: 'kafka-broker',
  kafkaTopics: 'kafka-topics',
  kafkaMessages: 'kafka-messages',
};

const MAX_STORED_MESSAGES = 200;

export default function KafkaPage() {
  // Kafka Listener state
  const [kafkaBroker, setKafkaBroker] = useState('');
  const [kafkaTopics, setKafkaTopics] = useState('');
  const [kafkaMessages, setKafkaMessages] = useState<KafkaMessage[]>([]);
  const [isKafkaConnected, setIsKafkaConnected] = useState(false);
  const [kafkaSearchQuery, setKafkaSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [isSendMessageExpanded, setIsSendMessageExpanded] = useState(false);

  // Pending message for send form (replaces window global)
  const [pendingSendMessage, setPendingSendMessage] = useState<KafkaMessage | null>(null);
  const resendBrokerRef = useRef(kafkaBroker);
  useEffect(() => {
    resendBrokerRef.current = kafkaBroker;
  }, [kafkaBroker]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBroker = localStorage.getItem(STORAGE_KEYS.kafkaBroker);
      const savedTopics = localStorage.getItem(STORAGE_KEYS.kafkaTopics);
      const savedMessages = localStorage.getItem(STORAGE_KEYS.kafkaMessages);

      if (savedBroker) setKafkaBroker(savedBroker);
      if (savedTopics) setKafkaTopics(savedTopics);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages) as Array<Omit<KafkaMessage, 'timestamp'> & { timestamp: string }>;
          const messages: KafkaMessage[] = parsed.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setKafkaMessages(messages);
        } catch (error) {
          console.warn('Failed to load saved messages from localStorage:', error);
        }
      }
    }
  }, []);

  // Save Kafka broker to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (kafkaBroker) {
        localStorage.setItem(STORAGE_KEYS.kafkaBroker, kafkaBroker);
      } else {
        localStorage.removeItem(STORAGE_KEYS.kafkaBroker);
      }
    }
  }, [kafkaBroker]);

  // Save Kafka topics to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (kafkaTopics) {
        localStorage.setItem(STORAGE_KEYS.kafkaTopics, kafkaTopics);
      } else {
        localStorage.removeItem(STORAGE_KEYS.kafkaTopics);
      }
    }
  }, [kafkaTopics]);

  // Save Kafka messages to localStorage (capped at MAX_STORED_MESSAGES)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (kafkaMessages.length > 0) {
        try {
          const toStore = kafkaMessages.slice(0, MAX_STORED_MESSAGES);
          const serialized = JSON.stringify(
            toStore.map((msg) => ({
              ...msg,
              timestamp: msg.timestamp.toISOString(),
            }))
          );
          localStorage.setItem(STORAGE_KEYS.kafkaMessages, serialized);
        } catch (error) {
          console.warn('Failed to save messages to localStorage:', error);
        }
      } else {
        localStorage.removeItem(STORAGE_KEYS.kafkaMessages);
      }
    }
  }, [kafkaMessages]);

  // Derive unique topic list from received messages
  const uniqueTopics = useMemo(() => {
    const topics = new Set(kafkaMessages.map((m) => m.topic));
    return Array.from(topics).sort();
  }, [kafkaMessages]);

  // Kafka handlers
  const handleKafkaDisconnect = () => {
    setIsKafkaConnected(false);
  };

  const handleKafkaClear = () => {
    setKafkaBroker('');
    setKafkaTopics('');
    setKafkaMessages([]);
    setKafkaSearchQuery('');
    setTopicFilter(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.kafkaBroker);
      localStorage.removeItem(STORAGE_KEYS.kafkaTopics);
      localStorage.removeItem(STORAGE_KEYS.kafkaMessages);
    }
  };

  const handleResendMessage = useCallback(
    async (message: KafkaMessage) => {
      if (!kafkaBroker) {
        toast.error('Missing Broker', { description: 'Please provide a broker endpoint' });
        return;
      }
      try {
        const response = await fetch('/api/kafka/produce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broker: kafkaBroker,
            topic: message.topic,
            key: message.key || null,
            value: message.value,
            headers: message.headers || null,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to resend message');
        toast.success('Message Resent', {
          description: `Message resent to ${message.topic} (partition: ${result.partition}, offset: ${result.offset})`,
        });
      } catch (error) {
        toast.error('Resend Failed', { description: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
    [kafkaBroker]
  );

  const handleUseMessageForSend = useCallback((message: KafkaMessage) => {
    setPendingSendMessage(message);
    setIsSendMessageExpanded(true);
  }, []);

  const handleExportAll = useCallback(() => {
    const data = kafkaMessages.map((msg) => ({
      id: msg.id,
      flowId: msg.flowId,
      flowIdSource: msg.flowIdSource,
      timestamp: msg.timestamp.toISOString(),
      topic: msg.topic,
      partition: msg.partition,
      offset: msg.offset,
      key: msg.key,
      headers: msg.headers,
      value: (() => {
        try {
          return JSON.parse(msg.value);
        } catch {
          return msg.value;
        }
      })(),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kafka-messages-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [kafkaMessages]);

  // Filter Kafka messages based on search query
  const filteredKafkaMessages = useMemo(() => {
    if (!kafkaSearchQuery.trim()) {
      return kafkaMessages;
    }

    const query = kafkaSearchQuery.toLowerCase().trim();
    return kafkaMessages.filter((msg) => {
      // Search in message value (content)
      if (msg.value.toLowerCase().includes(query)) {
        return true;
      }

      // Search in topic
      if (msg.topic.toLowerCase().includes(query)) {
        return true;
      }

      // Search in flowId
      if (msg.flowId.toLowerCase().includes(query)) {
        return true;
      }

      // Search in key if present
      if (msg.key && msg.key.toLowerCase().includes(query)) {
        return true;
      }

      // Search in headers
      if (msg.headers) {
        const headersString = JSON.stringify(msg.headers).toLowerCase();
        if (headersString.includes(query)) {
          return true;
        }
      }

      // Try to parse JSON and search in parsed content
      try {
        const parsed = JSON.parse(msg.value);
        const jsonString = JSON.stringify(parsed).toLowerCase();
        if (jsonString.includes(query)) {
          return true;
        }
      } catch {
        // Not valid JSON, already checked value above
      }

      return false;
    });
  }, [kafkaMessages, kafkaSearchQuery]);

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative selection:bg-teal-200 dark:selection:bg-teal-900 animate-in fade-in duration-300">
      {/* Background decoration matching home page */}
      <div className="absolute inset-0 z-0 h-full w-full bg-slate-50 dark:bg-slate-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-teal-400 dark:bg-teal-600 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 h-full w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col">
        <div className="mb-4 sm:mb-6 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-teal-100/80 dark:bg-teal-500/10 flex items-center justify-center shadow-sm ring-1 ring-inset ring-teal-500/20 flex-shrink-0 transition-transform hover:scale-105 duration-300">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Kafka Listener
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
                  Real-time Kafka message monitoring and visualization
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-2 border-slate-300 dark:border-slate-600 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all h-10 w-10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Home</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full items-stretch">
            {/* Kafka Listener - Left Side */}
            <div className="w-full lg:w-[500px] lg:flex-shrink-0 self-start group rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl hover:shadow-xl transition-all duration-500 overflow-hidden">
              <KafkaListener
                broker={kafkaBroker}
                setBroker={setKafkaBroker}
                topics={kafkaTopics}
                setTopics={setKafkaTopics}
                messages={kafkaMessages}
                setMessages={setKafkaMessages}
                isConnected={isKafkaConnected}
                setIsConnected={setIsKafkaConnected}
                onDisconnect={handleKafkaDisconnect}
                onClear={handleKafkaClear}
                onResendMessage={handleResendMessage}
                onUseMessageForSend={handleUseMessageForSend}
              />
            </div>
            {/* Message Flow Visualization and Send Message - Right Side */}
            <div className="w-full lg:flex-1 overflow-hidden h-full">
              <div className="h-full flex flex-col lg:flex-row gap-4">
                {/* Message Flow Visualization Card */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl h-full flex flex-col min-h-0 overflow-hidden transition-all duration-500">
                    <CardHeader className="pb-4 flex-shrink-0 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl sm:text-2xl text-slate-900 dark:text-white font-bold">
                            Flow Visualization
                          </CardTitle>
                          <CardDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                            Messages grouped by flowId and displayed in a graph format
                          </CardDescription>
                        </div>
                        {kafkaMessages.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Badge
                              variant="secondary"
                              className="text-xs sm:text-sm bg-teal-100/80 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                            >
                              {new Set(filteredKafkaMessages.map((m) => m.flowId)).size} flow
                              {new Set(filteredKafkaMessages.map((m) => m.flowId)).size !== 1 ? 's' : ''}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs sm:text-sm border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                            >
                              {filteredKafkaMessages.length} message{filteredKafkaMessages.length !== 1 ? 's' : ''}
                              {(kafkaSearchQuery || topicFilter) && ` (of ${kafkaMessages.length})`}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs sm:text-sm border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                            >
                              {
                                filteredKafkaMessages.filter((m) => m.flowId !== 'unknown' && m.flowId !== 'error')
                                  .length
                              }{' '}
                              linked
                            </Badge>
                            <Button
                              onClick={handleExportAll}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-teal-300/60 text-teal-700 dark:border-teal-700/60 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/20 hover:bg-teal-100 dark:hover:bg-teal-900/30"
                              title="Export all messages as JSON"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Export All
                            </Button>
                          </div>
                        )}
                      </div>
                      {kafkaMessages.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {/* Topic filter chips */}
                          {uniqueTopics.length > 1 && (
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                Topic:
                              </span>
                              <button
                                onClick={() => setTopicFilter(null)}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                                  topicFilter === null
                                    ? 'bg-teal-600 text-white border-teal-600'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                                }`}
                              >
                                All
                              </button>
                              {uniqueTopics.map((topic) => (
                                <button
                                  key={topic}
                                  onClick={() => setTopicFilter(topicFilter === topic ? null : topic)}
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                                    topicFilter === topic
                                      ? 'bg-teal-600 text-white border-teal-600'
                                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                                  }`}
                                >
                                  {topic}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Search messages by content, topic, flowId, key, or headers..."
                              value={kafkaSearchQuery}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKafkaSearchQuery(e.target.value)}
                              className="pl-10 h-10"
                            />
                          </div>
                          {(kafkaSearchQuery || topicFilter) && (
                            <p className="text-xs text-muted-foreground">
                              Showing {filteredKafkaMessages.length} of {kafkaMessages.length} messages
                              {topicFilter && ` · topic: ${topicFilter}`}
                            </p>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col">
                      <div className="flex-1 min-h-0">
                        <KafkaMessageFlowGraph
                          messages={filteredKafkaMessages}
                          searchQuery={kafkaSearchQuery}
                          topicFilter={topicFilter}
                          onResendMessage={handleResendMessage}
                          onUseMessageForSend={handleUseMessageForSend}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {/* Send Message Card - Collapsible */}
                <div className="relative flex items-center">
                  {/* Toggle Button */}
                  <Button
                    onClick={() => setIsSendMessageExpanded(!isSendMessageExpanded)}
                    variant="outline"
                    size="icon"
                    className="h-12 w-8 rounded-l-md rounded-r-none border-r-0 border-2 border-teal-200/50 dark:border-teal-800/30 bg-teal-100 dark:bg-teal-900 hover:bg-teal-200 dark:hover:bg-teal-800 z-10 flex-shrink-0"
                    aria-label={isSendMessageExpanded ? 'Collapse send message' : 'Expand send message'}
                  >
                    {isSendMessageExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                  {/* Send Message Card */}
                  <div
                    className={`h-full transition-all duration-300 ease-in-out overflow-hidden ${isSendMessageExpanded ? 'w-[400px] opacity-100 pl-4' : 'w-0 opacity-0'}`}
                  >
                    <Card className="h-full rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl flex flex-col">
                      <CardContent className="flex-1 overflow-hidden min-h-0 p-4 lg:p-6 bg-transparent">
                        <SendMessageForm
                          broker={kafkaBroker}
                          defaultTopic={kafkaTopics.split(',')[0]?.trim()}
                          pendingMessage={pendingSendMessage}
                          onExpand={() => setIsSendMessageExpanded(true)}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
