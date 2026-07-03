import { describe, expect, test } from "bun:test";
import { DweskWebChatClient } from "../src/client";
import { buildExternalMessage, endpoint } from "../src/utils";

describe("utils", () => {
  test("endpoint joins base and path once", () => {
    expect(endpoint("https://crm.example.com/", "/api/x")).toBe("https://crm.example.com/api/x");
    expect(endpoint("https://crm.example.com", "api/x")).toBe("https://crm.example.com/api/x");
  });

  test("buildExternalMessage maps backend DTO fields", () => {
    expect(
      buildExternalMessage({
        companyId: 7,
        customer: { name: "Ada", email: "ada@example.com", phone: "123" },
        message: "Hi",
        sessionId: "s1",
        metadata: { page: "/pricing" }
      })
    ).toEqual({
      companyId: 7,
      source: "webchat",
      customerName: "Ada",
      customerEmail: "ada@example.com",
      customerPhone: "123",
      message: "Hi",
      sessionId: "s1",
      metadata: "{\"page\":\"/pricing\"}"
    });
  });
});

describe("DweskWebChatClient", () => {
  test("sends backend request and stores session", async () => {
    const calls: RequestInit[] = [];
    const client = new DweskWebChatClient({
      crmUrl: "https://crm.example.com/",
      companyId: 1,
      username: "u",
      password: "p",
      userAgent: "test-agent",
      fetch: (async (_url, init) => {
        calls.push(init ?? {});
        return Response.json({ status: 1, message: "ok", queueId: 9, sessionId: "s1" });
      }) as typeof fetch
    });

    const response = await client.sendMessage({ message: " hello ", customer: { name: "Kai" } });

    expect(response.sessionId).toBe("s1");
    expect(client.getQueueId()).toBe(9);
    expect(calls[0]?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.body))).toMatchObject({
      companyId: 1,
      customerName: "Kai",
      message: "hello",
      userAgent: "test-agent"
    });
  });

  test("opens SSE stream for webhook replies", async () => {
    class FakeEventSource {
      static instances: FakeEventSource[] = [];
      readonly listeners = new Map<string, (event: MessageEvent) => void>();
      constructor(readonly url: string) {
        FakeEventSource.instances.push(this);
      }
      addEventListener(type: string, listener: EventListener) {
        this.listeners.set(type, listener as (event: MessageEvent) => void);
      }
      close() {}
      emit(message: unknown) {
        this.listeners.get("message")?.({ data: JSON.stringify(message) } as MessageEvent);
      }
    }

    const client = new DweskWebChatClient({
      crmUrl: "https://crm.example.com",
      webhookUrl: "https://bridge.example.com/api/webhook/chat",
      companyId: 1,
      eventSource: FakeEventSource as unknown as typeof EventSource,
      fetch: (async () => Response.json({ status: 1, message: "ok", queueId: 1, sessionId: "abc" })) as unknown as typeof fetch
    });
    const replies: string[] = [];
    client.onReply((message) => replies.push(message.message));

    await client.sendMessage("Hi");
    expect(FakeEventSource.instances[0]?.url).toBe("https://bridge.example.com/api/webhook/chat/events/abc");
    FakeEventSource.instances[0]?.emit({ id: "m1", sessionId: "abc", message: "Reply", agentName: "Agent", timestamp: "now", read: false, receivedAt: 1 });

    expect(replies).toEqual(["Reply"]);
  });

  test("reports SSE connection errors once per stream", async () => {
    class FakeEventSource {
      static instances: FakeEventSource[] = [];
      readonly listeners = new Map<string, (event: MessageEvent) => void>();
      constructor(readonly url: string) {
        FakeEventSource.instances.push(this);
      }
      addEventListener(type: string, listener: EventListener) {
        this.listeners.set(type, listener as (event: MessageEvent) => void);
      }
      close() {}
      emitError() {
        this.listeners.get("error")?.({} as MessageEvent);
      }
    }

    const client = new DweskWebChatClient({
      crmUrl: "https://crm.example.com",
      webhookUrl: "https://bridge.example.com/api/webhook/chat",
      companyId: 1,
      eventSource: FakeEventSource as unknown as typeof EventSource,
      fetch: (async () => Response.json({ status: 1, message: "ok", queueId: 1, sessionId: "abc" })) as unknown as typeof fetch
    });
    const errors: string[] = [];
    client.onError(({ error }) => errors.push(error.message));

    await client.sendMessage("Hi");
    FakeEventSource.instances[0]?.emitError();
    FakeEventSource.instances[0]?.emitError();

    expect(errors).toEqual(["SSE connection error"]);
  });
});
