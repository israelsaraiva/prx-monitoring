'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Client, createClient, SubscribePayload } from 'graphql-ws';
import { CheckCircle2, Clock, Copy, Database, Play, Square, Trash2, XCircle } from 'lucide-react';
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

export function GraphQLSubscription({
  endpoint,
  setEndpoint,
  subscriptionQuery,
  setSubscriptionQuery,
  headers,
  setHeaders,
  messages,
  setMessages,
  isConnected,
  setIsConnected,
  onDisconnect,
  onClear,
}: GraphQLSubscriptionProps) {
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
    if (!clientRef.current) {
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
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full items-stretch min-h-0">
      <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl flex flex-col lg:w-[450px] lg:flex-shrink-0 self-start transition-all duration-500 overflow-hidden h-full min-h-0">
        <CardHeader className="pb-4 flex-shrink-0 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div>
                <CardTitle className="text-xl sm:text-2xl">Subscription Config</CardTitle>
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Badge variant={isConnected ? 'success' : 'secondary'} className="gap-1.5 text-xs sm:text-sm">
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
              {isConnected && (
                <Badge variant={isSubscribed ? 'success' : 'secondary'} className="gap-1.5 text-xs">
                  {isSubscribed ? (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      Subscribed
                    </>
                  ) : (
                    <>
                      <XCircle className="h-2.5 w-2.5" />
                      Not Subscribed
                    </>
                  )}
                </Badge>
              )}
            </div>
          </div>
          <CardDescription className="mt-1 text-xs sm:text-sm">
            Connect to a GraphQL subscription endpoint and receive real-time messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4 flex-shrink-0">
            <div className="space-y-2">
              <Label htmlFor="endpoint" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Endpoint URL
              </Label>
              <Input
                id="endpoint"
                placeholder="ws://localhost:4000/graphql"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                disabled={isConnected}
                className="h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-blue-500/50 shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headers" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Headers (JSON)
              </Label>
              <Textarea
                id="headers"
                placeholder='{"Authorization": "Bearer token", "X-Custom-Header": "value"}'
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                disabled={isConnected}
                className="font-mono text-xs min-h-[80px] rounded-md bg-white/50 dark:bg-slate-950/50 border-slate-200/60 dark:border-slate-800/60 focus-visible:ring-blue-500/50 text-slate-800 dark:text-slate-200 transition-colors shadow-inner"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Optional: Add headers as JSON object. These will be sent with the connection.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-2 flex-shrink-0">
            <Button onClick={connect} variant={isConnected ? 'destructive' : 'default'} size="lg" className="w-full">
              {isConnected ? (
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
          </div>
          {isConnected && (
            <div className="space-y-4 flex-shrink-0 pt-4 mt-2 border-t border-slate-200/40 dark:border-slate-800/40">
              <div className="space-y-2">
                <Label htmlFor="query" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Subscription Query
                </Label>
                <Textarea
                  id="query"
                  placeholder="subscription { messageAdded { id content } }"
                  value={subscriptionQuery}
                  onChange={(e) => setSubscriptionQuery(e.target.value)}
                  disabled={isSubscribed}
                  className="font-mono text-xs p-4 min-h-[200px] rounded-md bg-white/50 dark:bg-slate-950/50 border-slate-200/60 dark:border-slate-800/60 focus-visible:ring-blue-500/50 text-slate-800 dark:text-slate-200 transition-colors shadow-inner resize-none"
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={isSubscribed ? unsubscribe : subscribe}
                  variant={isSubscribed ? 'destructive' : 'default'}
                  size="lg"
                  className="w-full"
                  disabled={!subscriptionQuery.trim()}
                >
                  {isSubscribed ? (
                    <>
                      <Square className="mr-2 h-4 w-4" />
                      Unsubscribe
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Subscribe
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 pt-2 flex-shrink-0">
            <Button onClick={() => setMessages([])} variant="outline" size="lg" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Messages
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl flex-1 flex flex-col h-full min-h-0 transition-all duration-500 overflow-hidden">
        <CardHeader className="pb-4 flex-shrink-0 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl text-slate-900 dark:text-white font-bold">
                Received Messages
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {messages.length} message{messages.length !== 1 ? 's' : ''} received
              </CardDescription>
            </div>
            {messages.length > 0 && (
              <Badge
                variant="secondary"
                className="text-xs sm:text-sm bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
              >
                {messages.length} total
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="space-y-3 h-full overflow-y-auto pr-2 pt-4 pl-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                <div className="h-16 w-16 rounded-full bg-blue-100/50 dark:bg-blue-900/20 flex items-center justify-center mb-4 ring-1 ring-blue-500/20">
                  <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-medium">No messages received yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Connect to start receiving real-time messages
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="group border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-5 bg-white/50 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        • {message.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700"
                      onClick={() => copyToClipboard(message.data, message.id)}
                    >
                      {copiedId === message.id ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                      )}
                    </Button>
                  </div>
                  <div className="font-mono text-xs min-h-[200px] max-h-[300px] rounded-md border border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/50 p-4 overflow-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words shadow-inner">
                    {message.data}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
