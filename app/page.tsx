'use client';

import { GraphQLSubscription } from '@/components/GraphQLSubscription';
import { KafkaListener } from '@/components/KafkaListener';
import { MessageFlowGraph } from '@/components/MessageFlowGraph';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Activity, Database } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GraphQLMessage {
  id: string;
  timestamp: Date;
  data: string;
}

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
  graphQLEndpoint: 'graphql-endpoint',
  graphQLQuery: 'graphql-query',
  graphQLHeaders: 'graphql-headers',
  kafkaBroker: 'kafka-broker',
  kafkaTopics: 'kafka-topics',
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('graphql');

  // GraphQL Subscription state
  const [graphQLEndpoint, setGraphQLEndpoint] = useState('');
  const [graphQLQuery, setGraphQLQuery] = useState('');
  const [graphQLHeaders, setGraphQLHeaders] = useState('');
  const [graphQLMessages, setGraphQLMessages] = useState<GraphQLMessage[]>([]);
  const [isGraphQLConnected, setIsGraphQLConnected] = useState(false);

  // Kafka Listener state
  const [kafkaBroker, setKafkaBroker] = useState('');
  const [kafkaTopics, setKafkaTopics] = useState('');
  const [kafkaMessages, setKafkaMessages] = useState<KafkaMessage[]>([]);
  const [isKafkaConnected, setIsKafkaConnected] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEndpoint = localStorage.getItem(STORAGE_KEYS.graphQLEndpoint);
      const savedQuery = localStorage.getItem(STORAGE_KEYS.graphQLQuery);
      const savedHeaders = localStorage.getItem(STORAGE_KEYS.graphQLHeaders);
      const savedBroker = localStorage.getItem(STORAGE_KEYS.kafkaBroker);
      const savedTopics = localStorage.getItem(STORAGE_KEYS.kafkaTopics);

      if (savedEndpoint) setGraphQLEndpoint(savedEndpoint);
      if (savedQuery) setGraphQLQuery(savedQuery);
      if (savedHeaders) setGraphQLHeaders(savedHeaders);
      if (savedBroker) setKafkaBroker(savedBroker);
      if (savedTopics) setKafkaTopics(savedTopics);
    }
  }, []);

  // Save GraphQL endpoint to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (graphQLEndpoint) {
        localStorage.setItem(STORAGE_KEYS.graphQLEndpoint, graphQLEndpoint);
      } else {
        localStorage.removeItem(STORAGE_KEYS.graphQLEndpoint);
      }
    }
  }, [graphQLEndpoint]);

  // Save GraphQL query to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (graphQLQuery) {
        localStorage.setItem(STORAGE_KEYS.graphQLQuery, graphQLQuery);
      } else {
        localStorage.removeItem(STORAGE_KEYS.graphQLQuery);
      }
    }
  }, [graphQLQuery]);

  // Save GraphQL headers to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (graphQLHeaders) {
        localStorage.setItem(STORAGE_KEYS.graphQLHeaders, graphQLHeaders);
      } else {
        localStorage.removeItem(STORAGE_KEYS.graphQLHeaders);
      }
    }
  }, [graphQLHeaders]);

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

  // GraphQL handlers
  const handleGraphQLDisconnect = () => {
    setIsGraphQLConnected(false);
  };

  const handleGraphQLClear = () => {
    setGraphQLEndpoint('');
    setGraphQLQuery('');
    setGraphQLHeaders('');
    setGraphQLMessages([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.graphQLEndpoint);
      localStorage.removeItem(STORAGE_KEYS.graphQLQuery);
      localStorage.removeItem(STORAGE_KEYS.graphQLHeaders);
    }
  };

  // Kafka handlers
  const handleKafkaDisconnect = () => {
    setIsKafkaConnected(false);
  };

  const handleKafkaClear = () => {
    setKafkaBroker('');
    setKafkaTopics('');
    setKafkaMessages([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.kafkaBroker);
      localStorage.removeItem(STORAGE_KEYS.kafkaTopics);
    }
  };

  return (
    <div className='h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'>
      <div className='h-full max-w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col'>
        <div className='mb-4 sm:mb-6 flex-shrink-0'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2'>
            <div className='flex items-center gap-2 sm:gap-3'>
              <div className='h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0'>
                <Activity className='h-4 w-4 sm:h-6 sm:w-6 text-white' />
              </div>
              <div>
                <h1 className='text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight'>MACC Monitoring Tool</h1>
                <p className='text-sm sm:text-base text-muted-foreground mt-1'>Real-time message monitoring and visualization</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <Tabs defaultValue='graphql' className='w-full flex-1 flex flex-col min-h-0' onValueChange={(value) => setActiveTab(value)}>
          <TabsList className='grid w-full max-w-md grid-cols-2 mb-4 sm:mb-6 bg-slate-100 dark:bg-slate-800 flex-shrink-0'>
            <TabsTrigger value='graphql' className='flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-blue-500 data-[state=active]:text-white'>
              <Database className='h-3 w-3 sm:h-4 sm:w-4' />
              <span className='hidden sm:inline'>GraphQL Subscription</span>
              <span className='sm:hidden'>GraphQL</span>
            </TabsTrigger>
            <TabsTrigger value='kafka' className='flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-teal-500 data-[state=active]:text-white'>
              <Activity className='h-3 w-3 sm:h-4 sm:w-4' />
              <span className='hidden sm:inline'>Kafka Listener</span>
              <span className='sm:hidden'>Kafka</span>
            </TabsTrigger>
          </TabsList>
          <div className='relative flex-1 min-h-0'>
            <div className={activeTab === 'graphql' ? 'h-full' : 'hidden'}>
              <GraphQLSubscription
                endpoint={graphQLEndpoint}
                setEndpoint={setGraphQLEndpoint}
                subscriptionQuery={graphQLQuery}
                setSubscriptionQuery={setGraphQLQuery}
                headers={graphQLHeaders}
                setHeaders={setGraphQLHeaders}
                messages={graphQLMessages}
                setMessages={setGraphQLMessages}
                isConnected={isGraphQLConnected}
                setIsConnected={setIsGraphQLConnected}
                onDisconnect={handleGraphQLDisconnect}
                onClear={handleGraphQLClear}
              />
            </div>
            <div className={activeTab === 'kafka' ? 'h-full' : 'hidden'}>
              <div className='flex flex-col lg:flex-row gap-4 lg:gap-6 h-full items-stretch'>
                {/* Kafka Listener - Left Side */}
                <div className='w-full lg:w-[500px] lg:flex-shrink-0 self-start'>
                  <KafkaListener broker={kafkaBroker} setBroker={setKafkaBroker} topics={kafkaTopics} setTopics={setKafkaTopics} messages={kafkaMessages} setMessages={setKafkaMessages} isConnected={isKafkaConnected} setIsConnected={setIsKafkaConnected} onDisconnect={handleKafkaDisconnect} onClear={handleKafkaClear} />
                </div>
                {/* Message Flow Visualization - Right Side */}
                <div className='w-full lg:flex-1 overflow-hidden h-full'>
                  <div className='h-full flex flex-col'>
                    <Card className='border-2 border-purple-200/50 shadow-lg bg-gradient-to-br from-white to-purple-50/20 dark:from-slate-900 dark:to-slate-800 dark:border-purple-800/30 flex-1 flex flex-col min-h-0'>
                      <CardHeader className='pb-4 flex-shrink-0'>
                        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
                          <div>
                            <CardTitle className='text-xl sm:text-2xl'>Message Flow Visualization</CardTitle>
                            <CardDescription className='mt-1 text-xs sm:text-sm'>Messages grouped by flowId and displayed in a graph format</CardDescription>
                          </div>
                          {kafkaMessages.length > 0 && (
                            <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                              <Badge variant='secondary' className='text-xs sm:text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'>
                                {new Set(kafkaMessages.map((m) => m.flowId)).size} flow{new Set(kafkaMessages.map((m) => m.flowId)).size !== 1 ? 's' : ''}
                              </Badge>
                              <Badge variant='outline' className='text-xs sm:text-sm'>
                                {kafkaMessages.length} message{kafkaMessages.length !== 1 ? 's' : ''}
                              </Badge>
                              <Badge variant='outline' className='text-xs sm:text-sm'>
                                {kafkaMessages.filter((m) => m.flowId !== 'unknown' && m.flowId !== 'error').length} linked
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className='flex-1 overflow-hidden min-h-0 flex flex-col'>
                        <div className='flex-1 min-h-0'>
                          <MessageFlowGraph messages={kafkaMessages} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
