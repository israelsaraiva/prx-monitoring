'use client';

import { KafkaListener } from '@/components/KafkaListener';
import { KafkaMessageFlowGraph } from '@/components/KafkaMessageFlowGraph';
import { SendMessageForm } from '@/components/SendMessageForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Activity, ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

const STORAGE_KEYS = {
  kafkaBroker: 'kafka-broker',
  kafkaTopics: 'kafka-topics',
  kafkaMessages: 'kafka-messages',
};

export default function KafkaPage() {
  // Kafka Listener state
  const [kafkaBroker, setKafkaBroker] = useState('');
  const [kafkaTopics, setKafkaTopics] = useState('');
  const [kafkaMessages, setKafkaMessages] = useState<KafkaMessage[]>([]);
  const [isKafkaConnected, setIsKafkaConnected] = useState(false);
  const [kafkaSearchQuery, setKafkaSearchQuery] = useState('');
  const [isSendMessageExpanded, setIsSendMessageExpanded] = useState(false);

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

  // Save Kafka messages to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (kafkaMessages.length > 0) {
        try {
          const serialized = JSON.stringify(
            kafkaMessages.map((msg) => ({
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

  // Kafka handlers
  const handleKafkaDisconnect = () => {
    setIsKafkaConnected(false);
  };

  const handleKafkaClear = () => {
    setKafkaBroker('');
    setKafkaTopics('');
    setKafkaMessages([]);
    setKafkaSearchQuery('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.kafkaBroker);
      localStorage.removeItem(STORAGE_KEYS.kafkaTopics);
      localStorage.removeItem(STORAGE_KEYS.kafkaMessages);
    }
  };

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
    <div className='h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 animate-in fade-in duration-300'>
      <div className='h-full max-w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col'>
        <div className='mb-4 sm:mb-6 flex-shrink-0'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2'>
            <div className='flex items-start gap-2 sm:gap-3'>
              <div className='h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg flex-shrink-0'>
                <Activity className='h-4 w-4 sm:h-6 sm:w-6 text-white' />
              </div>
              <div>
                <h1 className='text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight'>Kafka Listener</h1>
                <p className='text-sm sm:text-base text-muted-foreground mt-1'>Real-time Kafka message monitoring and visualization</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <ThemeToggle />
              <Link href='/'>
                <Button variant='outline' size='icon' className='border-2 border-slate-300 dark:border-slate-600 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all h-10 w-10'>
                  <ArrowLeft className='h-4 w-4' />
                  <span className='sr-only'>Home</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className='flex-1 min-h-0'>
          <div className='flex flex-col lg:flex-row gap-4 lg:gap-6 h-full items-stretch'>
            {/* Kafka Listener - Left Side */}
            <div className='w-full lg:w-[500px] lg:flex-shrink-0 self-start'>
              <KafkaListener broker={kafkaBroker} setBroker={setKafkaBroker} topics={kafkaTopics} setTopics={setKafkaTopics} messages={kafkaMessages} setMessages={setKafkaMessages} isConnected={isKafkaConnected} setIsConnected={setIsKafkaConnected} onDisconnect={handleKafkaDisconnect} onClear={handleKafkaClear} onUseMessageForSend={() => {}} />
            </div>
            {/* Message Flow Visualization and Send Message - Right Side */}
            <div className='w-full lg:flex-1 overflow-hidden h-full'>
              <div className='h-full flex flex-col lg:flex-row gap-4'>
                {/* Message Flow Visualization Card */}
                <div className='flex-1 min-h-0 overflow-hidden'>
                  <Card className='border-2 border-purple-200/50 shadow-lg bg-gradient-to-br from-white to-purple-50/20 dark:from-slate-900 dark:to-slate-800 dark:border-purple-800/30 h-full flex flex-col min-h-0'>
                    <CardHeader className='pb-4 flex-shrink-0'>
                      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
                        <div>
                          <CardTitle className='text-xl sm:text-2xl'>Kafka Messages Flow Visualization</CardTitle>
                          <CardDescription className='mt-1 text-xs sm:text-sm'>Messages grouped by flowId and displayed in a graph format</CardDescription>
                        </div>
                        {kafkaMessages.length > 0 && (
                          <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                            <Badge variant='secondary' className='text-xs sm:text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'>
                              {new Set(filteredKafkaMessages.map((m) => m.flowId)).size} flow{new Set(filteredKafkaMessages.map((m) => m.flowId)).size !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant='outline' className='text-xs sm:text-sm'>
                              {filteredKafkaMessages.length} message{filteredKafkaMessages.length !== 1 ? 's' : ''}
                              {kafkaSearchQuery && ` (of ${kafkaMessages.length})`}
                            </Badge>
                            <Badge variant='outline' className='text-xs sm:text-sm'>
                              {filteredKafkaMessages.filter((m) => m.flowId !== 'unknown' && m.flowId !== 'error').length} linked
                            </Badge>
                          </div>
                        )}
                      </div>
                      {kafkaMessages.length > 0 && (
                        <div className='mt-4'>
                          <div className='relative'>
                            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input type='text' placeholder='Search messages by content, topic, flowId, or key...' value={kafkaSearchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKafkaSearchQuery(e.target.value)} className='pl-10 h-10' />
                          </div>
                          {kafkaSearchQuery && (
                            <p className='text-xs text-muted-foreground mt-2'>
                              Showing {filteredKafkaMessages.length} of {kafkaMessages.length} messages
                            </p>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className='flex-1 overflow-hidden min-h-0 flex flex-col'>
                      <div className='flex-1 min-h-0'>
                        <KafkaMessageFlowGraph messages={filteredKafkaMessages} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {/* Send Message Card - Collapsible */}
                <div className='relative flex items-center'>
                  {/* Toggle Button */}
                  <Button
                    onClick={() => setIsSendMessageExpanded(!isSendMessageExpanded)}
                    variant='outline'
                    size='icon'
                    className='h-12 w-8 rounded-l-md rounded-r-none border-r-0 border-2 border-teal-200/50 dark:border-teal-800/30 bg-teal-100 dark:bg-teal-900 hover:bg-teal-200 dark:hover:bg-teal-800 z-10 flex-shrink-0'
                    aria-label={isSendMessageExpanded ? 'Collapse send message' : 'Expand send message'}
                  >
                    {isSendMessageExpanded ? <ChevronRight className='h-4 w-4' /> : <ChevronLeft className='h-4 w-4' />}
                  </Button>
                  {/* Send Message Card */}
                  <div className={`h-full transition-all duration-300 ease-in-out overflow-hidden ${isSendMessageExpanded ? 'w-[400px] opacity-100' : 'w-0 opacity-0'}`}>
                    <Card className='h-full border-2 border-teal-200/50 shadow-lg bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-teal-800/30 flex flex-col'>
                      <CardContent className='flex-1 overflow-hidden min-h-0 p-4 lg:p-6'>
                        <SendMessageForm broker={kafkaBroker} defaultTopic={kafkaTopics.split(',')[0]?.trim()} />
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
