import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ParsedMessage } from '@/lib/types/json-viewer';
import { formatMessageContent, parseMessage } from '@/lib/utils/message-parser';
import { highlightKeywords } from '@/lib/utils/text-highlight';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Hash,
  Info,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface JsonMessageFlowGraphProps {
  messages: ParsedMessage[];
}

export function JsonMessageFlowGraph({ messages }: JsonMessageFlowGraphProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [expandedRawMessages, setExpandedRawMessages] = useState<Set<string>>(new Set());
  const [expandedFullMessages, setExpandedFullMessages] = useState<Set<string>>(new Set());
  const [sortAscending, setSortAscending] = useState(false);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const timeA = a.timestamp.getTime();
      const timeB = b.timestamp.getTime();
      return sortAscending ? timeA - timeB : timeB - timeA;
    });
  }, [messages, sortAscending]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4">
          <Hash className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <p className="text-muted-foreground font-medium">No messages received yet</p>
        <p className="text-sm text-muted-foreground mt-1">Upload a JSON file to visualize message flows</p>
      </div>
    );
  }

  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const toggleRawMessageExpanded = (messageId: string) => {
    setExpandedRawMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const toggleFullMessageExpanded = (messageId: string) => {
    setExpandedFullMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {messages.length > 0 && (
        <div className="flex-shrink-0 mb-3 flex items-center justify-end gap-2 px-2">
          <Button variant="outline" size="sm" onClick={() => setSortAscending(!sortAscending)} className="h-8 text-xs">
            {sortAscending ? (
              <>
                <ArrowUp className="h-3 w-3 mr-1" />
                Oldest First
              </>
            ) : (
              <>
                <ArrowDown className="h-3 w-3 mr-1" />
                Newest First
              </>
            )}
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 sm:space-y-4">
        {sortedMessages.map((msg, idx) => {
          const parsed = parseMessage(msg.value);
          const isExpanded = expandedMessages.has(msg.id);

          return (
            <div key={msg.id} className="relative">
              {idx < sortedMessages.length - 1 && (
                <div className="absolute left-3 top-12 w-0.5 h-8 bg-gradient-to-b from-purple-400 to-pink-400 opacity-40" />
              )}
              <Card className="ml-2 sm:ml-6 border border-slate-200/70 dark:border-slate-700/50 border-l-4 border-l-purple-500/60 hover:border-l-purple-600 dark:border-l-purple-400/60 dark:hover:border-l-purple-400 transition-colors shadow-sm hover:shadow-md bg-gradient-to-r from-white to-purple-50/10 dark:from-slate-800 dark:to-purple-950/20">
                <CardContent className="p-3 sm:p-5">
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-sm" />
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300/60 dark:border-slate-600/60"
                          >
                            #{sortedMessages.length - idx}
                          </Badge>
                        </div>
                        {msg.containerName && (
                          <Badge
                            variant="outline"
                            className="text-xs font-medium border-indigo-300/60 text-indigo-700 dark:border-indigo-700/60 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/20"
                          >
                            {msg.containerName}
                          </Badge>
                        )}
                        {msg.level && (
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold ${
                              msg.level.toUpperCase() === 'ERROR'
                                ? 'border-red-400/80 text-red-800 dark:border-red-500/80 dark:text-red-300 bg-red-100 dark:bg-red-950/40 shadow-sm'
                                : msg.level.toUpperCase() === 'WARN' || msg.level.toUpperCase() === 'WARNING'
                                  ? 'border-yellow-400/80 text-yellow-800 dark:border-yellow-500/80 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-950/40'
                                  : msg.level.toUpperCase() === 'INFO'
                                    ? 'border-blue-400/80 text-blue-800 dark:border-blue-500/80 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/40'
                                    : 'border-slate-300/60 text-slate-700 dark:border-slate-700/60 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/20'
                            }`}
                          >
                            {msg.level.toUpperCase() === 'ERROR' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {msg.level.toLowerCase()}
                          </Badge>
                        )}
                        {parsed.commandName && (
                          <Badge
                            variant="outline"
                            className="text-xs font-medium border-blue-300/60 text-blue-700 dark:border-blue-700/60 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/20"
                          >
                            Command: {parsed.commandName}
                          </Badge>
                        )}
                        {parsed.success !== undefined && (
                          <div className="flex items-center gap-1">
                            {parsed.success ? (
                              <Badge
                                variant="outline"
                                className="text-xs border-green-300/60 text-green-700 dark:border-green-700/60 dark:text-green-300 bg-green-50 dark:bg-green-950/20"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Success
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs border-red-300/60 text-red-700 dark:border-red-700/60 dark:text-red-300 bg-red-50 dark:bg-red-950/20"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{msg.timestamp.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {parsed.errorMessage && (
                      <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/40 rounded-md">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Error Message</div>
                          <div className="text-xs text-red-600 dark:text-red-400 break-words">
                            {parsed.errorMessage}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.structuredMessage && (
                    <div className="mt-3 p-3 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/40 rounded-md">
                      <div className="text-[10px] font-medium text-muted-foreground mb-2">Message</div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap">
                        {highlightKeywords(msg.structuredMessage)}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => toggleMessageExpanded(msg.id)}
                    className="mt-3 w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-slate-200/60 dark:border-slate-700/40 rounded-md bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-700/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </div>
                    <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}
                  >
                    {isExpanded && (
                      <div className="space-y-3 pt-3 border-slate-200/60 dark:border-slate-700/40">
                        {msg.rawMessage && (
                          <div>
                            <button
                              onClick={() => toggleRawMessageExpanded(msg.id)}
                              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-slate-200/60 dark:border-slate-700/40"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" />
                                <span>Raw Message</span>
                              </div>
                              <span
                                className={`transition-transform duration-200 ${expandedRawMessages.has(msg.id) ? 'rotate-90' : 'rotate-0'}`}
                              >
                                <ChevronRight className="h-3 w-3" />
                              </span>
                            </button>
                            <div
                              className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedRawMessages.has(msg.id) ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}
                            >
                              {expandedRawMessages.has(msg.id) && (
                                <div className="font-mono text-xs min-h-[150px] max-h-[250px] rounded-md border border-purple-200/60 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-950/20 p-3 overflow-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                                  {formatMessageContent(msg.rawMessage)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div>
                          <button
                            onClick={() => toggleFullMessageExpanded(msg.id)}
                            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-slate-200/60 dark:border-slate-700/40"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5" />
                              <span>Full Message Content</span>
                            </div>
                            <span
                              className={`transition-transform duration-200 ${expandedFullMessages.has(msg.id) ? 'rotate-90' : 'rotate-0'}`}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </span>
                          </button>
                          <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedFullMessages.has(msg.id) ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}
                          >
                            {expandedFullMessages.has(msg.id) && (
                              <div className="font-mono text-xs min-h-[150px] max-h-[250px] rounded-md border border-purple-200/60 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-950/20 p-3 overflow-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                                {formatMessageContent(msg.value)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
