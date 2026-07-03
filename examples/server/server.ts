import * as ngrok from "ngrok";
import fs from "node:fs";
import { createWebhookServer } from "../../src/webhook";

const DEMO_ENV_PATH = new URL("../react/.env", import.meta.url);
const port = Number(Bun.env.PORT ?? 3000);
const server = createWebhookServer({ corsOrigin: Bun.env.CORS_ORIGIN ?? "*" });
let tunnelUrl: string | null = null;
const tunnelHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Cache-Control": "no-store"
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function loadEnvFile(filePath: string | URL): void {
  if (!fs.existsSync(filePath)) return;

  const source = fs.readFileSync(filePath, "utf8");
  source.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) return;

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  });
}

function tunnelJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: tunnelHeaders });
}

loadEnvFile(DEMO_ENV_PATH);
process.env.NO_PROXY = [process.env.NO_PROXY, process.env.no_proxy, "127.0.0.1", "localhost"]
  .filter(Boolean)
  .join(",");
process.env.no_proxy = process.env.NO_PROXY;

function tunnelPayload(error?: string) {
  return {
    active: Boolean(tunnelUrl),
    url: tunnelUrl,
    webhookUrl: tunnelUrl ? `${tunnelUrl.replace(/\/+$/, "")}/api/webhook/chat` : null,
    ...(error ? { error } : {})
  };
}

function friendlyTunnelError(error: unknown): string {
  const message = extractNgrokErrorMessage(error);
  const hasToken = Boolean(process.env.NGROK_AUTHTOKEN?.trim());
  if (!hasToken && /invalid tunnel configuration|authtoken|authentication/i.test(message)) {
    return "NGROK_AUTHTOKEN not found. Add it to examples/react/.env.";
  }
  return message;
}

/* ─── Robust Ngrok Tunnel Helpers ────────────────────────────────────────── */

function isTunnelForPort(t: any): boolean {
  const addr = String(t.config?.addr || "").trim();
  return addr === String(port) || addr.endsWith(`:${port}`);
}

function choosePreferredTunnel(tunnels: any[]): any | null {
  if (tunnels.length === 0) return null;
  const httpsTunnel = tunnels.find((t) => t.proto === "https");
  return httpsTunnel || tunnels[0];
}

const existingTunnelPattern = /tunnel ["']?([^"']+)["']? already exists/i;

function pushErrorText(target: string[], value: unknown): void {
  if (typeof value === "string" && value.trim()) {
    target.push(value.trim());
  }
}

function collectNgrokErrorTexts(error: unknown): string[] {
  const parts: string[] = [];
  if (!error || typeof error !== "object") {
    pushErrorText(parts, error);
    return parts;
  }

  const err = error as {
    message?: unknown;
    body?: {
      msg?: unknown;
      details?: unknown;
    } | unknown;
  };

  pushErrorText(parts, err.message);
  pushErrorText(parts, err.body);

  if (err.body && typeof err.body === "object") {
    const body = err.body as { msg?: unknown; details?: unknown };
    pushErrorText(parts, body.msg);
    pushErrorText(parts, body.details);

    if (body.details && typeof body.details === "object") {
      Object.values(body.details as Record<string, unknown>).forEach((detailValue) => {
        pushErrorText(parts, detailValue);
      });
    }
  }

  return parts;
}

function uriMatchesTunnelName(uri: string | undefined, name: string): boolean {
  if (!uri) return false;
  return uri.endsWith(`/${name}`) || uri.endsWith(`/${encodeURIComponent(name)}`);
}

function extractExistingTunnelName(error: unknown): string | null {
  const texts = collectNgrokErrorTexts(error);
  for (const text of texts) {
    const match = text.match(existingTunnelPattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function listNgrokTunnels(): Promise<any[]> {
  const api = ngrok.getApi();
  if (!api) return [];
  try {
    const response = await api.listTunnels();
    return Array.isArray(response?.tunnels) ? response.tunnels : [];
  } catch (_error) {
    return [];
  }
}

async function findExistingTunnelUrl(maybeError?: unknown): Promise<string | null> {
  const api = ngrok.getApi();
  const existingName = extractExistingTunnelName(maybeError);
  if (api && existingName) {
    try {
      const detail = await api.tunnelDetail(existingName);
      if (detail?.public_url) return detail.public_url;
    } catch (_error) {}
  }

  const tunnels = await listNgrokTunnels();
  if (tunnels.length === 0) return null;

  if (existingName) {
    const namedTunnel = tunnels.find((t) => t.name === existingName || uriMatchesTunnelName(t.uri, existingName));
    if (namedTunnel?.public_url) return namedTunnel.public_url;
  }

  const matchingByPort = tunnels.filter(isTunnelForPort);
  const tunnel = choosePreferredTunnel(matchingByPort);
  if (tunnel?.public_url) return tunnel.public_url;

  if (existingName) {
    const fallback = choosePreferredTunnel(tunnels);
    return fallback?.public_url || null;
  }

  return null;
}

async function recoverExistingTunnelUrl(maybeError?: unknown): Promise<string | null> {
  const existingName = extractExistingTunnelName(maybeError);
  if (!existingName) return findExistingTunnelUrl();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const recovered = await findExistingTunnelUrl(maybeError);
    if (recovered) return recovered;
    await delay(125 * (attempt + 1));
  }
  return null;
}

function extractNgrokErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown ngrok error";

  const bodyMessage = (error as { body?: { msg?: unknown; details?: { err?: unknown } } }).body;
  const detailsErr = bodyMessage?.details?.err;
  if (typeof detailsErr === "string" && detailsErr.trim()) return detailsErr;
  if (typeof bodyMessage?.msg === "string" && bodyMessage.msg.trim()) return bodyMessage.msg;

  const directMessage = (error as { message?: unknown }).message;
  if (typeof directMessage === "string" && directMessage.trim()) return directMessage;

  return "unknown ngrok error";
}

async function tryStartTunnel(authtoken: string): Promise<string> {
  return ngrok.connect({
    addr: port,
    ...(authtoken ? { authtoken } : {})
  });
}

async function clearConflictingTunnel(error: unknown): Promise<boolean> {
  const api = ngrok.getApi();
  if (!api) return false;

  const tunnels = await listNgrokTunnels();
  const namesToStop = new Set<string>();
  const existingName = extractExistingTunnelName(error);
  if (existingName) {
    namesToStop.add(existingName);
    tunnels
      .filter((t) => t.name === existingName || uriMatchesTunnelName(t.uri, existingName))
      .forEach((t) => namesToStop.add(t.name));
  }

  tunnels.filter(isTunnelForPort).forEach((t) => namesToStop.add(t.name));

  let stoppedAny = false;
  for (const name of namesToStop) {
    try {
      const stopped = await api.stopTunnel(name);
      stoppedAny = stopped || stoppedAny;
    } catch (_stopError) {}
  }
  if (stoppedAny) return true;

  try {
    await ngrok.disconnect();
    return true;
  } catch (_disconnectError) {
    return false;
  }
}

/* ────────────────────────────────────────────────────────────────────────── */

async function startTunnel(): Promise<string> {
  const rawToken = process.env.NGROK_AUTHTOKEN;
  const authtoken = typeof rawToken === "string" ? rawToken.trim() : "";

  const existingUrl = await findExistingTunnelUrl();
  if (existingUrl) {
    return existingUrl;
  }

  let startError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await tryStartTunnel(authtoken);
    } catch (error) {
      startError = error;
      const recoveredUrl = await recoverExistingTunnelUrl(error);
      if (recoveredUrl) return recoveredUrl;

      const cleared = await clearConflictingTunnel(error);
      if (!cleared) break;
    }
  }

  let finalError: unknown = startError;
  for (let restartAttempt = 0; restartAttempt < 3; restartAttempt += 1) {
    try {
      await ngrok.disconnect();
    } catch (_disconnectError) {}

    try {
      await ngrok.kill();
      await delay(200 * (restartAttempt + 1));
      return await tryStartTunnel(authtoken);
    } catch (restartError) {
      finalError = restartError;
      const recoveredAfterRestart = await recoverExistingTunnelUrl(restartError);
      if (recoveredAfterRestart) return recoveredAfterRestart;

      if (!extractExistingTunnelName(restartError)) break;
    }
  }

  throw finalError ?? new Error("Failed to start ngrok tunnel");
}

async function stopTunnel(): Promise<void> {
  try {
    if (tunnelUrl) {
      await ngrok.disconnect(tunnelUrl);
    } else {
      await ngrok.disconnect();
    }
    await ngrok.kill();
  } finally {
    tunnelUrl = null;
  }
}

async function tunnelFetch(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/tunnel/")) {
    return new Response(null, { status: 204, headers: tunnelHeaders });
  }

  if (request.method === "GET" && url.pathname === "/api/tunnel/status") {
    return tunnelJson(tunnelPayload());
  }

  if (request.method === "POST" && url.pathname === "/api/tunnel/start") {
    if (tunnelUrl) return tunnelJson(tunnelPayload());

    try {
      tunnelUrl = await startTunnel();
      return tunnelJson(tunnelPayload());
    } catch (error) {
      tunnelUrl = null;
      return tunnelJson(tunnelPayload(friendlyTunnelError(error)), 500);
    }
  }

  if (request.method === "POST" && url.pathname === "/api/tunnel/stop") {
    try {
      await stopTunnel();
      return tunnelJson(tunnelPayload());
    } catch (error) {
      return tunnelJson(tunnelPayload(friendlyTunnelError(error)), 500);
    }
  }

  return null;
}

Bun.serve({
  port,
  async fetch(request) {
    return (await tunnelFetch(request)) ?? server.fetch(request);
  }
});

console.log(`Dwesk webhook bridge listening on http://localhost:${port}`);

// Auto-start tunnel if NGROK_AUTHTOKEN is provided in the env
if (process.env.NGROK_AUTHTOKEN?.trim()) {
  (async () => {
    try {
      tunnelUrl = await startTunnel();
      console.log(`[Tunnel] Auto-started tunnel at: ${tunnelUrl}`);
    } catch (err) {
      console.error(`[Tunnel] Auto-start failed: ${friendlyTunnelError(err)}`);
    }
  })();
}
