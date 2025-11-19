'use client';

import { GraphQLSubscription } from '@/components/GraphQLSubscription';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ArrowLeft, Database } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface GraphQLMessage {
  id: string;
  timestamp: Date;
  data: string;
}

const STORAGE_KEYS = {
  graphQLEndpoint: 'graphql-endpoint',
  graphQLQuery: 'graphql-query',
  graphQLHeaders: 'graphql-headers',
};

export default function GraphQLPage() {
  // GraphQL Subscription state
  const [graphQLEndpoint, setGraphQLEndpoint] = useState('');
  const [graphQLQuery, setGraphQLQuery] = useState('');
  const [graphQLHeaders, setGraphQLHeaders] = useState('');
  const [graphQLMessages, setGraphQLMessages] = useState<GraphQLMessage[]>([]);
  const [isGraphQLConnected, setIsGraphQLConnected] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEndpoint = localStorage.getItem(STORAGE_KEYS.graphQLEndpoint);
      const savedQuery = localStorage.getItem(STORAGE_KEYS.graphQLQuery);
      const savedHeaders = localStorage.getItem(STORAGE_KEYS.graphQLHeaders);

      if (savedEndpoint) setGraphQLEndpoint(savedEndpoint);
      if (savedQuery) setGraphQLQuery(savedQuery);
      if (savedHeaders) setGraphQLHeaders(savedHeaders);
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

  return (
    <div className='h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 animate-in fade-in duration-300'>
      <div className='h-full max-w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col'>
        <div className='mb-4 sm:mb-6 flex-shrink-0'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2'>
            <div className='flex items-start gap-2 sm:gap-3'>
              <div className='h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0'>
                <Database className='h-4 w-4 sm:h-6 sm:w-6 text-white' />
              </div>
              <div>
                <h1 className='text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight'>GraphQL Subscriptions</h1>
                <p className='text-sm sm:text-base text-muted-foreground mt-1'>Real-time GraphQL subscription monitoring</p>
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
      </div>
    </div>
  );
}
