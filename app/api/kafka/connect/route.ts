import { NextRequest } from "next/server"
import { Kafka, EachMessagePayload } from "kafkajs"
import { sendKafkaMessage } from "../messages/route"

interface ConsumerData {
  consumer: ReturnType<Kafka["consumer"]>
  stop: () => Promise<void>
}

const consumers = new Map<string, ConsumerData>()

const CONNECTION_TIMEOUT = 10000

export async function POST(request: NextRequest) {
  try {
    const { broker, topics, consumerId } = await request.json()

    if (!broker || !topics || !consumerId) {
      return Response.json(
        { error: "Missing required fields: broker, topics, consumerId" },
        { status: 400 }
      )
    }

    if (consumers.has(consumerId)) {
      const existingConsumer = consumers.get(consumerId)
      if (existingConsumer) {
        await existingConsumer.stop()
      }
      consumers.delete(consumerId)
    }

    const brokerList = broker.split(",").map((b: string) => b.trim()).filter(Boolean)
    if (brokerList.length === 0) {
      return Response.json(
        { error: "Invalid broker configuration" },
        { status: 400 }
      )
    }

    const kafka = new Kafka({
      brokers: brokerList,
      clientId: "subscriber-tool",
      connectionTimeout: CONNECTION_TIMEOUT,
      requestTimeout: CONNECTION_TIMEOUT,
    })

    const consumer = kafka.consumer({ 
      groupId: `subscriber-tool-${consumerId}`,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    })

    try {
      await Promise.race([
        consumer.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Connection timeout")), CONNECTION_TIMEOUT)
        )
      ])
    } catch (error) {
      return Response.json(
        { 
          error: error instanceof Error 
            ? `Failed to connect to Kafka broker: ${error.message}` 
            : "Failed to connect to Kafka broker" 
        },
        { status: 500 }
      )
    }

    const topicList = topics.split(",").map((t: string) => t.trim()).filter(Boolean)
    if (topicList.length === 0) {
      await consumer.disconnect()
      return Response.json(
        { error: "No valid topics provided" },
        { status: 400 }
      )
    }

    try {
      await consumer.subscribe({ topics: topicList, fromBeginning: false })
    } catch (error) {
      await consumer.disconnect()
      return Response.json(
        { 
          error: error instanceof Error 
            ? `Failed to subscribe to topics: ${error.message}` 
            : "Failed to subscribe to topics" 
        },
        { status: 500 }
      )
    }

    consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        let flowId = "unknown"
        let flowIdSource = "none"
        
        if (message.headers) {
          const flowIdHeader = message.headers.flowId || message.headers.flowid || message.headers["flow-id"]
          if (flowIdHeader) {
            flowId = flowIdHeader.toString()
            flowIdSource = "header"
          }
        }
        
        if (flowId === "unknown" && message.value) {
          try {
            const messageContent = message.value.toString()
            const parsedContent = JSON.parse(messageContent)
            
            const findFlowId = (obj: Record<string, unknown>): string | null => {
              if (typeof obj !== 'object' || obj === null) return null
              
              if (obj.flowId) return String(obj.flowId)
              if (obj.flowid) return String(obj.flowid)
              if (obj['flow-id']) return String(obj['flow-id'])
              if (obj['flow_id']) return String(obj['flow_id'])
              
              for (const value of Object.values(obj)) {
                if (typeof value === 'object' && value !== null) {
                  const found = findFlowId(value as Record<string, unknown>)
                  if (found) return found
                }
              }
              
              return null
            }
            
            const foundFlowId = findFlowId(parsedContent)
            if (foundFlowId) {
              flowId = foundFlowId
              flowIdSource = "json-content"
            }
          } catch {
            // If JSON parsing fails, continue with other methods
          }
        }
        
        if (flowId === "unknown" && message.key) {
          flowId = message.key.toString()
          flowIdSource = "key"
        }

        const kafkaMessage = {
          type: "message",
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString() || null,
          value: message.value?.toString() || "",
          headers: message.headers ? Object.fromEntries(
            Object.entries(message.headers).map(([k, v]) => [k, v?.toString()])
          ) : {},
          timestamp: Date.now(),
          flowId,
          flowIdSource,
        }

        sendKafkaMessage(consumerId, kafkaMessage)
      },
    })

    const stop = async () => {
      try {
        await consumer.disconnect()
      } catch {
        // Ignore errors during disconnect
      }
      consumers.delete(consumerId)
    }

    consumers.set(consumerId, { consumer, stop })

    return Response.json({ success: true, consumerId })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENOTFOUND")) {
      return Response.json(
        { error: `Cannot connect to Kafka broker. Please check if the broker is running and accessible at the provided address.` },
        { status: 500 }
      )
    }
    
    return Response.json(
      { error: `Failed to connect to Kafka: ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const consumerId = searchParams.get("consumerId")

    if (!consumerId) {
      return Response.json({ error: "Missing consumerId" }, { status: 400 })
    }

    const consumerData = consumers.get(consumerId)
    if (consumerData) {
      await consumerData.stop()
      return Response.json({ success: true })
    }

    return Response.json({ error: "Consumer not found" }, { status: 404 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
