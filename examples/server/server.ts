import * as ngrok from "ngrok";
import downloadNgrok from "ngrok/download";
import fs from "node:fs";
import { createWebhookServer } from "../../src/webhook";

const DEMO_ENV_PATH = new URL("../react/.env", import.meta.url);
const port = Number(Bun.env.PORT ?? 3000);
const server = createWebhookServer({ corsOrigin: Bun.env.CORS_ORIGIN ?? "*" });
let tunnelUrl: string | null = null;
let binaryReady = false;
const tunnelHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Cache-Control": "no-store"
};

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
  const message = error instanceof Error ? error.message : String(error);
  const hasToken = Boolean(process.env.NGROK_AUTHTOKEN?.trim());
  if (!hasToken && /invalid tunnel configuration|authtoken|authentication/i.test(message)) {
    return "NGROK_AUTHTOKEN not found. Add it to examples/react/.env.";
  }
  return message;
}

function ngrokArch(): string {
  const platform = process.platform === "win32" ? "win32" : process.platform;
  const arch = process.arch === "x64" ? "x64" : process.arch;
  return `${platform}${arch}`;
}

function repairNgrokBinary(): Promise<void> {
  return new Promise((resolve, reject) => {
    downloadNgrok((error) => {
      if (error) reject(error);
      else resolve();
    }, { arch: ngrokArch(), ignoreCache: true });
  });
}

async function ensureNgrokBinary(): Promise<void> {
  if (binaryReady) return;
  try {
    await ngrok.getVersion();
  } catch {
    await repairNgrokBinary();
    await ngrok.getVersion();
  }
  binaryReady = true;
}

async function startTunnel(): Promise<string> {
  const authtoken = process.env.NGROK_AUTHTOKEN?.trim();
  await ensureNgrokBinary();
  return ngrok.connect({
    addr: port,
    ...(authtoken ? { authtoken } : {})
  });
}

async function stopTunnel(): Promise<void> {
  try {
    if (tunnelUrl) await ngrok.disconnect(tunnelUrl);
    else await ngrok.disconnect();
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

