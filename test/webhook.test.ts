import { describe, expect, test } from "bun:test";
import { createWebhookServer } from "../src/webhook";
import { WebhookStore } from "../src/webhook-store";

describe("WebhookStore", () => {
  test("queues unread messages once", () => {
    const store = new WebhookStore({ id: () => "m1", now: () => 100 });
    store.receive({ sessionId: "s1", message: "Hello", agentName: "Nina" });

    expect(store.drainUnread("s1")).toHaveLength(1);
    expect(store.drainUnread("s1")).toHaveLength(0);
    expect(store.stats()).toEqual({ totalSessions: 1, totalMessages: 1, unreadMessages: 0 });
  });

  test("pushes received messages to subscribers", () => {
    const store = new WebhookStore({ id: () => "m1", now: () => 100 });
    const messages: string[] = [];
    const unsubscribe = store.subscribe("s1", (message) => messages.push(message.message));

    store.receive({ sessionId: "s1", message: "Live reply" });
    unsubscribe();
    store.receive({ sessionId: "s1", message: "After close" });

    expect(messages).toEqual(["Live reply"]);
    expect(store.drainUnread("s1").map((message) => message.message)).toEqual(["After close"]);
  });

  test("accepts resolved and reopened events", () => {
    const store = new WebhookStore({ id: () => "m1", now: () => 100 });

    const resolved = store.receive({ sessionId: "s1", eventType: "resolved" });
    const reopened = store.receive({ sessionId: "s1", eventType: "reopened" });

    expect(resolved).toMatchObject({ eventType: "resolved", message: "Chat marked as resolved" });
    expect(reopened).toMatchObject({ eventType: "reopened", message: "Chat reopened" });
  });

  test("rejects payload without session", () => {
    const store = new WebhookStore();
    expect(() => store.receive({ message: "Hello" })).toThrow("Missing required field: sessionId");
  });
});

describe("createWebhookServer", () => {
  test("handles post and SSE routes", async () => {
    const server = createWebhookServer({ id: () => "m1", now: () => 100 });
    const events = await server.fetch(new Request("http://local/api/webhook/chat/events/s1"));
    const reader = events.body?.getReader();
    const decoder = new TextDecoder();
    await reader?.read();

    const post = await server.fetch(
      new Request("http://local/api/webhook/chat", {
        method: "POST",
        body: JSON.stringify({ sessionId: "s1", message: "Agent reply" })
      })
    );
    expect(post.status).toBe(200);

    const chunk = await reader?.read();
    expect(decoder.decode(chunk?.value)).toContain("\"message\":\"Agent reply\"");
    await reader?.cancel();
  });
});
