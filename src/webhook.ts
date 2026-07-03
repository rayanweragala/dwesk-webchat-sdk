import { WebhookStore, type AgentWebhookPayload, type WebhookStoreOptions } from "./webhook-store";

export interface WebhookServerOptions extends WebhookStoreOptions {
  corsOrigin?: string;
}

export function createWebhookServer(options: WebhookServerOptions = {}) {
  const store = new WebhookStore(options);
  const corsOrigin = options.corsOrigin ?? "*";

  return {
    store,
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const headers = {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Cache-Control": "no-store"
      };

      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

      try {
        if (request.method === "POST" && url.pathname === "/api/webhook/chat") {
          const message = store.receive((await request.json()) as AgentWebhookPayload);
          return json({ success: true, messageId: message.id, sessionId: message.sessionId }, headers);
        }

        const match = url.pathname.match(/^\/api\/webhook\/chat\/events\/([^/]+)$/);
        if (request.method === "GET" && match?.[1]) {
          return stream(store, decodeURIComponent(match[1]), headers);
        }

        return json({ error: "Not found" }, headers, 404);
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, headers, 400);
      }
    }
  };
}

function json(data: unknown, headers: HeadersInit, status = 200): Response {
  return Response.json(data, { status, headers });
}

function stream(store: WebhookStore, sessionId: string, headers: HeadersInit): Response {
  const encoder = new TextEncoder();
  let unsubscribe = () => {};

  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));
      unsubscribe = store.subscribe(sessionId, (message) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      });
    },
    cancel() {
      unsubscribe();
    }
  });

  return new Response(body, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream",
      Connection: "keep-alive"
    }
  });
}
