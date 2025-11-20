import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowDown, CheckCircle2, ChevronRight, Clock, FileText, Hash, Repeat, Send, Server, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

interface KafkaMessage {
  id: string;
  flowId: string;
  timestamp: Date;
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string;
  flowIdSource?: string;
}

interface MessageFlowGraphProps {
  messages: KafkaMessage[];
}

interface FlowGroup {
  flowId: string;
  messages: KafkaMessage[];
  firstMessage: Date;
  lastMessage: Date;
}

interface ParsedMessage {
  commandName?: string;
  sourceMicroservice?: string;
  success?: boolean;
  errorMessage?: string;
  rawValue: string;
}

function parseMessage(value: string): ParsedMessage {
  try {
    const parsed = JSON.parse(value);
    const resource = parsed.resource || {};
    const commandId = resource.commandId || '';
    const commandName = commandId.includes(':') ? commandId.split(':')[0] : commandId || undefined;

    return {
      commandName,
      sourceMicroservice: parsed.hostname,
      success: resource.success,
      errorMessage: resource.payload?.errorMessage,
      rawValue: value,
    };
  } catch {
    return { rawValue: value };
  }
}

function formatMessageContent(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 4);
  } catch {
    return value;
  }
}

export function MessageFlowGraph({ messages }: MessageFlowGraphProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [expandedFlowIds, setExpandedFlowIds] = useState<Set<string>>(new Set());

  const flowGroups = useMemo(() => {
    const groups = new Map<string, KafkaMessage[]>();

    messages.forEach((msg) => {
      if (!groups.has(msg.flowId)) {
        groups.set(msg.flowId, []);
      }
      groups.get(msg.flowId)!.push(msg);
    });

    const result: FlowGroup[] = [];
    groups.forEach((msgs, flowId) => {
      const sorted = msgs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Newest first
      result.push({
        flowId,
        messages: sorted,
        firstMessage: sorted[sorted.length - 1].timestamp, // First chronologically is now last in array
        lastMessage: sorted[0].timestamp, // Last chronologically is now first in array
      });
    });

    return result.sort((a, b) => b.lastMessage.getTime() - a.lastMessage.getTime());
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className='h-full flex flex-col items-center justify-center py-16 text-center'>
        <div className='h-16 w-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4'>
          <Hash className='h-8 w-8 text-purple-600 dark:text-purple-400' />
        </div>
        <p className='text-muted-foreground font-medium'>No messages received yet</p>
        <p className='text-sm text-muted-foreground mt-1'>Connect to start receiving and visualizing messages</p>
      </div>
    );
  }

  const toggleFlowExpanded = (flowId: string) => {
    setExpandedFlowIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(flowId)) {
        newSet.delete(flowId);
      } else {
        newSet.add(flowId);
      }
      return newSet;
    });
  };

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

  return (
    <div className='h-full overflow-y-auto pr-2 space-y-6 sm:space-y-8'>
      {flowGroups.map((group) => {
        const isFlowExpanded = expandedFlowIds.has(group.flowId);

        return (
          <div key={group.flowId} className='space-y-4'>
            <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 pb-2 border-b border-purple-200/50 dark:border-purple-800/30'>
              <div className='flex items-center gap-2 sm:gap-3 flex-1 min-w-0'>
                <div className='h-2 w-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse shadow-sm flex-shrink-0' />
                <div className='flex items-center gap-1 sm:gap-2 min-w-0'>
                  <Hash className='h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0' />
                  <h3 className='font-semibold text-sm sm:text-base flex-shrink-0'>Flow ID:</h3>
                  <button onClick={() => toggleFlowExpanded(group.flowId)} className='px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md font-mono text-xs sm:text-sm font-semibold truncate hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer flex items-center gap-1'>
                    <span className={`transition-transform duration-200 ${isFlowExpanded ? 'rotate-90' : 'rotate-0'}`}>
                      <ChevronRight className='h-3 w-3' />
                    </span>
                    {group.flowId}
                  </button>
                </div>
              </div>
              <div className='flex items-center gap-2 sm:gap-3 flex-wrap'>
                <Badge variant='secondary' className='text-xs sm:text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'>
                  {group.messages.length} message{group.messages.length !== 1 ? 's' : ''}
                </Badge>
                <div className='text-xs text-muted-foreground flex items-center gap-1 hidden sm:flex'>
                  <span>Newest first</span>
                  <ArrowDown className='h-3 w-3' />
                </div>
                <div className='text-xs text-muted-foreground'>{Math.round((group.lastMessage.getTime() - group.firstMessage.getTime()) / 1000)}s</div>
              </div>
            </div>
            <div className={`ml-2 sm:ml-6 space-y-3 overflow-hidden transition-all duration-300 ease-in-out ${isFlowExpanded ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              {isFlowExpanded && (
                <>
                  {group.messages.map((msg, idx) => {
                    const parsed = parseMessage(msg.value);
                    const isExpanded = expandedMessages.has(msg.id);

                    return (
                      <div
                        key={msg.id}
                        className={`relative transition-all duration-300 ease-out ${isFlowExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                        style={{
                          transitionDelay: isFlowExpanded ? `${idx * 50}ms` : '0ms',
                        }}
                      >
                        {idx < group.messages.length - 1 && <div className='absolute left-3 top-12 w-0.5 h-8 bg-gradient-to-b from-purple-400 to-pink-400 opacity-40' />}
                        <Card className='ml-2 sm:ml-6 border border-slate-200/70 dark:border-slate-700/50 border-l-4 border-l-purple-500/60 hover:border-l-purple-600 dark:border-l-purple-400/60 dark:hover:border-l-purple-400 transition-colors shadow-sm hover:shadow-md bg-gradient-to-r from-white to-purple-50/10 dark:from-slate-800 dark:to-purple-950/20'>
                          <CardContent className='p-3 sm:p-5'>
                            {/* Simplified view */}
                            <div className='space-y-2'>
                              <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3'>
                                <div className='flex flex-wrap gap-2 items-center'>
                                  <div className='flex items-center gap-1.5'>
                                    <div className='h-2.5 w-2.5 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 shadow-sm' />
                                    <Badge variant='outline' className='text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300/60 dark:border-slate-600/60'>
                                      #{group.messages.length - idx}
                                    </Badge>
                                  </div>
                                  <Badge variant='outline' className='text-xs font-medium border-teal-300/60 text-teal-700 dark:border-teal-700/60 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/20'>
                                    {msg.topic}
                                  </Badge>
                                  {parsed.commandName && (
                                    <Badge variant='outline' className='text-xs font-medium border-blue-300/60 text-blue-700 dark:border-blue-700/60 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/20'>
                                      Command: {parsed.commandName}
                                    </Badge>
                                  )}
                                  {parsed.sourceMicroservice && (
                                    <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                                      <Server className='h-3 w-3' />
                                      <span className='truncate max-w-[150px]'>{parsed.sourceMicroservice}</span>
                                    </div>
                                  )}
                                  {parsed.success !== undefined && (
                                    <div className='flex items-center gap-1'>
                                      {parsed.success ? (
                                        <Badge variant='outline' className='text-xs border-green-300/60 text-green-700 dark:border-green-700/60 dark:text-green-300 bg-green-50 dark:bg-green-950/20'>
                                          <CheckCircle2 className='h-3 w-3 mr-1' />
                                          Success
                                        </Badge>
                                      ) : (
                                        <Badge variant='outline' className='text-xs border-red-300/60 text-red-700 dark:border-red-700/60 dark:text-red-300 bg-red-50 dark:bg-red-950/20'>
                                          <XCircle className='h-3 w-3 mr-1' />
                                          Failed
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className='flex items-center gap-2'>
                                  <Button
                                    onClick={() => {
                                      if (typeof window !== 'undefined') {
                                        const win = window as unknown as { useKafkaMessageForSend?: (topic: string, key: string | null, value: string) => void };
                                        if (win.useKafkaMessageForSend) {
                                          win.useKafkaMessageForSend(msg.topic, msg.key, msg.value);
                                        }
                                      }
                                    }}
                                    variant='outline'
                                    size='sm'
                                    className='h-7 text-xs'
                                  >
                                    <Send className='h-3 w-3 mr-1' />
                                    Use for Send
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      if (typeof window !== 'undefined') {
                                        const win = window as unknown as { resendKafkaMessage?: (message: KafkaMessage) => void };
                                        if (win.resendKafkaMessage) {
                                          win.resendKafkaMessage(msg);
                                        }
                                      }
                                    }}
                                    variant='outline'
                                    size='sm'
                                    className='h-7 text-xs'
                                  >
                                    <Repeat className='h-3 w-3 mr-1' />
                                    Resend
                                  </Button>
                                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                    <Clock className='h-3 w-3' />
                                    {msg.timestamp.toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>

                              {parsed.errorMessage && (
                                <div className='flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/40 rounded-md'>
                                  <AlertCircle className='h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' />
                                  <div className='flex-1 min-w-0'>
                                    <div className='text-xs font-medium text-red-700 dark:text-red-300 mb-1'>Error Message</div>
                                    <div className='text-xs text-red-600 dark:text-red-400 break-words'>{parsed.errorMessage}</div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Expandable full details */}
                            <button onClick={() => toggleMessageExpanded(msg.id)} className='mt-3 w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-slate-200/60 dark:border-slate-700/40'>
                              <div className='flex items-center gap-2'>
                                <FileText className='h-3.5 w-3.5' />
                                <span>Message Details</span>
                              </div>
                              <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                <ChevronRight className='h-3 w-3' />
                              </span>
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                              {isExpanded && (
                                <div className='space-y-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/40'>
                                  <div className='flex flex-wrap gap-2 items-center text-xs'>
                                    <Badge variant='outline' className='text-xs font-medium border-teal-300/60 text-teal-700 dark:border-teal-700/60 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/20'>
                                      {msg.topic}
                                    </Badge>
                                    <span className='text-muted-foreground flex items-center gap-1'>
                                      <span>P:{msg.partition}</span>
                                      <span>•</span>
                                      <span>O:{msg.offset}</span>
                                    </span>
                                    {msg.key && (
                                      <div className='flex items-center gap-2'>
                                        <span className='text-muted-foreground'>Key:</span>
                                        <code className='px-2 py-1 bg-muted rounded text-xs font-mono'>{msg.key}</code>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className='flex items-center justify-between mb-2'>
                                      <div className='flex items-center gap-2'>
                                        <FileText className='h-3.5 w-3.5 text-muted-foreground' />
                                        <span className='text-xs font-medium text-muted-foreground'>Full Message Content</span>
                                        {group.flowId !== 'unknown' && group.flowId !== 'error' && (
                                          <Badge variant='outline' className='text-[10px] px-1.5 py-0 border-purple-300/60 text-purple-600 dark:border-purple-700/60 dark:text-purple-400'>
                                            FlowID from {msg.flowIdSource === 'json-content' ? 'JSON' : msg.flowIdSource || 'unknown'}
                                          </Badge>
                                        )}
                                      </div>
                                      <Button
                                        onClick={() => {
                                          if (typeof window !== 'undefined') {
                                            const win = window as unknown as { useKafkaMessageForSend?: (topic: string, key: string | null, value: string) => void };
                                            if (win.useKafkaMessageForSend) {
                                              win.useKafkaMessageForSend(msg.topic, msg.key, msg.value);
                                            }
                                          }
                                        }}
                                        variant='outline'
                                        size='sm'
                                        className='h-7 text-xs'
                                      >
                                        <Send className='h-3 w-3 mr-1' />
                                        Use for Send
                                      </Button>
                                    </div>
                                    <div className='font-mono text-xs min-h-[150px] max-h-[250px] rounded-md border border-purple-200/60 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-950/20 p-3 overflow-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words'>{formatMessageContent(msg.value)}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
