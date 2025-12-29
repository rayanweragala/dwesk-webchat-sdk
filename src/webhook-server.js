/**
 * Dwesk WebChat Webhook Server
 * Routes agent replies to the correct customer session
 */

class DweskWebhookServer {
  constructor(options = {}) {
    this.messages = new Map();
    
    this.maxMessagesPerSession = options.maxMessagesPerSession || 100;
    this.messageExpiry = options.messageExpiry || 3600000; // 1 hour
    this.debug = options.debug || false;
    
    setInterval(() => this._cleanupOldMessages(), 60000);
    
    this._log('Webhook server initialized');
  }

  /**
   * Endpoint for CRM to POST agent replies
   */
  receiveWebhook() {
    return (req, res) => {
      try {
        const { 
          sessionId, 
          message, 
          agentName, 
          timestamp, 
          attachmentBase64,
          attachmentName,
          attachmentType
        } = req.body;

        if (!sessionId) {
          return res.status(400).json({ 
            error: 'Missing required field: sessionId',
            details: 'SessionId is required to route the message to the correct customer'
          });
        }

        if (!message && !attachmentBase64) {
          return res.status(400).json({ 
            error: 'Missing message content',
            details: 'Either message text or attachment must be provided'
          });
        }

        const messageData = {
          id: Date.now() + Math.random(),
          sessionId,
          message: message || '',
          agentName: agentName || 'Agent',
          timestamp: timestamp || new Date().toISOString(),
          read: false,
          receivedAt: Date.now()
        };

        if (attachmentBase64) {
          messageData.attachment = {
            base64: attachmentBase64,
            name: attachmentName || 'file',
            type: attachmentType || 'application/octet-stream'
          };
        }

        if (!this.messages.has(sessionId)) {
          this.messages.set(sessionId, []);
        }

        const sessionMessages = this.messages.get(sessionId);
        sessionMessages.push(messageData);

        if (sessionMessages.length > this.maxMessagesPerSession) {
          sessionMessages.shift();
        }

        this._log('Webhook received for session:', sessionId, messageData);

        res.json({ 
          success: true, 
          messageId: messageData.id,
          sessionId: sessionId,
          message: 'Reply queued for delivery to customer'
        });

      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ 
          error: 'Internal server error',
          details: error.message 
        });
      }
    };
  }

  /**
   * Endpoint for SDK to poll new messages
   * Returns unread messages for specific sessionId
   */
  pollMessages() {
    return (req, res) => {
      try {
        const { sessionId } = req.params;

        if (!sessionId) {
          return res.status(400).json({ 
            error: 'Session ID required in URL path' 
          });
        }

        const messages = this.messages.get(sessionId) || [];
        const unreadMessages = messages.filter(msg => !msg.read);

        unreadMessages.forEach(msg => msg.read = true);

        this._log(`Poll for session ${sessionId}: ${unreadMessages.length} new messages`);

        res.json({ 
          sessionId,
          messages: unreadMessages,
          totalMessages: messages.length,
          hasMore: false
        });

      } catch (error) {
        console.error('Poll error:', error);
        res.status(500).json({ 
          error: 'Internal server error',
          details: error.message 
        });
      }
    };
  }

  /**
   * Get full message history for a session
   */
  getAllMessages(sessionId) {
    return this.messages.get(sessionId) || [];
  }

  /**
   * Get unread count for a session
   */
  getUnreadCount(sessionId) {
    const messages = this.messages.get(sessionId) || [];
    return messages.filter(msg => !msg.read).length;
  }

  /**
   * Clear a specific session
   */
  clearSession(sessionId) {
    this.messages.delete(sessionId);
    this._log(`Session ${sessionId} cleared`);
  }

  /**
   * Get server statistics
   */
  getStats() {
    const stats = {
      totalSessions: this.messages.size,
      totalMessages: 0,
      unreadMessages: 0,
      sessionDetails: []
    };

    this.messages.forEach((msgs, sessionId) => {
      const unread = msgs.filter(m => !m.read).length;
      stats.totalMessages += msgs.length;
      stats.unreadMessages += unread;
      
      if (this.debug) {
        stats.sessionDetails.push({
          sessionId,
          total: msgs.length,
          unread
        });
      }
    });

    return stats;
  }

  /**
   * Cleanup expired sessions
   */
  _cleanupOldMessages() {
    const now = Date.now();
    let cleaned = 0;

    this.messages.forEach((msgs, sessionId) => {
      const validMessages = msgs.filter(msg => 
        (now - msg.receivedAt) < this.messageExpiry
      );

      if (validMessages.length === 0) {
        this.messages.delete(sessionId);
        cleaned++;
      } else if (validMessages.length < msgs.length) {
        this.messages.set(sessionId, validMessages);
      }
    });

    if (cleaned > 0) {
      this._log(`Cleaned up ${cleaned} expired sessions`);
    }
  }

  _log(...args) {
    if (this.debug) {
      console.log('[DweskWebhook]', new Date().toISOString(), ...args);
    }
  }
}

module.exports = DweskWebhookServer;