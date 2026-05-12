'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { convertToRestClient } from '@/lib/utils/curl-converter';
import { ArrowLeft, Code, Copy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function CurlConverterPage() {
  const [curlInput, setCurlInput] = useState<string>('');
  const [restClientOutput, setRestClientOutput] = useState<string>('');

  useEffect(() => {
    if (curlInput.trim()) {
      const converted = convertToRestClient(curlInput);
      setRestClientOutput(converted);
    } else {
      setRestClientOutput('');
    }
  }, [curlInput]);

  const handleCopy = () => {
    if (restClientOutput) {
      navigator.clipboard.writeText(restClientOutput);
      toast.success('REST Client code copied to clipboard!');
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative selection:bg-emerald-200 dark:selection:bg-emerald-900 animate-in fade-in duration-300">
      {/* Background decoration matching home page */}
      <div className="absolute inset-0 z-0 h-full w-full bg-slate-50 dark:bg-slate-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-400 dark:bg-emerald-600 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 h-full w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col">
        <div className="mb-4 sm:mb-6 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Code className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  cURL to REST Client Converter
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Convert bash curl commands to REST Client extension format
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 h-full">
            <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl h-full flex flex-col min-h-0 transition-all duration-500">
              <CardHeader className="pb-4 flex-shrink-0 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40">
                <CardTitle className="text-xl sm:text-2xl text-slate-900 dark:text-white font-bold">
                  cURL Command
                </CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Paste your bash curl request here
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col pt-4">
                <Textarea
                  value={curlInput}
                  onChange={(e) => setCurlInput(e.target.value)}
                  placeholder={`curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{"name":"John"}'`}
                  className="flex-1 min-h-[300px] font-mono text-xs resize-none bg-white/50 dark:bg-slate-950/50 border-slate-200/60 dark:border-slate-800/60 focus-visible:ring-emerald-500/50 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl h-full flex flex-col min-h-0 transition-all duration-500">
              <CardHeader className="pb-4 flex-shrink-0 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl text-slate-900 dark:text-white font-bold">
                      REST Client Format
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Generated REST Client extension code
                    </CardDescription>
                  </div>
                  {restClientOutput && (
                    <Button
                      onClick={handleCopy}
                      size="sm"
                      variant="outline"
                      className="gap-2 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col pt-4">
                <Textarea
                  value={restClientOutput}
                  readOnly
                  placeholder="REST Client format will appear here..."
                  className="flex-1 min-h-[300px] font-mono text-xs resize-none bg-white/50 dark:bg-slate-950/50 border-slate-200/60 dark:border-slate-800/60 focus-visible:ring-emerald-500/50 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
