"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Square, Trash2, Database, Clock, Copy, CheckCircle2, XCircle } from "lucide-react"
import { Client, createClient, SubscribePayload } from "graphql-ws"
import { toast } from "sonner"
import { GraphQLCodeEditor } from "./GraphQLCodeEditor"
import { JsonViewer } from "./JsonViewer"

interface ReceivedMessage {
  id: string
  timestamp: Date
  data: string
}

interface GraphQLSubscriptionProps {
  endpoint: string
  setEndpoint: (value: string) => void
  subscriptionQuery: string
  setSubscriptionQuery: (value: string) => void
  messages: ReceivedMessage[]
  setMessages: (messages: ReceivedMessage[] | ((prev: ReceivedMessage[]) => ReceivedMessage[])) => void
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
  onDisconnect: () => void
  onClear: () => void
}

export function GraphQLSubscription({
  endpoint,
  setEndpoint,
  subscriptionQuery,
  setSubscriptionQuery,
  messages,
  setMessages,
  isConnected,
  setIsConnected,
  onDisconnect,
  onClear,
}: GraphQLSubscriptionProps) {
  const clientRef = useRef<Client | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const connect = async () => {
    if (!endpoint || !subscriptionQuery) {
      toast.error("Missing Information", {
        description: "Please provide both endpoint and subscription query",
      })
      return
    }

    if (isConnected) {
      disconnect()
      return
    }

    try {
      const client = createClient({
        url: endpoint,
      })

      clientRef.current = client

      const unsubscribe = client.subscribe(
        {
          query: subscriptionQuery,
        } as SubscribePayload,
        {
          next: (data) => {
            const newMessage: ReceivedMessage = {
              id: Date.now().toString(),
              timestamp: new Date(),
              data: JSON.stringify(data, null, 2),
            }
            setMessages((prev) => [newMessage, ...prev])
          },
          error: (err) => {
            console.error("Subscription error:", err)
            const errorMessage: ReceivedMessage = {
              id: Date.now().toString(),
              timestamp: new Date(),
              data: `Error: ${err instanceof Error ? err.message : String(err)}`,
            }
            setMessages((prev) => [errorMessage, ...prev])
            setIsConnected(false)
          },
          complete: () => {
            console.log("Subscription completed")
            setIsConnected(false)
          },
        }
      )

      unsubscribeRef.current = unsubscribe
      setIsConnected(true)
      toast.success("Connected", {
        description: "Successfully connected to GraphQL subscription",
      })
    } catch (error) {
      console.error("Connection error:", error)
      toast.error("Connection Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
      setIsConnected(false)
    }
  }

  const disconnect = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    if (clientRef.current) {
      clientRef.current.dispose()
      clientRef.current = null
    }
    setIsConnected(false)
    onDisconnect()
    toast.info("Disconnected", {
      description: "GraphQL subscription disconnected",
    })
  }

  useEffect(() => {
    return () => {
      // Only cleanup on unmount, not on tab switch
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (clientRef.current) {
        clientRef.current.dispose()
      }
    }
  }, [])

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full items-stretch">
      <Card className="border-2 border-blue-200/50 shadow-lg bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-800 dark:border-blue-800/30 flex flex-col lg:w-[500px] lg:flex-shrink-0 self-start">
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                <Database className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl">GraphQL Subscription</CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm">
                  Connect to a GraphQL subscription endpoint and receive real-time messages
                </CardDescription>
              </div>
            </div>
            <Badge variant={isConnected ? "success" : "secondary"} className="gap-1.5 text-xs sm:text-sm">
              {isConnected ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4 flex-shrink-0">
            <div className="space-y-2">
              <Label htmlFor="endpoint" className="text-sm font-medium">Endpoint URL</Label>
              <Input
                id="endpoint"
                placeholder="ws://localhost:4000/graphql"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                disabled={isConnected}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="query" className="text-sm font-medium">Subscription Query</Label>
              <GraphQLCodeEditor
                value={subscriptionQuery}
                onChange={setSubscriptionQuery}
                disabled={isConnected}
                placeholder="subscription { messageAdded { id content } }"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2 flex-shrink-0">
            <Button
              onClick={connect}
              variant={isConnected ? "destructive" : "default"}
              size="lg"
              className="w-full sm:min-w-[140px] sm:w-auto"
            >
              {isConnected ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Disconnect
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Connect
                </>
              )}
            </Button>
            <Button onClick={() => setMessages([])} variant="outline" size="lg" className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Messages
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-indigo-200/50 shadow-lg bg-gradient-to-br from-white to-indigo-50/20 dark:from-slate-900 dark:to-slate-800 dark:border-indigo-800/30 flex-1 flex flex-col h-full min-h-0">
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Received Messages</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {messages.length} message{messages.length !== 1 ? "s" : ""} received
              </CardDescription>
            </div>
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs sm:text-sm bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {messages.length} total
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="space-y-3 h-full overflow-y-auto pr-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
                  <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-muted-foreground font-medium">No messages received yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect to start receiving real-time messages
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="group border border-blue-200/50 dark:border-blue-800/30 rounded-xl p-5 bg-gradient-to-br from-white to-blue-50/20 dark:from-slate-800 dark:to-slate-800/50 hover:from-blue-50 hover:to-indigo-50/30 dark:hover:from-slate-700 dark:hover:to-slate-700/50 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {message.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(message.data, message.id)}
                    >
                      {copiedId === message.id ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <JsonViewer value={message.data} maxHeight="300px" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

