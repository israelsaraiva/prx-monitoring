import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Hash, Clock, FileText, ArrowDown } from "lucide-react"
import { JsonViewer } from "@/components/JsonViewer"

interface KafkaMessage {
  id: string
  flowId: string
  timestamp: Date
  topic: string
  partition: number
  offset: string
  key: string | null
  value: string
  flowIdSource?: string
}

interface MessageFlowGraphProps {
  messages: KafkaMessage[]
}

interface FlowGroup {
  flowId: string
  messages: KafkaMessage[]
  firstMessage: Date
  lastMessage: Date
}

export function MessageFlowGraph({ messages }: MessageFlowGraphProps) {

  const flowGroups = useMemo(() => {
    const groups = new Map<string, KafkaMessage[]>()

    messages.forEach((msg) => {
      if (!groups.has(msg.flowId)) {
        groups.set(msg.flowId, [])
      }
      groups.get(msg.flowId)!.push(msg)
    })

    const result: FlowGroup[] = []
    groups.forEach((msgs, flowId) => {
      const sorted = msgs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Newest first
      result.push({
        flowId,
        messages: sorted,
        firstMessage: sorted[sorted.length - 1].timestamp, // First chronologically is now last in array
        lastMessage: sorted[0].timestamp, // Last chronologically is now first in array
      })
    })

    return result.sort(
      (a, b) => b.lastMessage.getTime() - a.lastMessage.getTime()
    )
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4">
          <Hash className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <p className="text-muted-foreground font-medium">No messages received yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Connect to start receiving and visualizing messages
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-h-[600px] sm:max-h-[800px] overflow-y-auto pr-2">
      {flowGroups.map((group, groupIdx) => (
        <div key={group.flowId} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 pb-2 border-b border-purple-200/50 dark:border-purple-800/30">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="h-2 w-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse shadow-sm flex-shrink-0" />
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <h3 className="font-semibold text-sm sm:text-base flex-shrink-0">Flow ID:</h3>
                <code className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md font-mono text-xs sm:text-sm font-semibold truncate">
                  {group.flowId}
                </code>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Badge variant="secondary" className="text-xs sm:text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                {group.messages.length} message{group.messages.length !== 1 ? "s" : ""}
              </Badge>
              <div className="text-xs text-muted-foreground flex items-center gap-1 hidden sm:flex">
                <span>Newest first</span>
                <ArrowDown className="h-3 w-3" />
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round((group.lastMessage.getTime() - group.firstMessage.getTime()) / 1000)}s
              </div>
            </div>
          </div>
          <div className="ml-2 sm:ml-6 space-y-3">
            {group.messages.map((msg, idx) => (
              <div key={msg.id} className="relative">
                {idx < group.messages.length - 1 && (
                  <div className="absolute left-3 top-12 w-0.5 h-8 bg-gradient-to-b from-purple-400 to-pink-400 opacity-40" />
                )}
                <Card className="ml-2 sm:ml-6 border border-slate-200/70 dark:border-slate-700/50 border-l-4 border-l-purple-500/60 hover:border-l-purple-600 dark:border-l-purple-400/60 dark:hover:border-l-purple-400 transition-colors shadow-sm hover:shadow-md bg-gradient-to-r from-white to-purple-50/10 dark:from-slate-800 dark:to-purple-950/20">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 shadow-sm" />
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300/60 dark:border-slate-600/60">
                            #{group.messages.length - idx}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="text-xs font-medium border-teal-300/60 text-teal-700 dark:border-teal-700/60 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/20">
                          {msg.topic}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>P:{msg.partition}</span>
                          <span>•</span>
                          <span>O:{msg.offset}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {msg.key && (
                      <div className="flex items-center gap-2 mb-3 text-xs">
                        <span className="text-muted-foreground">Key:</span>
                        <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                          {msg.key}
                        </code>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/40">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Message Content</span>
                        {group.flowId !== "unknown" && group.flowId !== "error" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-300/60 text-purple-600 dark:border-purple-700/60 dark:text-purple-400">
                            FlowID from {msg.flowIdSource === "json-content" ? "JSON" : msg.flowIdSource || "unknown"}
                          </Badge>
                        )}
                      </div>
                      <JsonViewer value={msg.value} maxHeight="250px" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

