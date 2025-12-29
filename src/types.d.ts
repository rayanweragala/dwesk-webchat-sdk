declare module 'dwesk-webchat-sdk' {
  export interface DweskConfig {
    /** Target CRM endpoint URL */
    crmUrl: string;
    /** Your unique Dwesk organization ID */
    companyId: number;
    /** API/Webchat credentials */
    username: string;
    password: string;
    /** The server URL where the SDK should poll for agent replies */
    webhookUrl: string;
    /** Optional metadata about the end-user for CRM identification */
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    /** Polling frequency in ms. Defaults to 3000 */
    pollInterval?: number;
    /** Enable verbose console logging for debugging network calls */
    debug?: boolean;
  }

  export interface MessageResponse {
    /** 1 for success, 0 or other for failure */
    status: number;
    message: string;
    queueId: number | null;
    sessionId: string | null;
  }

  export interface IncomingMessage {
    id: number | string;
    sessionId: string;
    message: string;
    agentName: string;
    timestamp: string;
    /** URL to file if the agent sent an attachment */
    attachmentUrl: string | null;
    read: boolean;
  }

  export interface ErrorContext {
    /** The method name where the exception occurred (e.g., 'sendMessage') */
    context: string;
    error: Error;
  }

  export class DweskWebChatSDK {
    constructor(config: DweskConfig);
    
    /** Sends a plain text message and auto-starts the polling loop if needed */
    sendMessage(message: string, metadata?: Record<string, any>): Promise<MessageResponse>;
    
    /** Base64 encodes and sends a File object */
    sendFile(file: File, message?: string): Promise<MessageResponse>;
    
    /** Fired when a new message is received from the polling server */
    onReply(callback: (message: IncomingMessage) => void): void;
    
    /** Global error handler for network failures or SDK exceptions */
    onError(callback: (error: ErrorContext) => void): void;
    
    getSessionId(): string | null;
    getQueueId(): number | null;
    
    /** Stops the polling loop and clears timers */
    disconnect(): void;
    
    /** Manually trigger a check for new messages regardless of poll interval */
    checkForReplies(): Promise<void>;
  }

  export default DweskWebChatSDK;
}

declare module 'dwesk-webchat-sdk/webhook' {
  import { Request, Response, RequestHandler } from 'express';

  export interface WebhookOptions {
    /** Memory limit for messages per session. Prevents memory leaks. */
    maxMessagesPerSession?: number;
    /** TTL for session data in ms. */
    messageExpiry?: number;
    debug?: boolean;
  }

  export interface WebhookStats {
    totalSessions: number;
    totalMessages: number;
    unreadMessages: number;
  }

  export class DweskWebhookServer {
    constructor(options?: WebhookOptions);
    
    /** Express middleware to handle POST requests from the CRM */
    receiveWebhook(): RequestHandler;
    
    /** Express middleware to handle GET requests from the SDK polling */
    pollMessages(): RequestHandler;
    
    /** Direct access to stored messages for a specific session */
    getAllMessages(sessionId: string): any[];
    
    /** Force delete a session and its message history from memory */
    clearSession(sessionId: string): void;
    
    getStats(): WebhookStats;
  }

  
}