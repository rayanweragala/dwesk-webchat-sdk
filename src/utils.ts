import type { CustomerInfo, ExternalMessageRequest } from "./types";

export function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function endpoint(baseUrl: string, path: string): string {
  return `${trimSlash(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

export function metadataJson(metadata?: Record<string, unknown>): string | undefined {
  return metadata ? JSON.stringify(metadata) : undefined;
}

export function basicAuth(username?: string, password?: string): string | undefined {
  if (!username && !password) return undefined;
  return `Basic ${btoa(`${username ?? ""}:${password ?? ""}`)}`;
}

export function authHeader(config: { authToken?: string; username?: string; password?: string }): string | undefined {
  if (config.authToken) return `Bearer ${config.authToken}`;
  return basicAuth(config.username, config.password);
}

export function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function buildExternalMessage(input: {
  companyId: number;
  customer?: CustomerInfo | undefined;
  message?: string | undefined;
  sessionId?: string | null;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  fileBase64?: string | undefined;
  fileName?: string | undefined;
  fileType?: string | undefined;
}): ExternalMessageRequest {
  const request: ExternalMessageRequest = {
    companyId: input.companyId,
    source: "webchat"
  };

  setIfDefined(request, "customerName", input.customer?.name);
  setIfDefined(request, "customerEmail", input.customer?.email);
  setIfDefined(request, "customerPhone", input.customer?.phone);
  setIfDefined(request, "message", input.message);
  setIfDefined(request, "sessionId", input.sessionId);
  setIfDefined(request, "ipAddress", input.ipAddress);
  setIfDefined(request, "userAgent", input.userAgent);
  setIfDefined(request, "metadata", metadataJson(input.metadata));
  setIfDefined(request, "fileBase64", input.fileBase64);
  setIfDefined(request, "fileName", input.fileName);
  setIfDefined(request, "fileType", input.fileType);

  return request;
}

function setIfDefined<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) target[key] = value;
}

export async function blobToBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
