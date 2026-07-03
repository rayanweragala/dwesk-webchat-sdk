# Dwesk WebChat SDK

Bun-first TypeScript SDK for sending customer web chat messages to `dwesk-backend`.

## Install

```bash
bun install dwesk-webchat-sdk
```

## Demo installer

Linux, macOS, Windows Git Bash, or WSL:

```bash
curl -fsSL https://raw.githubusercontent.com/rayanweragala/dwesk-webchat-sdk/master/install.sh | bash
```

Installer asks for Dwesk API URL, company ID, auth credentials, local bridge URL, optional public forward URL, and demo customer details. It installs only the local webhook bridge and React QA demo.

After install:

```bash
dwesk-webchat-demo
```

## Send a message

```ts
import { DweskWebChatClient } from "dwesk-webchat-sdk";

const chat = new DweskWebChatClient({
  crmUrl: "https://dwesk.example.com",
  companyId: 1,
  username: "api-user",
  password: "api-password",
  webhookUrl: "https://your-site.example.com/api/webhook/chat",
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "0770000000"
  }
});

await chat.sendMessage("Need help with my order");

chat.onReply((message) => {
  console.log(message.agentName, message.message);
});
```

## Backend contract

SDK posts to:

```text
POST /api/external/webchat/receive-message
```

Payload fields match `ExternalMessageRequestDto` in `dwesk-backend`:

```ts
{
  companyId: number;
  source: "webchat";
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
```

## Webhook bridge

Dwesk agent replies are sent by backend to company `webChatWebhookUrl`. Browser receives replies through server-sent events.

If Dwesk backend is not on the same machine, click `Start Tunnel` in the demo. It uses the bundled npm `ngrok` package to open local port `3000`, fills the public URL, and shows the exact `Dwesk company webhook` URL to copy into Dwesk company settings. No global ngrok install is required. Token source is `NGROK_AUTHTOKEN` from the demo `.env`.

Run local bridge:

```bash
bun examples/server/server.ts
```

Routes:

```text
POST /api/webhook/chat
GET  /api/webhook/chat/events/:sessionId
```

## React example

```bash
cd examples/react
bun install
cp .env.example .env
bun run dev
```

Run bridge in another terminal:

```bash
bun ../../examples/server/server.ts
```

## Development

```bash
bun install
bun test
bun run typecheck
bun run build
```
