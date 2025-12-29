import React, { useState, useEffect, useRef } from 'react';
import DweskWebChatSDK from 'dwesk-webchat-sdk';

const ChatWidget = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!chatRef.current) {
      try {
        chatRef.current = new DweskWebChatSDK(config);
        
        chatRef.current.onReply((message) => {
          setAgentTyping(false);
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: message.message,
            sender: 'agent',
            agentName: message.agentName,
            timestamp: message.timestamp,
            attachmentUrl: message.attachmentUrl
          }]);
        });

        chatRef.current.onError((error) => {
          console.error('Chat error:', error);
        });

        setIsConnected(true);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    }

    return () => {
      if (chatRef.current) {
        chatRef.current.disconnect();
      }
    };
  }, [config]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending || !chatRef.current) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    setMessages(prev => [...prev, {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    }]);

    try {
      await chatRef.current.sendMessage(messageText);
      setAgentTyping(true);
      setTimeout(() => setAgentTyping(false), 30000);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !chatRef.current) return;

    setIsSending(true);

    try {
      await chatRef.current.sendFile(file);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Sent file: ${file.name}`,
        sender: 'user',
        timestamp: new Date().toISOString(),
        isFile: true
      }]);
      setAgentTyping(true);
      setTimeout(() => setAgentTyping(false), 30000);
    } catch (error) {
      console.error('Failed to send file:', error);
    } finally {
      setIsSending(false);
      e.target.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={styles.chatButton}
        aria-label="Open chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <div style={styles.headerContent}>
          <div style={styles.headerTitle}>Support Chat</div>
          <div style={styles.headerStatus}>
            {isConnected && (
              <>
                <span style={styles.statusDot}></span>
                <span style={styles.statusText}>Online</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={styles.closeButton}
          aria-label="Close chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={styles.messagesContainer}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <p>Start a conversation with our support team</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              ...styles.messageWrapper,
              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                ...styles.message,
                ...(message.sender === 'user' ? styles.userMessage : styles.agentMessage)
              }}
            >
              {message.sender === 'agent' && message.agentName && (
                <div style={styles.agentName}>{message.agentName}</div>
              )}
              <div style={styles.messageText}>{message.text}</div>
              {message.attachmentUrl && (
                <div style={styles.attachment}>
                  <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer">
                    View attachment
                  </a>
                </div>
              )}
              <div style={styles.messageTime}>{formatTime(message.timestamp)}</div>
            </div>
          </div>
        ))}

        {agentTyping && (
          <div style={styles.typingIndicator}>
            <div style={styles.typingDot}></div>
            <div style={styles.typingDot}></div>
            <div style={styles.typingDot}></div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputContainer}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={styles.fileInput}
          disabled={isSending}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={styles.attachButton}
          disabled={isSending}
          aria-label="Attach file"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          style={styles.input}
          disabled={isSending}
        />
        <button
          onClick={handleSend}
          style={{
            ...styles.sendButton,
            ...((!inputValue.trim() || isSending) && styles.sendButtonDisabled)
          }}
          disabled={!inputValue.trim() || isSending}
          aria-label="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const styles = {
  chatButton: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
    zIndex: 1000
  },
  chatContainer: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '380px',
    height: '600px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  chatHeader: {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '16px',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerContent: {
    flex: 1
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '4px'
  },
  headerStatus: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    opacity: 0.9
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    marginRight: '6px'
  },
  statusText: {
    fontSize: '13px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
    transition: 'opacity 0.2s'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    backgroundColor: '#f9fafb'
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6b7280',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px'
  },
  messageWrapper: {
    display: 'flex',
    marginBottom: '12px'
  },
  message: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: '1.4'
  },
  userMessage: {
    backgroundColor: '#2563eb',
    color: 'white',
    borderBottomRightRadius: '4px'
  },
  agentMessage: {
    backgroundColor: 'white',
    color: '#1f2937',
    borderBottomLeftRadius: '4px',
    border: '1px solid #e5e7eb'
  },
  agentName: {
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '4px',
    color: '#6b7280'
  },
  messageText: {
    wordWrap: 'break-word'
  },
  messageTime: {
    fontSize: '11px',
    marginTop: '4px',
    opacity: 0.7
  },
  attachment: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)'
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '10px 14px',
    backgroundColor: 'white',
    borderRadius: '12px',
    width: 'fit-content',
    border: '1px solid #e5e7eb'
  },
  typingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#9ca3af',
    animation: 'typing 1.4s infinite'
  },
  inputContainer: {
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '8px',
    backgroundColor: 'white',
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px'
  },
  fileInput: {
    display: 'none'
  },
  attachButton: {
    background: 'none',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    transition: 'all 0.2s'
  },
  input: {
    flex: 1,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  sendButton: {
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    transition: 'background-color 0.2s'
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  }
};

export default ChatWidget;