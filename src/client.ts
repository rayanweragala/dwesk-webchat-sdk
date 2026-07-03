import type {
  DweskWebChatConfig,
  ErrorHandler,
  ExternalMessageResponse,
  IncomingAgentMessage,
  ReplyHandler,
  SendFileInput,
  SendMessageInput
} from "./types";
import { asError, authHeader, blobToBase64, buildExternalMessage, endpoint } from "./utils";

const RECEIVE_MESSAGE_PATH = "/api/external/webchat/receive-message";

export class DweskWebChatClient {
  private readonly config: DweskWebChatConfig;
  private readonly fetcher: typeof fetch;
  private replyHandlers = new Set<ReplyHandler>();
  private errorHandlers = new Set<ErrorHandler>();
  private events: EventSource | undefined;
  private eventsErrorReported = false;
  private sessionId: string | null = null;
  private queueId: number | null = null;

  constructor(config: DweskWebChatConfig) {
    this.config = config;
    this.fetcher = config.fetch ?? (globalThis.fetch ? globalThis.fetch.bind(globalThis) : fetch);
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getQueueId(): number | null {
    return this.queueId;
  }

  onReply(handler: ReplyHandler): () => void {
    this.replyHandlers.add(handler);
    return () => this.replyHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  async sendMessage(input: string | SendMessageInput): Promise<ExternalMessageResponse> {
    const request = typeof input === "string" ? { message: input } : input;
    if (!request.message.trim()) throw new Error("Message cannot be empty");

    return this.sendToDwesk(
      buildExternalMessage({
        companyId: this.config.companyId,
        customer: request.customer ?? this.config.customer,
        message: request.message.trim(),
        sessionId: this.sessionId,
        ipAddress: this.config.ipAddress,
        userAgent: this.userAgent(),
        metadata: request.metadata
      }),
      "sendMessage"
    );
  }

  async sendFile(input: SendFileInput): Promise<ExternalMessageResponse> {
    const fileBase64 = await blobToBase64(input.file);
    return this.sendToDwesk(
      buildExternalMessage({
        companyId: this.config.companyId,
        customer: input.customer ?? this.config.customer,
        message: input.message?.trim(),
        sessionId: this.sessionId,
        ipAddress: this.config.ipAddress,
        userAgent: this.userAgent(),
        metadata: input.metadata,
        fileBase64,
        fileName: input.fileName,
        fileType: input.fileType ?? input.file.type
      }),
      "sendFile"
    );
  }

  disconnect(): void {
    this.events?.close();
    this.events = undefined;
    this.replyHandlers.clear();
    this.errorHandlers.clear();
  }

  private async sendToDwesk(body: object, context: string): Promise<ExternalMessageResponse> {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const auth = authHeader(this.config);
      if (auth) headers.Authorization = auth;
      const url = endpoint(this.config.crmUrl, RECEIVE_MESSAGE_PATH);
      this.config.onDebugEvent?.({
        type: "request",
        timestamp: new Date().toISOString(),
        method: "POST",
        url,
        headers: { "Content-Type": "application/json", Authorization: auth ? "set" : "not set" },
        body
      });

      const response = await this.fetcher(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = (await response.json()) as ExternalMessageResponse;
      this.config.onDebugEvent?.({
        type: "response",
        timestamp: new Date().toISOString(),
        url,
        status: response.status,
        body: data
      });
      if (data.status !== 1) throw new Error(data.message || "Dwesk rejected message");

      this.sessionId = data.sessionId ?? this.sessionId;
      this.queueId = data.queueId ?? this.queueId;
      this.openEvents();
      return data;
    } catch (error) {
      this.emitError(context, error);
      throw error;
    }
  }

  private userAgent(): string | undefined {
    return this.config.userAgent ?? globalThis.navigator?.userAgent;
  }

  private openEvents(): void {
    if (!this.sessionId || !this.config.webhookUrl || this.events) return;

    const EventSourceCtor = this.config.eventSource ?? globalThis.EventSource;
    if (!EventSourceCtor) {
      this.emitError("openEvents", new Error("EventSource is not available"));
      return;
    }

    const url = endpoint(this.config.webhookUrl, `/events/${this.sessionId}`);
    this.config.onDebugEvent?.({ type: "sse-open", timestamp: new Date().toISOString(), url });
    this.eventsErrorReported = false;
    const events = new EventSourceCtor(url);
    events.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as IncomingAgentMessage;
      this.config.onDebugEvent?.({ type: "sse-message", timestamp: new Date().toISOString(), url, body: message });
      this.replyHandlers.forEach((handler) => handler(message));
    });
    events.addEventListener("error", () => {
      if (this.eventsErrorReported) return;
      this.eventsErrorReported = true;
      this.emitError("events", new Error("SSE connection error"));
    });
    this.events = events;
  }

  private emitError(context: string, error: unknown): void {
    const payload = { context, error: asError(error) };
    this.config.onDebugEvent?.({
      type: "error",
      timestamp: new Date().toISOString(),
      context,
      message: payload.error.message
    });
    this.errorHandlers.forEach((handler) => handler(payload));
    if (this.config.debug) console.error("[DweskWebChat]", context, payload.error);
  }
}
