/**
 * Dwesk WebChat SDK
 * Browser client for Dwesk CRM integration.
 */

class DweskWebChatSDK {
  constructor(config) {
    // Basic setup: merge defaults for polling and debug mode
    this.config = {
      crmUrl: config.crmUrl,
      companyId: config.companyId,
      username: config.username,
      password: config.password,
      webhookUrl: config.webhookUrl,
      customerInfo: config.customerInfo || {},
      pollInterval: config.pollInterval || 3000,
      debug: config.debug || false
    };

    this.sessionId = null;
    this.queueId = null;
    this.polling = false;
    this.pollTimer = null;
    this.messageCallbacks = [];
    this.errorCallbacks = [];
    
    this._log('SDK initialized', this.config);
  }

  /**
   * Dispatches text messages. Triggers polling automatically if not already active.
   */
  async sendMessage(message, metadata = {}) {
    try {
      const payload = {
        companyId: this.config.companyId,
        customerName: this.config.customerInfo.name,
        customerEmail: this.config.customerInfo.email,
        customerPhone: this.config.customerInfo.phone,
        message: message,
        sessionId: this.sessionId,
        ipAddress: await this._getIPAddress(),
        userAgent: navigator.userAgent,
        metadata: JSON.stringify(metadata)
      };

      const response = await this._makeRequest('/api/external/webchat/receive-message', payload);
      
      if (response.status === 1) {
        // Sync session/queue IDs from the server response
        this.sessionId = response.sessionId;
        this.queueId = response.queueId;
        
        // Start looking for agent replies once the first message is out
        if (!this.polling) {
          this._startPolling();
        }
        
        this._log('Message sent successfully', response);
        return response;
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      this._handleError('sendMessage', error);
      throw error;
    }
  }

  /**
   * Uploads file as base64. 
   * Note: Large files may hit payload limits depending on CRM config.
   */
  async sendFile(file, message = '') {
    try {
      const base64 = await this._fileToBase64(file);
      
      const payload = {
        companyId: this.config.companyId,
        customerName: this.config.customerInfo.name,
        customerEmail: this.config.customerInfo.email,
        customerPhone: this.config.customerInfo.phone,
        message: message,
        sessionId: this.sessionId,
        fileBase64: base64,
        fileName: file.name,
        fileType: file.type,
        ipAddress: await this._getIPAddress(),
        userAgent: navigator.userAgent
      };

      const response = await this._makeRequest('/api/external/webchat/receive-message', payload);
      
      if (response.status === 1) {
        this.sessionId = response.sessionId;
        this.queueId = response.queueId;
        
        if (!this.polling) {
          this._startPolling();
        }
        
        this._log('File sent successfully', response);
        return response;
      } else {
        throw new Error(response.message || 'Failed to send file');
      }
    } catch (error) {
      this._handleError('sendFile', error);
      throw error;
    }
  }

  /**
   * Subscriber for incoming agent messages.
   */
  onReply(callback) {
    if (typeof callback === 'function') {
      this.messageCallbacks.push(callback);
      this._log('Reply callback registered');
    }
  }

  /**
   * Subscriber for SDK/Network errors.
   */
  onError(callback) {
    if (typeof callback === 'function') {
      this.errorCallbacks.push(callback);
      this._log('Error callback registered');
    }
  }

  getSessionId() {
    return this.sessionId;
  }

  getQueueId() {
    return this.queueId;
  }

  /**
   * Cleanup: kills polling and clears timers.
   */
  disconnect() {
    this._stopPolling();
    this._log('SDK disconnected');
  }

  /**
   * Manual fetch for new messages. 
   * Useful if the developer wants to bypass the internal poll loop.
   */
  async checkForReplies() {
    if (!this.sessionId || !this.config.webhookUrl) {
      return;
    }

    try {
      const pollUrl = `${this.config.webhookUrl}/messages/${this.sessionId}`;
      const response = await fetch(pollUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach(msg => {
            this._triggerReplyCallbacks(msg);
          });
        }
      }
    } catch (error) {
      // Don't bubble up poll errors to the main UI to avoid spamming the user
      if (this.config.debug) {
        console.error('Poll error:', error);
      }
    }
  }

  // Private: Handles Basic Auth and JSON posting
  async _makeRequest(endpoint, data) {
    const url = `${this.config.crmUrl}${endpoint}`;
    const authHeader = 'Basic ' + btoa(`${this.config.username}:${this.config.password}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // Strip prefix from DataURL to get raw base64 string
  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; 
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Helper to tag customer location/identity
  async _getIPAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  _startPolling() {
    if (this.polling) return;
    
    this.polling = true;
    this._poll();
    this._log('Started polling for replies');
  }

  _stopPolling() {
    this.polling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this._log('Stopped polling');
  }

  /**
   * Recursive poll loop using setTimeout instead of setInterval 
   * to prevent overlapping requests on slow networks.
   */
  async _poll() {
    if (!this.polling) return;

    await this.checkForReplies();

    if (this.polling) {
      this.pollTimer = setTimeout(() => this._poll(), this.config.pollInterval);
    }
  }

  _triggerReplyCallbacks(message) {
    this._log('Received reply', message);
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in reply callback:', error);
      }
    });
  }

  _handleError(context, error) {
    this._log(`Error in ${context}:`, error);
    this.errorCallbacks.forEach(callback => {
      try {
        callback({ context, error });
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });
  }

  _log(...args) {
    if (this.config.debug) {
      console.log('[DweskWebChat]', ...args);
    }
  }
}

// Export for both Node/Webpack and direct browser usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DweskWebChatSDK;
}

if (typeof window !== 'undefined') {
  window.DweskWebChatSDK = DweskWebChatSDK;
}