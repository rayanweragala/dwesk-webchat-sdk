import React from "react";
import ChatWidget from "./ChatWidget";

const chatConfig = {
  crmUrl: import.meta.env.VITE_CRM_URL,
  companyId: Number(import.meta.env.VITE_COMPANY_ID),
  username: import.meta.env.VITE_DWESK_USERNAME,
  password: import.meta.env.VITE_DWESK_PASSWORD,
  webhookUrl: "http://localhost:3000/api/webhook/chat",
};

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <header style={styles.header}>
          <h1 style={styles.title}>Dwesk Chat Integration</h1>
        </header>

        <main style={styles.main}>
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Current Configuration</h2>
            <div style={styles.configGrid}>
              <div style={styles.configRow}>
                <span style={styles.label}>CRM URL:</span>
                <code style={styles.value}>{chatConfig.crmUrl}</code>
              </div>
              <div style={styles.configRow}>
                <span style={styles.label}>Company ID:</span>
                <code style={styles.value}>{chatConfig.companyId}</code>
              </div>
              <div style={styles.configRow}>
                <span style={styles.label}>Webhook:</span>
                <code style={styles.value}>{chatConfig.webhookUrl}</code>
              </div>
              <div style={styles.configRow}>
                <span style={styles.label}>Debug:</span>
                <code style={styles.value}>{chatConfig.debug ? 'true' : 'false'}</code>
              </div>
            </div>
            <p style={styles.note}>
              Check browser console for API requests and responses
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Message Flow</h2>
            <div style={styles.flow}>
              <div style={styles.flowItem}>
                <strong>1. Send Message</strong>
                <code style={styles.code}>
                  POST {chatConfig.crmUrl}/api/external/webchat/receive-message
                </code>
              </div>
              <div style={styles.flowItem}>
                <strong>2. Backend Receives</strong>
                <code style={styles.code}>
                  @PostMapping("/external/webchat/receive-message")
                </code>
              </div>
              <div style={styles.flowItem}>
                <strong>3. Poll for Replies</strong>
                <code style={styles.code}>
                  GET {chatConfig.webhookUrl}/messages/[sessionId]
                </code>
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Request Payload</h2>
            <pre style={styles.pre}>{`{
  "companyId": ${chatConfig.companyId},
  "customerName": "${chatConfig.customerInfo.name}",
  "customerEmail": "${chatConfig.customerInfo.email}",
  "customerPhone": "${chatConfig.customerInfo.phone}",
  "message": "User message text",
  "sessionId": null,
  "ipAddress": "auto-detected",
  "userAgent": "auto-detected",
  "metadata": "{}"
}`}</pre>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Expected Response</h2>
            <pre style={styles.pre}>{`{
  "status": 1,
  "message": "Message received successfully",
  "queueId": 12345,
  "sessionId": "abc-123-xyz"
}`}</pre>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Setup Requirements</h2>
            <ul style={styles.list}>
              <li>Spring Boot backend running on configured port</li>
              <li>CORS enabled for frontend origin</li>
              <li>Basic Auth credentials configured</li>
              <li>Webhook server running for reply polling</li>
            </ul>
          </section>
        </main>
      </div>

      <ChatWidget config={chatConfig} />
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  content: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "20px",
  },
  header: {
    padding: "20px 0",
    borderBottom: "1px solid #ddd",
    marginBottom: "30px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#222",
    margin: 0,
  },
  main: {
    paddingBottom: "60px",
  },
  section: {
    backgroundColor: "white",
    borderRadius: "4px",
    padding: "24px",
    marginBottom: "20px",
    border: "1px solid #ddd",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#222",
    marginTop: 0,
    marginBottom: "16px",
  },
  configGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  configRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  label: {
    fontSize: "14px",
    color: "#666",
    minWidth: "120px",
  },
  value: {
    fontSize: "13px",
    fontFamily: "monospace",
    backgroundColor: "#f5f5f5",
    padding: "4px 8px",
    borderRadius: "3px",
    color: "#333",
  },
  note: {
    fontSize: "13px",
    color: "#666",
    marginTop: "16px",
    marginBottom: 0,
  },
  flow: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  flowItem: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  code: {
    fontSize: "12px",
    fontFamily: "monospace",
    backgroundColor: "#f5f5f5",
    padding: "8px 12px",
    borderRadius: "3px",
    color: "#333",
    display: "block",
    overflowX: "auto",
  },
  pre: {
    fontSize: "12px",
    fontFamily: "monospace",
    backgroundColor: "#282c34",
    color: "#abb2bf",
    padding: "16px",
    borderRadius: "4px",
    overflowX: "auto",
    margin: 0,
  },
  list: {
    fontSize: "14px",
    color: "#444",
    lineHeight: "1.8",
    margin: 0,
    paddingLeft: "20px",
  },
};

export default App;
