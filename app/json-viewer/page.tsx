'use client';

import { MessageFlowGraph } from '@/components/MessageFlowGraph';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ArrowLeft, FileText, Search, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

interface JsonLogEntry {
  preview: boolean;
  result: {
    '@timestamp'?: string;
    '_raw'?: string;
    'structured'?: {
      message?: string;
      level?: string;
      logger_name?: string;
      flowId?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

interface ParsedMessage {
  id: string;
  flowId: string;
  timestamp: Date;
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string;
  flowIdSource?: string;
  containerName?: string;
  level?: string;
  structuredMessage?: string;
}

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

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;

        if (!text || text.trim().length === 0) {
          setError('File is empty');
          setJsonData([]);
          return;
        }

        let parsedEntries: JsonLogEntry[] = [];
        let parseError: string | null = null;

        // First, try to parse as a single JSON object/array
        try {
          const parsed = JSON.parse(text);

          if (Array.isArray(parsed)) {
            parsedEntries = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            parsedEntries = [parsed];
          } else {
            parseError = 'Invalid JSON format. Expected an array or object.';
          }
        } catch (singleJsonError) {
          // If single JSON parsing fails, try NDJSON (newline-delimited JSON)
          const lines = text.split('\n');
          const lineParseErrors: string[] = [];
          let accumulatedJson = '';
          let braceCount = 0;
          let bracketCount = 0;
          let inString = false;
          let escapeNext = false;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            accumulatedJson += (accumulatedJson ? '\n' : '') + line;

            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              if (char === '\\') {
                escapeNext = true;
                continue;
              }
              if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
              }
              if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;
              }
            }

            if (braceCount === 0 && bracketCount === 0 && accumulatedJson.trim()) {
              try {
                const parsed = JSON.parse(accumulatedJson.trim());

                if (Array.isArray(parsed)) {
                  parsedEntries.push(...parsed);
                } else if (typeof parsed === 'object' && parsed !== null) {
                  parsedEntries.push(parsed);
                } else {
                  lineParseErrors.push(`Line ${i + 1}: Invalid JSON format`);
                }
              } catch (lineError) {
                lineParseErrors.push(`Line ${i + 1}: ${lineError instanceof Error ? lineError.message : 'Parse error'}`);
              }
              accumulatedJson = '';
              braceCount = 0;
              bracketCount = 0;
            }
          }

          if (accumulatedJson.trim() && braceCount === 0 && bracketCount === 0) {
            try {
              const parsed = JSON.parse(accumulatedJson.trim());
              if (Array.isArray(parsed)) {
                parsedEntries.push(...parsed);
              } else if (typeof parsed === 'object' && parsed !== null) {
                parsedEntries.push(parsed);
              }
            } catch {
              if (accumulatedJson.trim()) {
                lineParseErrors.push(`Final entry: Parse error`);
              }
            }
          }

          if (parsedEntries.length === 0) {
            const singleError = singleJsonError instanceof Error ? singleJsonError.message : 'Unknown error';
            setError(`Failed to parse any JSON entries. The file might be a single multi-line JSON object. Original error: ${singleError}`);
            setJsonData([]);
            return;
          } else if (lineParseErrors.length > 0) {
            parseError = `Parsed ${parsedEntries.length} entries with ${lineParseErrors.length} error(s). First error: ${lineParseErrors[0]}`;
          }
        }

        if (parsedEntries.length > 0) {
          setJsonData(parsedEntries);
          if (parseError) {
            setError(parseError);
          } else {
            setError('');
          }
        } else {
          setError(parseError || 'No valid JSON entries found');
          setJsonData([]);
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
    const fileInput = document.getElementById('json-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const convertToKafkaMessages = (entries: JsonLogEntry[]): ParsedMessage[] => {
    return entries
      .map((entry, index) => {
        const result = entry.result || {};
        const structured = (result['structured'] || result.structured || {}) as Record<string, unknown>;
        const rawValue = result['_raw'] || result._raw || JSON.stringify(result);
        // Extract _raw - only use the _raw key, must be a string
        const rawMessage = (result['_raw'] || result._raw) && typeof (result['_raw'] || result._raw) === 'string' ? String(result['_raw'] || result._raw) : undefined;

        let flowId = 'unknown';
        let commandName: string | undefined;
        let success: boolean | undefined;
        let errorMessage: string | undefined;

        const extractFlowId = (obj: Record<string, unknown>): string | null => {
          if (obj.flowId) {
            return String(obj.flowId);
          }
          if (obj.resource && typeof obj.resource === 'object') {
            const resource = obj.resource as Record<string, unknown>;
            if (resource.flowId) {
              return String(resource.flowId);
            }
          }
          if (obj.message && typeof obj.message === 'string') {
            const flowIdMatch = obj.message.match(/Flow ID:?\s*([a-f0-9-]{36})/i) || obj.message.match(/flowId[=:]\s*([a-f0-9-]{36})/i);
            if (flowIdMatch) {
              return flowIdMatch[1];
            }
            try {
              const messageParsed = JSON.parse(obj.message);
              if (messageParsed.resource && messageParsed.resource.flowId) {
                return String(messageParsed.resource.flowId);
              }
              if (messageParsed.flowId) {
                return String(messageParsed.flowId);
              }
            } catch {
              // Not a JSON string, ignore
            }
          }
          return null;
        };

        if (structured.flowId) {
          flowId = String(structured.flowId);
        } else {
          const extracted = extractFlowId(structured);
          if (extracted) {
            flowId = extracted;
          } else if (typeof rawValue === 'string') {
            try {
              const parsed = JSON.parse(rawValue);
              const extractedFromRaw = extractFlowId(parsed);
              if (extractedFromRaw) {
                flowId = extractedFromRaw;
              }
            } catch {
              // Not valid JSON, try extracting from message text
              if (structured.message && typeof structured.message === 'string') {
                const flowIdMatch = structured.message.match(/Flow ID:?\s*([a-f0-9-]{36})/i) || structured.message.match(/flowId[=:]\s*([a-f0-9-]{36})/i);
                if (flowIdMatch) {
                  flowId = flowIdMatch[1];
                }
              }
            }
          }
        }

        if (typeof rawValue === 'string') {
          try {
            const parsed = JSON.parse(rawValue);
            const resource = parsed.resource || {};

            if (resource.commandId) {
              const commandId = String(resource.commandId);
              commandName = commandId.includes(':') ? commandId.split(':')[0] : commandId;
            } else if (resource.type) {
              commandName = String(resource.type);
            }

            if (resource.success !== undefined) {
              success = Boolean(resource.success);
            }

            if (resource.payload) {
              const payload = resource.payload as Record<string, unknown>;
              if (payload.errorMessage) {
                errorMessage = String(payload.errorMessage);
              } else if (payload.error) {
                errorMessage = String(payload.error);
              }
            }
          } catch {
            // Not valid JSON, try parsing structured.message if it's a JSON string
            if (structured.message && typeof structured.message === 'string') {
              try {
                const messageParsed = JSON.parse(structured.message);
                const resource = messageParsed.resource || {};

                if (resource.commandId) {
                  const commandId = String(resource.commandId);
                  commandName = commandId.includes(':') ? commandId.split(':')[0] : commandId;
                } else if (resource.type) {
                  commandName = String(resource.type);
                }

                if (resource.success !== undefined) {
                  success = Boolean(resource.success);
                }

                if (resource.payload) {
                  const payload = resource.payload as Record<string, unknown>;
                  if (payload.errorMessage) {
                    errorMessage = String(payload.errorMessage);
                  } else if (payload.error) {
                    errorMessage = String(payload.error);
                  }
                }
              } catch {
                // Not a JSON string, ignore
              }
            }
          }
        }

        const timestamp = result['@timestamp'] ? new Date(result['@timestamp']) : new Date();

        // Extract kubernetes.container_name
        const containerName = result['kubernetes.container_name'] ? String(result['kubernetes.container_name']) : undefined;

        // Extract structured.level
        const level = result['structured.level'] ? String(result['structured.level']) : structured.level ? String(structured.level) : undefined;

        // Extract structured.message
        const structuredMessage = result['structured.message'] ? String(result['structured.message']) : structured.message ? String(structured.message) : undefined;

        let value = rawValue;
        if (typeof rawValue === 'string') {
          try {
            const parsed = JSON.parse(rawValue);
            value = JSON.stringify(parsed, null, 2);
          } catch {
            value = rawValue;
          }
        }

        return {
          id: `json-${index}`,
          flowId: `${flowId}-${index}`, // Make each message unique to prevent grouping
          timestamp,
          topic: 'splunk-json',
          partition: 0,
          offset: String(index),
          key: commandName || null,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          flowIdSource: 'splunk',
          containerName,
          level,
          rawMessage: typeof rawMessage === 'string' ? rawMessage : undefined,
          structuredMessage,
        };
      })
      .filter((msg) => {
        // Skip items with level "unknown"
        if (msg.level && msg.level.toLowerCase() === 'unknown') {
          return false;
        }
        return true;
      });
  };

  const kafkaMessages = useMemo(() => convertToKafkaMessages(jsonData), [jsonData]);

  // Get unique container names and levels for filter options
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

  // Filter messages based on search query and filter type
  const filteredMessages = useMemo(() => {
    let filtered = kafkaMessages;

    // Skip items with level "unknown" (double-check filter)
    filtered = filtered.filter((msg) => {
      if (msg.level && msg.level.toLowerCase() === 'unknown') {
        return false;
      }
      return true;
    });

    // Apply filter by container name or level
    if (filterType !== 'none' && filterValue) {
      if (filterType === 'container') {
        filtered = filtered.filter((msg) => msg.containerName === filterValue);
      } else if (filterType === 'level') {
        filtered = filtered.filter((msg) => msg.level?.toLowerCase() === filterValue.toLowerCase());
      }
    }

    // Apply search query (search in message content/value)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((msg) => {
        const value = msg.value.toLowerCase();
        const containerName = msg.containerName?.toLowerCase() || '';
        const level = msg.level?.toLowerCase() || '';
        return value.includes(query) || containerName.includes(query) || level.includes(query);
      });
    }

    return filtered;
  }, [kafkaMessages, searchQuery, filterType, filterValue]);

  return (
    <div className='h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 animate-in fade-in duration-300'>
      <div className='h-full max-w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col'>
        <div className='mb-4 sm:mb-6 flex-shrink-0'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2'>
            <div className='flex items-start gap-2 sm:gap-3'>
              <div className='h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0'>
                <FileText className='h-4 w-4 sm:h-6 sm:w-6 text-white' />
              </div>
              <div>
                <h1 className='text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight'>Splunk JSON Viewer</h1>
                <p className='text-sm sm:text-base text-muted-foreground mt-1'>Upload and analyze Splunk JSON log files</p>
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
            {/* File Upload - Left Side */}
            <div className='w-full lg:w-[300px] lg:flex-shrink-0 self-start'>
              <Card className='border-2 border-purple-200/50 shadow-lg bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-purple-800/30 h-full flex flex-col'>
                <CardHeader className='flex-shrink-0'>
                  <CardTitle className='text-xl sm:text-2xl'>File Upload</CardTitle>
                  <CardDescription>Select a Splunk JSON file to analyze</CardDescription>
                </CardHeader>
                <CardContent className='flex-1 overflow-hidden min-h-0 flex flex-col gap-4'>
                  <div className='flex flex-col gap-3'>
                    <div className='relative'>
                      <Input id='json-file-input' type='file' accept='.json' onChange={handleFileSelect} className='hidden' />
                      <label htmlFor='json-file-input'>
                        <Button type='button' variant='outline' className='w-full border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20 cursor-pointer' asChild>
                          <span>
                            <Upload className='mr-2 h-4 w-4' />
                            Select JSON File
                          </span>
                        </Button>
                      </label>
                    </div>

                    {fileName && (
                      <div className='flex items-center justify-between gap-2 p-2 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800'>
                        <div className='flex items-center gap-2 min-w-0 flex-1'>
                          <FileText className='h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0' />
                          <span className='text-sm truncate'>{fileName}</span>
                        </div>
                        <Button variant='ghost' size='icon' className='h-6 w-6 flex-shrink-0' onClick={handleClear}>
                          <X className='h-4 w-4' />
                        </Button>
                      </div>
                    )}

                    {error && (
                      <div className='p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md'>
                        <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
                      </div>
                    )}

                    {jsonData.length > 0 && (
                      <div className='flex items-center gap-2'>
                        <Badge variant='secondary' className='bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'>
                          {jsonData.length} entr{jsonData.length !== 1 ? 'ies' : 'y'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Message Flow Visualization - Right Side */}
            <div className='w-full lg:flex-1 overflow-hidden h-full'>
              <Card className='border-2 border-purple-200/50 shadow-lg bg-gradient-to-br from-white to-purple-50/20 dark:from-slate-900 dark:to-slate-800 dark:border-purple-800/30 h-full flex flex-col min-h-0'>
                <CardHeader className='pb-4 flex-shrink-0'>
                  <div className='flex flex-col gap-4'>
                    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
                      <div>
                        <CardTitle className='text-xl sm:text-2xl'>Message Flow Visualization</CardTitle>
                        <CardDescription className='mt-1 text-xs sm:text-sm'>Messages grouped by flowId and displayed in a graph format</CardDescription>
                      </div>
                      {kafkaMessages.length > 0 && (
                        <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                          <Badge variant='secondary' className='text-xs sm:text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'>
                            {kafkaMessages.length} entr{kafkaMessages.length !== 1 ? 'ies' : 'y'}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {kafkaMessages.length > 0 && (
                      <div className='flex flex-col sm:flex-row gap-3'>
                        <div className='relative flex-1'>
                          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                          <Input placeholder='Search messages...' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className='pl-9 h-10' />
                        </div>
                        <div className='flex gap-2'>
                          <Select
                            value={filterType}
                            onValueChange={(value) => {
                              setFilterType(value as 'container' | 'level' | 'none');
                              setFilterValue('');
                            }}
                          >
                            <SelectTrigger className='w-[140px] h-10 border-slate-200/50 dark:border-slate-700/50 bg-transparent rounded-lg'>
                              <SelectValue placeholder='Filter by...' />
                            </SelectTrigger>
                            <SelectContent className='border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg'>
                              <SelectItem value='none' className='rounded-md'>
                                No Filter
                              </SelectItem>
                              <SelectItem value='container' className='rounded-md'>
                                Container
                              </SelectItem>
                              <SelectItem value='level' className='rounded-md'>
                                Level
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {filterType !== 'none' && (
                            <Select value={filterValue} onValueChange={setFilterValue}>
                              <SelectTrigger className='w-[180px] h-10 border-slate-200/50 dark:border-slate-700/50 bg-transparent rounded-lg'>
                                <SelectValue placeholder={`Select ${filterType}...`} />
                              </SelectTrigger>
                              <SelectContent className='border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg'>
                                {filterType === 'container' &&
                                  uniqueContainers.map((container) => (
                                    <SelectItem key={container} value={container} className='rounded-md'>
                                      {container}
                                    </SelectItem>
                                  ))}
                                {filterType === 'level' &&
                                  uniqueLevels.map((level) => (
                                    <SelectItem key={level} value={level} className='rounded-md'>
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
                <CardContent className='flex-1 overflow-hidden min-h-0 flex flex-col'>
                  <div className='flex-1 min-h-0'>
                    {kafkaMessages.length > 0 ? (
                      <MessageFlowGraph messages={filteredMessages} />
                    ) : (
                      <div className='h-full flex items-center justify-center text-muted-foreground'>
                        <p className='text-sm'>Upload a JSON file to visualize message flows</p>
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
