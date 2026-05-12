'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Activity, ArrowRight, Code, Database, FileText, Blocks } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative selection:bg-blue-200 dark:selection:bg-blue-900 overflow-x-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 h-full w-full bg-slate-50 dark:bg-slate-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 dark:bg-blue-600 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 lg:py-24 flex flex-col min-h-[100dvh]">
        {/* Header / Hero */}
        <div className="flex flex-col items-center text-center space-y-6 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-xl ring-4 ring-blue-500/20 mb-4 transition-transform hover:scale-105 duration-300">
            <Blocks className="h-8 w-8 md:h-10 md:w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Monitoring Tools
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Your centralized hub for real-time message monitoring, queue analysis, and API interaction tools designed
            for modern architectures.
          </p>
        </div>

        {/* Navigation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* REST API Client */}
          <Link
            href="/rest-client"
            className="group relative overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl hover:shadow-2xl hover:shadow-green-500/10 hover:border-green-500/30 transition-all duration-500 flex flex-col hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-green-100/80 dark:bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ring-1 ring-inset ring-green-500/20">
                <Code className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                REST API Client
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed flex-1">
                Hoppscotch-style tool to construct, send, and test HTTP APIs with ease.
              </p>
              <div className="space-y-3 mb-8">
                {['All HTTP Methods', 'Headers & Params', 'Response tracking'].map((item) => (
                  <div key={item} className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500/50 mr-3"></div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 flex items-center text-sm font-bold text-green-600 dark:text-green-400 border-t border-slate-200/50 dark:border-slate-800/50 group-hover:border-green-500/20 transition-colors">
                Launch Client <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* GraphQL Tool */}
          <Link
            href="/graphql"
            className="group relative overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-500 flex flex-col hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-blue-100/80 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ring-1 ring-inset ring-blue-500/20">
                <Database className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                GraphQL Subscriptions
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed flex-1">
                Connect to GraphQL endpoints and subscribe to real-time data streams instantly.
              </p>
              <div className="space-y-3 mb-8">
                {['Real-time subscriptions', 'Custom headers', 'Connection validation'].map((item) => (
                  <div key={item} className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500/50 mr-3"></div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 flex items-center text-sm font-bold text-blue-600 dark:text-blue-400 border-t border-slate-200/50 dark:border-slate-800/50 group-hover:border-blue-500/20 transition-colors">
                Open Studio <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Kafka Tool */}
          <Link
            href="/kafka"
            className="group relative overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl hover:shadow-2xl hover:shadow-teal-500/10 hover:border-teal-500/30 transition-all duration-500 flex flex-col hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-teal-100/80 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 ring-1 ring-inset ring-teal-500/20">
                <Activity className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                Kafka Listener
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed flex-1">
                Connect to Kafka brokers, view real-time events, and monitor message flows.
              </p>
              <div className="space-y-3 mb-8">
                {['Multi-topic consumption', 'Flow-based groups', 'Re-trigger messages'].map((item) => (
                  <div key={item} className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-teal-500/50 mr-3"></div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 flex items-center text-sm font-bold text-teal-600 dark:text-teal-400 border-t border-slate-200/50 dark:border-slate-800/50 group-hover:border-teal-500/20 transition-colors">
                Start Listening <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Splunk Viewer */}
          <Link
            href="/json-viewer"
            className="group relative overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-500/30 transition-all duration-500 flex flex-col hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-purple-100/80 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ring-1 ring-inset ring-purple-500/20">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Splunk JSON Viewer
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed flex-1">
                Upload, analyze, and visualize complex Splunk JSON log exports natively.
              </p>
              <div className="space-y-3 mb-8">
                {['Advanced log parsing', 'Flow visualization', 'Text search and filters'].map((item) => (
                  <div key={item} className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500/50 mr-3"></div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 flex items-center text-sm font-bold text-purple-600 dark:text-purple-400 border-t border-slate-200/50 dark:border-slate-800/50 group-hover:border-purple-500/20 transition-colors">
                View Logs <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* cURL Converter */}
          <Link
            href="/curl-converter"
            className="group relative overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/30 transition-all duration-500 flex flex-col hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-orange-100/80 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 ring-1 ring-inset ring-orange-500/20">
                <Code className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                cURL Converter
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed flex-1">
                Convert raw bash curl commands into clean REST Client formats instantly.
              </p>
              <div className="space-y-3 mb-8">
                {['Quick code parsing', 'Generates .http format', '1-click copy support'].map((item) => (
                  <div key={item} className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500/50 mr-3"></div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 flex items-center text-sm font-bold text-orange-600 dark:text-orange-400 border-t border-slate-200/50 dark:border-slate-800/50 group-hover:border-orange-500/20 transition-colors">
                Open Converter <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-16 pb-8 text-center text-sm text-slate-500 dark:text-slate-400 animate-in fade-in duration-1000">
          <p>Monitoring Tools &copy; {new Date().getFullYear()} &middot; Built for real-time observability</p>
        </div>
      </div>
    </div>
  );
}
