import { NextRequest } from "next/server"

const messageStreams = new Map<string, ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const consumerId = searchParams.get("consumerId")

  if (!consumerId) {
    return Response.json({ error: "Missing consumerId" }, { status: 400 })
  }

  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      messageStreams.set(consumerId, controller)
      
      try {
        const testMessage = `data: ${JSON.stringify({ type: "connection-test", consumerId })}\n\n`
        controller.enqueue(encoder.encode(testMessage))
      } catch {
        // Ignore errors sending test message
      }
    },
    cancel() {
      messageStreams.delete(consumerId)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}

export function sendKafkaMessage(consumerId: string, message: unknown) {
  const controller = messageStreams.get(consumerId)
  if (controller) {
    try {
      const data = `data: ${JSON.stringify(message)}\n\n`
      controller.enqueue(new TextEncoder().encode(data))
    } catch {
      messageStreams.delete(consumerId)
    }
  }
}
