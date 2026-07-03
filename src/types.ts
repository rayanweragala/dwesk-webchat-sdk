export interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
}

export interface DweskWebChatConfig {
  crmUrl: string;
  companyId: number;
  username?: string;
  password?: string;
  authToken?: string;
  webhookUrl?: string;
  customer?: CustomerInfo;
  eventSource?: typeof EventSource;
  fetch?: typeof fetch;
  userAgent?: string;
  ipAddress?: string;
  debug?: boolean;
  onDebugEvent?: (event: WebChatDebugEvent) => void;
}

export interface SendMessageInput {
  message: string;
  customer?: CustomerInfo;
  metadata?: Record<string, unknown>;
}

export interface SendFileInput {
  file: Blob;
  fileName: string;
  fileType?: string;
  message?: string;
  customer?: CustomerInfo;
  metadata?: Record<string, unknown>;
}

export interface ExternalMessageRequest {
  companyId: number;
  source?: "webchat";
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  message?: string;
  sessionId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: string;
  fileBase64?: string;
  fileName?: string;
  fileType?: string;
}

export interface ExternalMessageResponse {
  status: number;
  message: string;
  queueId?: number | null;
  sessionId?: string | null;
}

export interface IncomingAttachment {
  base64: string;
  name: string;
  type: string;
}

export interface IncomingAgentMessage {
  id: string;
  sessionId: string;
  message: string;
  agentName: string;
  timestamp: string;
  read: boolean;
  receivedAt: number;
  eventType?: "message" | "resolved" | "reopened";
  attachment?: IncomingAttachment;
}

export interface WebChatError {
  context: string;
  error: Error;
}

export type WebChatDebugEvent =
  | {
      type: "request";
      timestamp: string;
      method: "POST";
      url: string;
      body: unknown;
      headers: Record<string, string>;
    }
  | {
      type: "response";
      timestamp: string;
      url: string;
      status: number;
      body: unknown;
    }
  | {
      type: "sse-open";
      timestamp: string;
      url: string;
    }
  | {
      type: "sse-message";
      timestamp: string;
      url: string;
      body: unknown;
    }
  | {
      type: "error";
      timestamp: string;
      context: string;
      message: string;
    };

export type ReplyHandler = (message: IncomingAgentMessage) => void;
export type ErrorHandler = (error: WebChatError) => void;
