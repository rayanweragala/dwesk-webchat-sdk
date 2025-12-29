/**
 * Dwesk WebChat Webhook Server
 * In-memory buffer to bridge CRM webhooks and SDK polling.
 */

class DweskWebhookServer {
  constructor(options = {}) {
    // Stores messages keyed by sessionId: Map<string, Array>
    this.messages = new Map();
    
    // Safety limits to prevent memory exhaustion
    this.maxMessagesPerSession = options.maxMessagesPerSession || 100;
    this.messageExpiry = options.messageExpiry || 3600000; // Default: 1 hour
    this.debug = options.debug || false;
    
    // Periodically prune stale sessions
    setInterval(() => this._cleanupOldMessages(), 60000);
    
    this._log('Webhook server initialized');
  }

  /**
   * Endpoint for the Dwesk CRM to POST replies.
   * Logic: Validates payload, assigns a local ID, and buffers the message.
   */
  receiveWebhook() {
    return (req, res) => {
      try {
        const { sessionId, message, agentName, timestamp, attachmentUrl } = req.body;

        if (!sessionId || !message) {
          return res.status(400).json({ 
            error: 'Missing required fields: sessionId, message' 
          });
        }

        const messageData = {
          id: Date.now() + Math.random(), // Basic unique ID for client-side tracking
          sessionId,
          message,
          agentName: agentName || 'Agent',
          timestamp: timestamp || new Date().toISOString(),
          attachmentUrl: attachmentUrl || null,
          read: false,
          receivedAt: Date.now()
        };

        if (!this.messages.has(sessionId)) {
          this.messages.set(sessionId, []);
        }

        const sessionMessages = this.messages.get(sessionId);
        sessionMessages.push(messageData);

        // Cap the buffer size per session to avoid runaway memory usage
        if (sessionMessages.length > this.maxMessagesPerSession) {
          sessionMessages.shift(); 
        }

        this._log('Webhook received', messageData);

        res.json({ 
          success: true, 
          messageId: messageData.id,
          message: 'Reply received and queued for delivery'
        });

      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  /**
   * Endpoint for the SDK to GET new messages.
   * Logic: Returns unread messages and marks them as read immediately.
   */
  pollMessages() {
    return (req, res) => {
      try {
        const { sessionId } = req.params;

        if (!sessionId) {
          return res.status(400).json({ error: 'Session ID required' });
        }

        const messages = this.messages.get(sessionId) || [];
        const unreadMessages = messages.filter(msg => !msg.read);

        // Atomic-like read update: mark messages so they aren't sent in the next poll
        unreadMessages.forEach(msg => msg.read = true);

        this._log(`Poll request for session ${sessionId}, ${unreadMessages.length} new messages`);

        res.json({ 
          sessionId,
          messages: unreadMessages,
          totalMessages: messages.length
        });

      } catch (error) {
        console.error('Poll error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  /**
   * Returns full history for a session. Useful for debugging or 
   * re-hydrating chat UI on page refresh.
   */
  getAllMessages(sessionId) {
    return this.messages.get(sessionId) || [];
  }

  /**
   * Force removal of a session from memory.
   */
  clearSession(sessionId) {
    this.messages.delete(sessionId);
    this._log(`Session ${sessionId} cleared`);
  }

  /**
   * Returns health/usage metrics of the buffer.
   */
  getStats() {
    const stats = {
      totalSessions: this.messages.size,
      totalMessages: 0,
      unreadMessages: 0
    };

    this.messages.forEach(msgs => {
      stats.totalMessages += msgs.length;
      stats.unreadMessages += msgs.filter(m => !m.read).length;
    });

    return stats;
  }

  /**
   * Loops through Map to drop sessions that haven't seen activity within messageExpiry.
   */
  _cleanupOldMessages() {
    const now = Date.now();
    let cleaned = 0;

    this.messages.forEach((msgs, sessionId) => {
      const validMessages = msgs.filter(msg => 
        (now - msg.receivedAt) < this.messageExpiry
      );

      if (validMessages.length === 0) {
        // Drop the whole session if no messages are fresh
        this.messages.delete(sessionId);
        cleaned++;
      } else if (validMessages.length < msgs.length) {
        // Only keep the fresh ones
        this.messages.set(sessionId, validMessages);
      }
    });

    if (cleaned > 0 && this.debug) {
      this._log(`Cleaned up ${cleaned} expired sessions`);
    }
  }

  _log(...args) {
    if (this.debug) {
      console.log('[DweskWebhook]', ...args);
    }
  }
}

module.exports = DweskWebhookServer;