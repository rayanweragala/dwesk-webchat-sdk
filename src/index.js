/**
 * Dwesk WebChat SDK
 */

class DweskWebChatSDK {
  constructor(config) {
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
   * Send text message
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

      const response = await this._makeRequest(
        '/api/external/webchat/receive-message', 
        payload
      );
      
      if (response.status === 1) {
        this.sessionId = response.sessionId;
        this.queueId = response.queueId;
        
        if (!this.polling) {
          this._startPolling();
        }
        
        this._log('Message sent, sessionId:', this.sessionId);
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
   * Send file with optional text message
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

      const response = await this._makeRequest(
        '/api/external/webchat/receive-message', 
        payload
      );
      
      if (response.status === 1) {
        this.sessionId = response.sessionId;
        this.queueId = response.queueId;
        
        if (!this.polling) {
          this._startPolling();
        }
        
        this._log('File sent, sessionId:', this.sessionId);
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
   * Subscribe to incoming agent replies
   */
  onReply(callback) {
    if (typeof callback === 'function') {
      this.messageCallbacks.push(callback);
      this._log('Reply callback registered');
    }
  }

  /**
   * Subscribe to errors
   */
  onError(callback) {
    if (typeof callback === 'function') {
      this.errorCallbacks.push(callback);
      this._log('Error callback registered');
    }
  }

  /**
   * Get current session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Get current queue ID
   */
  getQueueId() {
    return this.queueId;
  }

  /**
   * Stop polling and cleanup
   */
  disconnect() {
    this._stopPolling();
    this._log('SDK disconnected');
  }

  /**
   * Manual check for new messages
   */
  async checkForReplies() {
    if (!this.sessionId || !this.config.webhookUrl) {
      this._log('Cannot poll: missing sessionId or webhookUrl');
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
          this._log(`Received ${data.messages.length} new messages`);
          
          data.messages.forEach(msg => {
            if (msg.attachment) {
              msg.attachmentUrl = this._base64ToBlob(
                msg.attachment.base64,
                msg.attachment.type
              );
              msg.attachmentName = msg.attachment.name;
            }
            
            this._triggerReplyCallbacks(msg);
          });
        }
      } else {
        this._log('Poll returned non-OK status:', response.status);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Poll error:', error);
      }
    }
  }

  /**
   * Convert base64 to Blob URL for display
   */
  _base64ToBlob(base64, mimeType) {
    try {
      const byteCharacters = atob(base64);
      const byteArrays = [];

      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays.push(byteCharacters.charCodeAt(i));
      }

      const byteArray = new Uint8Array(byteArrays);
      const blob = new Blob([byteArray], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (error) {
      this._log('Error converting base64 to blob:', error);
      return null;
    }
  }

  /**
   * Make authenticated request to CRM
   */
  async _makeRequest(endpoint, data) {
    const url = `${this.config.crmUrl}${endpoint}`;
    const authHeader = 'Basic ' + btoa(
      `${this.config.username}:${this.config.password}`
    );

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

  /**
   * Convert File to base64 string
   */
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

  /**
   * Get customer IP address
   */
  async _getIPAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Start polling loop
   */
  _startPolling() {
    if (this.polling) return;
    
    this.polling = true;
    this._poll();
    this._log('Started polling for sessionId:', this.sessionId);
  }

  /**
   * Stop polling loop
   */
  _stopPolling() {
    this.polling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this._log('Stopped polling');
  }

  /**
   * Recursive poll with setTimeout
   */
  async _poll() {
    if (!this.polling) return;

    await this.checkForReplies();

    if (this.polling) {
      this.pollTimer = setTimeout(
        () => this._poll(), 
        this.config.pollInterval
      );
    }
  }

  /**
   * Trigger all registered reply callbacks
   */
  _triggerReplyCallbacks(message) {
    this._log('Received reply:', message);
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in reply callback:', error);
      }
    });
  }

  /**
   * Trigger all registered error callbacks
   */
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DweskWebChatSDK;
}

if (typeof window !== 'undefined') {
  window.DweskWebChatSDK = DweskWebChatSDK;
}