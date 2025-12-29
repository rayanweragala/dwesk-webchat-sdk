# Dwesk WebChat SDK

Official JavaScript SDK for connecting web applications to **Dwesk CRM's chat system**.  
This library handles the communication between your frontend and CRM agents.

---

## Features

- Simple integration for any web application
- Real-time messaging with CRM agents
- File and attachment support (Base64)
- Automatic session and queue tracking
- TypeScript definitions included
- Framework agnostic: works with React, Vue, Angular, or Vanilla JS

---

## Installation

### NPM

```bash
npm install dwesk-webchat-sdk
```
### CDN
```html
<script src="https://unpkg.com/dwesk-webchat-sdk/dist/dwesk-webchat.js"></script>
```

---

## Quick Start

### Webhook Server (Node.js / Express)

You need a server-side bridge to receive replies from the CRM and serve them to the browser client via polling.

```javascript
const express = require('express');
const DweskWebhookServer = require('dwesk-webchat-sdk/webhook');

const app = express();
const webhookServer = new DweskWebhookServer();

app.use(express.json());

app.post('/api/webhook/chat', webhookServer.receiveWebhook());
app.get('/api/webhook/chat/messages/:sessionId', webhookServer.pollMessages());

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```
### Browser Client

```javascript
import DweskWebChatSDK from 'dwesk-webchat-sdk';

const chat = new DweskWebChatSDK({
  crmUrl: 'https://your-crm.com',
  companyId: 123,
  username: 'api-user',
  password: 'api-password',
  webhookUrl: 'https://your-api.com/api/webhook/chat',
  customerInfo: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

chat.sendMessage('Hello, I have a question.');

chat.onReply((msg) => {
  console.log('Agent:', msg.agentName);
  console.log('Message:', msg.message);
});
```

---

## API Reference

### Configuration Options

| Option       | Type    | Description                            |
| ------------ | ------- | -------------------------------------- |
| crmUrl       | string  | Base URL of your Dwesk CRM instance    |
| companyId    | number  | Organization ID in the CRM             |
| username     | string  | API username                           |
| password     | string  | API password                           |
| webhookUrl   | string  | Webhook bridge server URL              |
| pollInterval | number  | Polling interval in ms (default: 3000) |
| debug        | boolean | Enable debug logging                   |

### SDK Methods

- sendMessage(text, metadata): Send a message to the CRM
- sendFile(file, message): Upload a file as Base64
- onReply(callback): Listen for agent messages
- onError(callback): Listen for errors
- getSessionId(): Get current session ID
- disconnect(): Stop polling and clean up

---

## Troubleshooting
- CORS: Allow the chat widget domain on the webhook server
- Polling delay: Tune pollInterval as needed
- Auth errors: Verify CRM Basic Auth and permissions