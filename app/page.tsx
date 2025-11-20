'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ArrowRight, Database, FileText } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className='h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative animate-in fade-in duration-300'>
      <div className='h-full max-w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col'>
        <div className='mb-4 sm:mb-6 flex-shrink-0'>
          <div className='flex flex-col items-center gap-4 mb-2'>
            <div className='flex items-start gap-2 sm:gap-3'>
              <div className='h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0'>
                <Activity className='h-4 w-4 sm:h-6 sm:w-6 text-white' />
              </div>
              <div className='text-center'>
                <h1 className='text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight'>MACC Monitoring Tool</h1>
                <p className='text-sm sm:text-base text-muted-foreground mt-1'>Real-time message monitoring and visualization</p>
              </div>
            </div>
          </div>
        </div>

        <div className='flex-1 flex items-center justify-center'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl'>
            <Card className='border-2 border-blue-200/50 shadow-lg bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-blue-800/30 hover:shadow-xl transition-shadow'>
              <CardHeader>
                <div className='flex items-center gap-3 mb-2'>
                  <div className='h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md'>
                    <Database className='h-6 w-6 text-white' />
                  </div>
                  <CardTitle className='text-2xl'>GraphQL Subscriptions</CardTitle>
                </div>
                <CardDescription className='text-base'>Connect to GraphQL endpoints and subscribe to real-time data streams</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className='space-y-2 text-sm text-muted-foreground mb-6'>
                  <li className='flex items-center gap-2'>
                    <ArrowRight className='h-4 w-4' />
                    Real-time subscription support
                  </li>
                  <li className='flex items-center gap-2'>
                    <ArrowRight className='h-4 w-4' />
                    Custom headers configuration
                  </li>
                  <li className='flex items-center gap-2'>
                    <ArrowRight className='h-4 w-4' />
                    Connection validation
                  </li>
                </ul>
                <Link href='/graphql'>
                  <Button size='lg' className='w-full'>
                    Open GraphQL Subscriptions
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className='border-2 border-teal-200/50 shadow-lg bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-teal-800/30 hover:shadow-xl transition-shadow'>
              <CardHeader>
                <div className='flex items-center gap-3 mb-2'>
                  <div className='h-12 w-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md'>
                    <Activity className='h-6 w-6 text-white' />
                  </div>
                  <CardTitle className='text-2xl'>Kafka Listener</CardTitle>
                </div>
                <CardDescription className='text-base'>Connect to Kafka brokers and monitor messages with flow visualization</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className='space-y-2 text-sm text-muted-foreground mb-6'>
                  <li className='flex items-center gap-2'>
                    <ArrowRight className='h-4 w-4' />
                    Multi-topic message consumption
                  </li>
                  <li className='flex items-center gap-2'>
                    <ArrowRight className='h-4 w-4' />
                    Flow-based message grouping
                  </li>
                  <li className='flex items-center gap-2'>
                    <ArrowRight className='h-4 w-4' />
                    Send and resend messages
                  </li>
                </ul>
                <Link href='/kafka'>
                  <Button size='lg' className='w-full' variant='default'>
                    Open Kafka Listener
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className='border-2 border-purple-200/50 shadow-lg bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-purple-800/30 hover:shadow-xl transition-shadow'>
              <CardHeader>
                <div className='flex items-center gap-3 mb-2'>
                  <div className='h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md'>
                    <FileText className='h-6 w-6 text-white' />
                  </div>
                  <CardTitle className='text-2xl'>Splunk JSON Viewer</CardTitle>
                </div>
                <CardDescription className='text-base'>Upload and analyze Splunk JSON log files with flow visualization</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className='space-y-2 text-sm text-muted-foreground mb-6'>
                  <li className='flex items-center gap-2'>
                    <ArrowRight className='h-4 w-4' />
                    File upload and parsing
                  </li>
                  <li className='flex items-center gap-2'>
                    <ArrowRight className='h-4 w-4' />
                    Flow-based message grouping
                  </li>
                  <li className='flex items-center gap-2'>
                    <ArrowRight className='h-4 w-4' />
                    Search and filter capabilities
                  </li>
                </ul>
                <Link href='/json-viewer'>
                  <Button size='lg' className='w-full' variant='default'>
                    Open Splunk JSON Viewer
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
