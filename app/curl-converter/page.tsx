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
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 animate-in fade-in duration-300">
      <div className="h-full max-w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col">
        <div className="mb-4 sm:mb-6 flex-shrink-0">
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
            <Card className="border-2 border-green-200/50 shadow-lg bg-gradient-to-br from-white to-green-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-green-800/30 h-full flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-xl sm:text-2xl">cURL Command</CardTitle>
                <CardDescription>Paste your bash curl request here</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col">
                <Textarea
                  value={curlInput}
                  onChange={(e) => setCurlInput(e.target.value)}
                  placeholder={`curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{"name":"John"}'`}
                  className="flex-1 min-h-[300px] font-mono text-xs resize-none"
                />
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200/50 shadow-lg bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-emerald-800/30 h-full flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl">REST Client Format</CardTitle>
                    <CardDescription>Generated REST Client extension code</CardDescription>
                  </div>
                  {restClientOutput && (
                    <Button onClick={handleCopy} size="sm" variant="outline" className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col">
                <Textarea
                  value={restClientOutput}
                  readOnly
                  placeholder="REST Client format will appear here..."
                  className="flex-1 min-h-[300px] font-mono text-xs resize-none bg-slate-50 dark:bg-slate-900/50"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
