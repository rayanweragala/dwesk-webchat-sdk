import type { IncomingAgentMessage } from "./types";

export interface WebhookStoreOptions {
  maxMessagesPerSession?: number;
  messageTtlMs?: number;
  now?: () => number;
  id?: () => string;
}

export interface AgentWebhookPayload {
  sessionId?: string;
  message?: string;
  agentName?: string;
  timestamp?: string;
  attachmentBase64?: string;
  attachmentName?: string;
  attachmentType?: string;
}

export class WebhookStore {
  private readonly messages = new Map<string, IncomingAgentMessage[]>();
  private readonly subscribers = new Map<string, Set<(message: IncomingAgentMessage) => void>>();
  private readonly maxMessagesPerSession: number;
  private readonly messageTtlMs: number;
  private readonly now: () => number;
  private readonly id: () => string;

  constructor(options: WebhookStoreOptions = {}) {
    this.maxMessagesPerSession = options.maxMessagesPerSession ?? 100;
    this.messageTtlMs = options.messageTtlMs ?? 60 * 60 * 1000;
    this.now = options.now ?? Date.now;
    this.id = options.id ?? (() => crypto.randomUUID());
  }

  receive(payload: AgentWebhookPayload): IncomingAgentMessage {
    if (!payload.sessionId) throw new Error("Missing required field: sessionId");
    if (!payload.message && !payload.attachmentBase64) throw new Error("Missing message content");

    const message: IncomingAgentMessage = {
      id: this.id(),
      sessionId: payload.sessionId,
      message: payload.message ?? "",
      agentName: payload.agentName ?? "Agent",
      timestamp: payload.timestamp ?? new Date(this.now()).toISOString(),
      read: false,
      receivedAt: this.now()
    };

    if (payload.attachmentBase64) {
      message.attachment = {
        base64: payload.attachmentBase64,
        name: payload.attachmentName ?? "file",
        type: payload.attachmentType ?? "application/octet-stream"
      };
    }

    const sessionMessages = this.messages.get(payload.sessionId) ?? [];
    sessionMessages.push(message);
    this.messages.set(payload.sessionId, sessionMessages.slice(-this.maxMessagesPerSession));
    this.subscribers.get(payload.sessionId)?.forEach((send) => send(message));
    return message;
  }

  drainUnread(sessionId: string): IncomingAgentMessage[] {
    this.cleanup();
    const messages = this.messages.get(sessionId) ?? [];
    const unread = messages.filter((message) => !message.read);
    unread.forEach((message) => {
      message.read = true;
    });

    return unread;
  }

  subscribe(sessionId: string, send: (message: IncomingAgentMessage) => void): () => void {
    const sessionSubscribers = this.subscribers.get(sessionId) ?? new Set<(message: IncomingAgentMessage) => void>();
    sessionSubscribers.add(send);
    this.subscribers.set(sessionId, sessionSubscribers);

    for (const message of this.drainUnread(sessionId)) send(message);

    return () => {
      sessionSubscribers.delete(send);
      if (!sessionSubscribers.size) this.subscribers.delete(sessionId);
    };
  }

  all(sessionId: string): IncomingAgentMessage[] {
    return [...(this.messages.get(sessionId) ?? [])];
  }

  clear(sessionId: string): void {
    this.messages.delete(sessionId);
    this.subscribers.delete(sessionId);
  }

  stats(): { totalSessions: number; totalMessages: number; unreadMessages: number } {
    let totalMessages = 0;
    let unreadMessages = 0;
    for (const messages of this.messages.values()) {
      totalMessages += messages.length;
      unreadMessages += messages.filter((message) => !message.read).length;
    }
    return { totalSessions: this.messages.size, totalMessages, unreadMessages };
  }

  cleanup(): void {
    const cutoff = this.now() - this.messageTtlMs;
    for (const [sessionId, messages] of this.messages.entries()) {
      const alive = messages.filter((message) => message.receivedAt >= cutoff);
      if (alive.length) this.messages.set(sessionId, alive);
      else this.messages.delete(sessionId);
    }
  }
}
