'use client';

import { Button } from '@/components/ui/button';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SendMessageFormProps {
  broker: string;
  defaultTopic?: string;
  onMessageSent?: () => void;
  onExpand?: () => void;
}

export function SendMessageForm({ broker, defaultTopic, onMessageSent, onExpand }: SendMessageFormProps) {
  const [sendTopic, setSendTopic] = useState(defaultTopic || '');
  const [sendKey, setSendKey] = useState('');
  const [sendValue, setSendValue] = useState('');
  const [sendHeaders, setSendHeaders] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (defaultTopic && !sendTopic) {
      setSendTopic(defaultTopic);
    }
  }, [defaultTopic, sendTopic]);

  const sendMessage = async () => {
    if (!broker || !sendTopic || !sendValue) {
      toast.error('Missing Information', {
        description: 'Please provide broker, topic, and message value',
      });
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/api/kafka/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker,
          topic: sendTopic,
          key: sendKey || null,
          value: sendValue,
          headers: sendHeaders || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      toast.success('Message Sent', {
        description: `Message sent to ${sendTopic} (partition: ${result.partition}, offset: ${result.offset})`,
      });

      onMessageSent?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Send Failed', {
        description: errorMessage,
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageValue = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 4);
    } catch {
      return value;
    }
  };

  const clearForm = () => {
    setSendTopic(defaultTopic || '');
    setSendKey('');
    setSendValue('');
    setSendHeaders('');
    toast.info('Form Cleared', {
      description: 'Send message form has been cleared',
    });
  };

  useEffect(() => {
    const loadMessage = (topic: string, key: string | null, value: string) => {
      setSendTopic(topic);
      setSendKey(key || '');
      setSendValue(formatMessageValue(value));
      onExpand?.();
      toast.info('Message Parameters Loaded', {
        description: 'Message parameters have been loaded into the send form',
      });
    };

    if (typeof window !== 'undefined') {
      (
        window as { useKafkaMessageForSend?: (topic: string, key: string | null, value: string) => void }
      ).useKafkaMessageForSend = loadMessage;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as { useKafkaMessageForSend?: (topic: string, key: string | null, value: string) => void })
          .useKafkaMessageForSend;
      }
    };
  }, [onExpand]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden -mx-4 -my-4 sm:-mx-6 sm:-my-6 lg:-mx-6 lg:-my-6">
      {/* Title Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Send Message</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Produce a message directly to a Kafka topic</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-5">
        <div className="space-y-4 shrink-0">
          <div className="space-y-1.5">
            <label htmlFor="send-topic" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Topic <span className="text-red-500">*</span>
            </label>
            <input
              id="send-topic"
              placeholder="Enter topic name"
              value={sendTopic}
              onChange={(e) => setSendTopic(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors shadow-inner"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="send-key" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Key (optional)
            </label>
            <input
              id="send-key"
              placeholder="Enter message key"
              value={sendKey}
              onChange={(e) => setSendKey(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors shadow-inner"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="send-headers" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Headers (JSON, optional)
            </label>
            <textarea
              id="send-headers"
              placeholder='{"header1": "value1"}'
              value={sendHeaders}
              onChange={(e) => setSendHeaders(e.target.value)}
              className="w-full h-24 p-3 font-mono text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors shadow-inner resize-none"
            />
          </div>
        </div>

        <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
          <label
            htmlFor="send-value"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"
          >
            <span>
              Message Value (JSON) <span className="text-red-500">*</span>
            </span>
          </label>
          <div className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded shadow-inner flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/50 focus-within:border-teal-500 transition-colors">
            <div className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 flex items-center">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">RAW JSON</span>
            </div>
            <textarea
              id="send-value"
              placeholder='{\n  "message": "hello world"\n}'
              value={sendValue}
              onChange={(e) => setSendValue(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-[11px] bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40 shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={sendMessage}
          disabled={isSending || !broker || !sendTopic || !sendValue}
          className="h-10 w-full flex items-center justify-center rounded text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 border border-teal-700/50"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-3.5 w-3.5" /> Send Message
            </>
          )}
        </button>
        <button
          onClick={clearForm}
          disabled={isSending}
          className="h-10 w-full flex items-center justify-center rounded text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-900/80 dark:border-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-sm disabled:opacity-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Form
        </button>
      </div>
    </div>
  );
}
