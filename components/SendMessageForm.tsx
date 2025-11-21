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
    <div className="space-y-4 h-full flex flex-col">
      <div className="shrink-0">
        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">Send Kafka Message</CardTitle>
        <CardDescription className="mt-1 text-xs sm:text-sm">Send a message to a Kafka topic</CardDescription>
      </div>
      <div className="flex-1 flex flex-col min-h-0 space-y-4 pr-2">
        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="send-topic" className="text-sm font-medium">
              Topic *
            </Label>
            <Input
              id="send-topic"
              placeholder="Enter topic name"
              value={sendTopic}
              onChange={(e) => setSendTopic(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="send-key" className="text-sm font-medium">
              Key (optional)
            </Label>
            <Input
              id="send-key"
              placeholder="Enter message key (optional)"
              value={sendKey}
              onChange={(e) => setSendKey(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="send-headers" className="text-sm font-medium">
              Headers (JSON, optional)
            </Label>
            <Textarea
              id="send-headers"
              placeholder='{"header1": "value1", "header2": "value2"}'
              value={sendHeaders}
              onChange={(e) => setSendHeaders(e.target.value)}
              className="font-mono text-xs min-h-[80px] border-slate-200/60 dark:border-slate-700/50"
            />
          </div>
        </div>
        <div className="space-y-2 flex-1 flex flex-col min-h-0">
          <Label htmlFor="send-value" className="text-sm font-medium">
            Message Value (JSON) *
          </Label>
          <Textarea
            id="send-value"
            placeholder="Enter message content as JSON"
            value={sendValue}
            onChange={(e) => setSendValue(e.target.value)}
            className="font-mono text-xs flex-1 border-slate-200/60 dark:border-slate-700/50"
          />
        </div>
      </div>
      <div className="shrink-0 pt-2 border-t-gray-400 space-y-2">
        <Button
          onClick={sendMessage}
          disabled={isSending || !broker || !sendTopic || !sendValue}
          className="w-full"
          size="lg"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </>
          )}
        </Button>
        <Button onClick={clearForm} variant="outline" disabled={isSending} className="w-full" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Form
        </Button>
      </div>
    </div>
  );
}
