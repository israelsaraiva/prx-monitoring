'use client';

import { JsonMessageFlowGraph } from '@/components/JsonMessageFlowGraph';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { JsonLogEntry } from '@/lib/types/json-viewer';
import { parseJsonFile } from '@/lib/utils/json-parser';
import { clearLocalStorage, loadFromLocalStorage, saveToLocalStorage } from '@/lib/utils/local-storage';
import { convertToKafkaMessages } from '@/lib/utils/message-extractor';
import { filterBySearchQuery, filterByType, filterByUnknownLevel } from '@/lib/utils/message-filters';
import { ArrowLeft, FileText, Search, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export default function JsonViewerPage() {
  const [jsonData, setJsonData] = useState<JsonLogEntry[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'container' | 'level' | 'none'>('none');
  const [filterValue, setFilterValue] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setFileName(file.name);
    setSearchQuery('');
    setFilterType('none');
    setFilterValue('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { entries, error: parseError } = parseJsonFile(text);

        if (entries.length > 0) {
          setJsonData(entries);
          setError(parseError || '');
          saveToLocalStorage(entries, file.name);
        } else {
          setError(parseError || 'No valid JSON entries found');
          setJsonData([]);
          clearLocalStorage();
        }
      } catch (err) {
        setError(`Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setJsonData([]);
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
      setJsonData([]);
    };

    reader.readAsText(file);
  };

  const handleClear = () => {
    setJsonData([]);
    setFileName('');
    setError('');
    setSearchQuery('');
    setFilterType('none');
    setFilterValue('');
    clearLocalStorage();
    const fileInput = document.getElementById('json-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  useEffect(() => {
    const stored = loadFromLocalStorage();
    if (stored) {
      setJsonData(stored.data);
      setFileName(stored.fileName);
    }
  }, []);

  const kafkaMessages = useMemo(() => convertToKafkaMessages(jsonData), [jsonData]);

  const uniqueContainers = useMemo(() => {
    const containers = new Set<string>();
    kafkaMessages.forEach((msg) => {
      if (msg.containerName) {
        containers.add(msg.containerName);
      }
    });
    return Array.from(containers).sort();
  }, [kafkaMessages]);

  const uniqueLevels = useMemo(() => {
    const levels = new Set<string>();
    kafkaMessages.forEach((msg) => {
      if (msg.level) {
        levels.add(msg.level.toLowerCase());
      }
    });
    return Array.from(levels).sort();
  }, [kafkaMessages]);

  const filteredMessages = useMemo(() => {
    let filtered = filterByUnknownLevel(kafkaMessages);
    filtered = filterByType(filtered, filterType, filterValue);
    filtered = filterBySearchQuery(filtered, searchQuery);
    return filtered;
  }, [kafkaMessages, searchQuery, filterType, filterValue]);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 animate-in fade-in duration-300">
      <div className="h-full max-w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col">
        <div className="mb-4 sm:mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Splunk JSON Viewer</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Upload and analyze Splunk JSON log files
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
            <div className="w-full lg:w-[300px] lg:flex-shrink-0 self-start">
              <Card className="border-2 border-purple-200/50 shadow-lg bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-purple-800/30 h-full flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-xl sm:text-2xl">File Upload</CardTitle>
                  <CardDescription>Select a Splunk JSON file to analyze</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <Input
                        id="json-file-input"
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <label htmlFor="json-file-input">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20 cursor-pointer"
                          asChild
                        >
                          <span>
                            <Upload className="mr-2 h-4 w-4" />
                            Select JSON File
                          </span>
                        </Button>
                      </label>
                    </div>

                    {fileName && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          <span className="text-sm truncate">{fileName}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleClear}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {error && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      </div>
                    )}

                    {jsonData.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        >
                          {jsonData.length} entr{jsonData.length !== 1 ? 'ies' : 'y'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="w-full lg:flex-1 overflow-hidden h-full">
              <Card className="border-2 border-purple-200/50 shadow-lg bg-gradient-to-br from-white to-purple-50/20 dark:from-slate-900 dark:to-slate-800 dark:border-purple-800/30 h-full flex flex-col min-h-0">
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl sm:text-2xl">Message Flow Visualization</CardTitle>
                        <CardDescription className="mt-1 text-xs sm:text-sm">
                          Messages grouped by flowId and displayed in a graph format
                        </CardDescription>
                      </div>
                      {kafkaMessages.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <Badge
                            variant="secondary"
                            className="text-xs sm:text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          >
                            {kafkaMessages.length} entr{kafkaMessages.length !== 1 ? 'ies' : 'y'}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {kafkaMessages.length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Select
                            value={filterType}
                            onValueChange={(value) => {
                              setFilterType(value as 'container' | 'level' | 'none');
                              setFilterValue('');
                            }}
                          >
                            <SelectTrigger className="w-[140px] h-10 border-slate-200/50 dark:border-slate-700/50 bg-transparent rounded-lg">
                              <SelectValue placeholder="Filter by..." />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg">
                              <SelectItem value="none" className="rounded-md">
                                No Filter
                              </SelectItem>
                              <SelectItem value="container" className="rounded-md">
                                Container
                              </SelectItem>
                              <SelectItem value="level" className="rounded-md">
                                Level
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {filterType !== 'none' && (
                            <Select value={filterValue} onValueChange={setFilterValue}>
                              <SelectTrigger className="w-[180px] h-10 border-slate-200/50 dark:border-slate-700/50 bg-transparent rounded-lg">
                                <SelectValue placeholder={`Select ${filterType}...`} />
                              </SelectTrigger>
                              <SelectContent className="border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg">
                                {filterType === 'container' &&
                                  uniqueContainers.map((container) => (
                                    <SelectItem key={container} value={container} className="rounded-md">
                                      {container}
                                    </SelectItem>
                                  ))}
                                {filterType === 'level' &&
                                  uniqueLevels.map((level) => (
                                    <SelectItem key={level} value={level} className="rounded-md">
                                      {level}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0">
                    {kafkaMessages.length > 0 ? (
                      <JsonMessageFlowGraph messages={filteredMessages} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p className="text-sm">Upload a JSON file to visualize message flows</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
