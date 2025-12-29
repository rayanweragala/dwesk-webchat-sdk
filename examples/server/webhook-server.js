const express = require('express');
const cors = require('cors');
const DweskWebhookServer = require('../../dist/webhook-server');

const app = express();
const PORT = process.env.PORT || 3000;

const webhookServer = new DweskWebhookServer({
  maxMessagesPerSession: 100,
  messageExpiry: 3600000,
  debug: true
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/webhook/chat', webhookServer.receiveWebhook());

app.get('/api/webhook/chat/messages/:sessionId', webhookServer.pollMessages());

app.get('/api/webhook/chat/stats', (req, res) => {
  res.json(webhookServer.getStats());
});

app.delete('/api/webhook/chat/session/:sessionId', (req, res) => {
  webhookServer.clearSession(req.params.sessionId);
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    stats: webhookServer.getStats()
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, () => {
  console.log('Webhook server running on port ' + PORT);
  console.log('Webhook URL: http://localhost:' + PORT + '/api/webhook/chat');
});

process.on('SIGINT', () => process.exit(0));