# Dwesk WebChat SDK

Bun-first TypeScript SDK for sending customer web chat messages to `dwesk-backend` and streaming agent replies back to the browser over SSE.

---

## Quick install (testers)

**macOS / Linux / WSL:**

```bash
curl -fsSL https://raw.githubusercontent.com/rayanweragala/dwesk-webchat-sdk/master/install.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/rayanweragala/dwesk-webchat-sdk/master/install.ps1 | iex
```

The installer will ask for:
- External API URL
- Company ID
- Username & password
- Customer name, email, phone

That's it. No ngrok tokens, no bridge URLs — the UI handles the rest.

After install, run:

```bash
# macOS / Linux
dwesk-webchat

# Windows — double-click the Desktop shortcut, or run:
dwesk-webchat.bat
```

Then open **http://localhost:5173**.

---

## Demo UI

The React demo is a full-page dark-theme chat testing interface:

- **Sidebar** — customer profile, live session status, message stats
- **Chat area** — full-height message thread with send/receive bubbles
- **⚙ Configuration modal** — API URL, company ID, credentials, tunnel toggle, customer details
- **⚡ Debug panel** — live SDK events, slide-in from the right, expandable per entry

The tunnel (Start / Stop) is inside the configuration modal. When active, the ready-to-use webhook URL appears with a one-click copy button. Nothing ngrok-specific is shown to testers.

---

## SDK usage

```bash
bun add dwesk-webchat-sdk
```

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

chat.onReply((msg) => {
  console.log(msg.agentName, msg.message);
});
```

---

## Webhook bridge

Agent replies from `dwesk-backend` are pushed to the company `webChatWebhookUrl`. The local bridge (`examples/server/server.ts`) receives them and streams them to the browser over SSE.

Run the bridge manually:

```bash
bun examples/server/server.ts
```

Routes:

```
POST /api/webhook/chat
GET  /api/webhook/chat/events/:sessionId
GET  /api/tunnel/status
POST /api/tunnel/start
POST /api/tunnel/stop
```

---

## Backend contract

SDK posts to:

```
POST /api/external/webchat/receive-message
```

Payload matches `ExternalMessageRequestDto`:

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

---

## Run the React example manually

```bash
# Terminal 1 — bridge
bun examples/server/server.ts

# Terminal 2 — UI
cd examples/react
cp .env.example .env   # fill in your values
bun install
bun run dev
```

---

## Development

```bash
bun install
bun test
bun run typecheck
bun run build
```
