'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Client, createClient, SubscribePayload } from 'graphql-ws';
import { CheckCircle2, Clock, Copy, Database, Play, Square, TestTube, Trash2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ReceivedMessage {
  id: string;
  timestamp: Date;
  data: string;
}

interface GraphQLSubscriptionProps {
  endpoint: string;
  setEndpoint: (value: string) => void;
  subscriptionQuery: string;
  setSubscriptionQuery: (value: string) => void;
  headers: string;
  setHeaders: (value: string) => void;
  messages: ReceivedMessage[];
  setMessages: (messages: ReceivedMessage[] | ((prev: ReceivedMessage[]) => ReceivedMessage[])) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  onDisconnect: () => void;
  onClear: () => void;
}

export function GraphQLSubscription({ endpoint, setEndpoint, subscriptionQuery, setSubscriptionQuery, headers, setHeaders, messages, setMessages, isConnected, setIsConnected, onDisconnect, onClear }: GraphQLSubscriptionProps) {
  const clientRef = useRef<Client | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const unsubscribe = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setIsSubscribed(false);
    toast.info('Unsubscribed', {
      description: 'GraphQL subscription stopped',
    });
  };

  const subscribe = async () => {
    if (!isConnected || !clientRef.current) {
      toast.error('Not Connected', {
        description: 'Please connect to the endpoint first',
      });
      return;
    }

    if (!subscriptionQuery.trim()) {
      toast.error('Missing Query', {
        description: 'Please provide a subscription query',
      });
      return;
    }

    if (isSubscribed) {
      unsubscribe();
    }

    try {
      // Headers are already sent via connectionParams during connection
      // This ensures they're available for all subscriptions on this connection
      const unsubscribeFn = clientRef.current.subscribe(
        {
          query: subscriptionQuery,
        } as SubscribePayload,
        {
          next: (data) => {
            const newMessage: ReceivedMessage = {
              id: Date.now().toString(),
              timestamp: new Date(),
              data: JSON.stringify(data, null, 2),
            };
            setMessages((prev) => [newMessage, ...prev]);
          },
          error: (err) => {
            console.error('Subscription error:', err);
            let errorMessage = 'Unknown error';
            if (err instanceof Error) {
              errorMessage = err.message;
            } else if (err && typeof err === 'object' && 'message' in err) {
              errorMessage = String(err.message);
            } else if (err && typeof err === 'object' && 'type' in err && err.type === 'close') {
              errorMessage = 'WebSocket connection closed unexpectedly';
            } else {
              errorMessage = String(err);
            }
            const errorMsg: ReceivedMessage = {
              id: Date.now().toString(),
              timestamp: new Date(),
              data: `Error: ${errorMessage}`,
            };
            setMessages((prev) => [errorMsg, ...prev]);
            setIsSubscribed(false);
            toast.error('Subscription Error', {
              description: errorMessage,
            });
          },
          complete: () => {
            console.log('Subscription completed');
            setIsSubscribed(false);
          },
        }
      );

      unsubscribeRef.current = unsubscribeFn;
      setIsSubscribed(true);
      toast.success('Subscribed', {
        description: 'Successfully subscribed to GraphQL query',
      });
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Subscription Failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setIsSubscribed(false);
    }
  };

  const validateConnection = async () => {
    if (!endpoint) {
      toast.error('Missing Information', {
        description: 'Please provide an endpoint URL',
      });
      return;
    }

    if (isConnected) {
      toast.info('Already Connected', {
        description: 'You are already connected to the endpoint',
      });
      return;
    }

    // Validate headers JSON if provided
    if (headers.trim()) {
      try {
        const parsedHeaders = JSON.parse(headers);
        if (typeof parsedHeaders !== 'object' || parsedHeaders === null) {
          toast.error('Invalid Headers', {
            description: 'Headers must be a valid JSON object',
          });
          return;
        }
      } catch (parseError) {
        toast.error('Invalid Headers', {
          description: 'Headers must be valid JSON. Please check your input.',
        });
        return;
      }
    }

    // Try to create a test client and validate WebSocket connection
    try {
      let connectionParams: Record<string, unknown> = {};

      if (headers.trim()) {
        const parsedHeaders = JSON.parse(headers);
        if (typeof parsedHeaders === 'object' && parsedHeaders !== null) {
          connectionParams = parsedHeaders;
        }
      }

      const testClient = createClient({
        url: endpoint,
        connectionParams: connectionParams,
      });

      let validated = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      // Listen for connection opened event
      const dispose = testClient.on('opened', () => {
        validated = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        testClient.dispose();
        toast.success('Connection Valid', {
          description: 'Successfully validated connection to GraphQL endpoint',
        });
      });

      // Listen for connection errors
      testClient.on('error', (err) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        testClient.dispose();
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Validation error:', err);
        toast.error('Validation Failed', {
          description: errorMessage || 'Connection validation failed',
        });
      });

      // Listen for connection closed
      testClient.on('closed', () => {
        if (!validated && timeoutId) {
          clearTimeout(timeoutId);
          testClient.dispose();
          toast.error('Validation Failed', {
            description: 'Connection closed before validation',
          });
        }
      });

      // Timeout after 5 seconds
      timeoutId = setTimeout(() => {
        if (!validated) {
          testClient.dispose();
          toast.error('Validation Timeout', {
            description: 'Connection validation timed out after 5 seconds',
          });
        }
      }, 5000);
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Validation Failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const connect = async () => {
    if (!endpoint) {
      toast.error('Missing Information', {
        description: 'Please provide an endpoint URL',
      });
      return;
    }

    if (isConnected) {
      disconnect();
      return;
    }

    try {
      let connectionParams: Record<string, unknown> = {};

      if (headers.trim()) {
        try {
          const parsedHeaders = JSON.parse(headers);
          if (typeof parsedHeaders === 'object' && parsedHeaders !== null) {
            connectionParams = parsedHeaders;
          }
        } catch (parseError) {
          toast.error('Invalid Headers', {
            description: 'Headers must be valid JSON. Please check your input.',
          });
          return;
        }
      }

      const client = createClient({
        url: endpoint,
        connectionParams: connectionParams,
      });

      clientRef.current = client;
      setIsConnected(true);
      toast.success('Connected', {
        description: 'Successfully connected to GraphQL endpoint',
      });

      if (subscriptionQuery.trim()) {
        subscribe();
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Connection Failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.dispose();
      clientRef.current = null;
    }
    setIsConnected(false);
    setIsSubscribed(false);
    onDisconnect();
    toast.info('Disconnected', {
      description: 'GraphQL connection closed',
    });
  };

  useEffect(() => {
    return () => {
      // Only cleanup on unmount, not on tab switch
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (clientRef.current) {
        clientRef.current.dispose();
      }
    };
  }, []);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className='flex flex-col lg:flex-row gap-4 lg:gap-6 h-full items-stretch min-h-0'>
      <Card className='border-2 border-blue-200/50 shadow-lg bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-blue-800/30 flex flex-col lg:w-[500px] lg:flex-shrink-0 self-start'>
        <CardHeader className='pb-4 flex-shrink-0'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
            <div className='flex items-center gap-2 sm:gap-3'>
              <div>
                <CardTitle className='text-xl sm:text-2xl'>Subscription Config</CardTitle>
              </div>
            </div>
            <div className='flex flex-col gap-1 items-end'>
              <Badge variant={isConnected ? 'success' : 'secondary'} className='gap-1.5 text-xs sm:text-sm'>
                {isConnected ? (
                  <>
                    <div className='h-2 w-2 rounded-full bg-green-500 animate-pulse' />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle className='h-3 w-3' />
                    Disconnected
                  </>
                )}
              </Badge>
              {isConnected && (
                <Badge variant={isSubscribed ? 'success' : 'secondary'} className='gap-1.5 text-xs'>
                  {isSubscribed ? (
                    <>
                      <div className='h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse' />
                      Subscribed
                    </>
                  ) : (
                    <>
                      <XCircle className='h-2.5 w-2.5' />
                      Not Subscribed
                    </>
                  )}
                </Badge>
              )}
            </div>
          </div>
          <CardDescription className='mt-1 text-xs sm:text-sm'>Connect to a GraphQL subscription endpoint and receive real-time messages</CardDescription>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='space-y-4 flex-shrink-0'>
            <div className='space-y-2'>
              <Label htmlFor='endpoint' className='text-sm font-medium'>
                Endpoint URL
              </Label>
              <Input id='endpoint' placeholder='ws://localhost:4000/graphql' value={endpoint} onChange={(e) => setEndpoint(e.target.value)} disabled={isConnected} className='h-10' />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='headers' className='text-sm font-medium'>
                Headers (JSON)
              </Label>
              <Textarea id='headers' placeholder='{"Authorization": "Bearer token", "X-Custom-Header": "value"}' value={headers} onChange={(e) => setHeaders(e.target.value)} disabled={isConnected} className='font-mono text-xs min-h-[80px] rounded-md border-slate-200/60 dark:border-slate-700/40 focus:border-blue-500/60 dark:focus:border-blue-400/60 transition-colors' />
              <p className='text-xs text-muted-foreground'>Optional: Add headers as JSON object. These will be sent with the connection.</p>
            </div>
          </div>
          <div className='flex flex-col gap-3 pt-2 flex-shrink-0'>
            {!isConnected && (
              <Button onClick={validateConnection} variant='outline' size='lg' className='w-full' disabled={!endpoint.trim()}>
                <TestTube className='mr-2 h-4 w-4' />
                Validate Connection
              </Button>
            )}
            <Button onClick={connect} variant={isConnected ? 'destructive' : 'default'} size='lg' className='w-full'>
              {isConnected ? (
                <>
                  <Square className='mr-2 h-4 w-4' />
                  Disconnect
                </>
              ) : (
                <>
                  <Play className='mr-2 h-4 w-4' />
                  Connect
                </>
              )}
            </Button>
          </div>
          {isConnected && (
            <div className='space-y-4 flex-shrink-0 pt-2 border-t border-slate-200/60 dark:border-slate-700/40'>
              <div className='space-y-2'>
                <Label htmlFor='query' className='text-sm font-medium'>
                  Subscription Query
                </Label>
                <Textarea id='query' placeholder='subscription { messageAdded { id content } }' value={subscriptionQuery} onChange={(e) => setSubscriptionQuery(e.target.value)} disabled={isSubscribed} className='font-mono text-xs min-h-[200px] rounded-md border-slate-200/60 dark:border-slate-700/40 focus:border-blue-500/60 dark:focus:border-blue-400/60 transition-colors' />
              </div>
              <div className='flex flex-col gap-3'>
                <Button onClick={isSubscribed ? unsubscribe : subscribe} variant={isSubscribed ? 'destructive' : 'default'} size='lg' className='w-full' disabled={!subscriptionQuery.trim()}>
                  {isSubscribed ? (
                    <>
                      <Square className='mr-2 h-4 w-4' />
                      Unsubscribe
                    </>
                  ) : (
                    <>
                      <Play className='mr-2 h-4 w-4' />
                      Subscribe
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          <div className='flex flex-col gap-3 pt-2 flex-shrink-0'>
            <Button onClick={() => setMessages([])} variant='outline' size='lg' className='w-full'>
              <Trash2 className='mr-2 h-4 w-4' />
              Clear Messages
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className='border-2 border-indigo-200/50 shadow-lg bg-gradient-to-br from-white to-indigo-50/20 dark:from-slate-900 dark:to-slate-800 dark:border-indigo-800/30 flex-1 flex flex-col h-full min-h-0'>
        <CardHeader className='pb-4 flex-shrink-0'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
            <div>
              <CardTitle className='text-xl sm:text-2xl'>Received Messages</CardTitle>
              <CardDescription className='mt-1 text-xs sm:text-sm'>
                {messages.length} message{messages.length !== 1 ? 's' : ''} received
              </CardDescription>
            </div>
            {messages.length > 0 && (
              <Badge variant='secondary' className='text-xs sm:text-sm bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'>
                {messages.length} total
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className='flex-1 overflow-hidden'>
          <div className='space-y-3 h-full overflow-y-auto pr-2'>
            {messages.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-center h-full'>
                <div className='h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4'>
                  <Database className='h-8 w-8 text-blue-600 dark:text-blue-400' />
                </div>
                <p className='text-muted-foreground font-medium'>No messages received yet</p>
                <p className='text-sm text-muted-foreground mt-1'>Connect to start receiving real-time messages</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className='group border border-blue-200/50 dark:border-blue-800/30 rounded-xl p-5 bg-gradient-to-br from-white to-blue-50/20 dark:from-slate-800 dark:to-slate-800/50 hover:from-blue-50 hover:to-indigo-50/30 dark:hover:from-slate-700 dark:hover:to-slate-700/50 transition-all shadow-sm hover:shadow-md'>
                  <div className='flex justify-between items-start mb-3'>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-3.5 w-3.5 text-muted-foreground' />
                      <span className='text-xs font-medium text-muted-foreground'>{message.timestamp.toLocaleTimeString()}</span>
                      <span className='text-xs text-muted-foreground'>• {message.timestamp.toLocaleDateString()}</span>
                    </div>
                    <Button variant='ghost' size='sm' className='h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity' onClick={() => copyToClipboard(message.data, message.id)}>
                      {copiedId === message.id ? <CheckCircle2 className='h-3.5 w-3.5 text-green-600' /> : <Copy className='h-3.5 w-3.5' />}
                    </Button>
                  </div>
                  <div className='font-mono text-xs min-h-[200px] max-h-[300px] rounded-md border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/30 dark:bg-indigo-950/20 p-3 overflow-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words'>{message.data}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
