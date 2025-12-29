import React from 'react';
import ChatWidget from './ChatWidget';

function App() {
  const chatConfig = {
    crmUrl: 'https://your-crm.com',
    companyId: 123,
    username: 'your-api-username',
    password: 'your-api-password',
    webhookUrl: 'https://yoursite.com/api/webhook/chat',
    customerInfo: {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1234567890'
    },
    pollInterval: 3000,
    debug: true
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <header style={styles.header}>
          <h1 style={styles.title}>Sample Company Website</h1>
          <nav style={styles.nav}>
            <a href="#home" style={styles.navLink}>Home</a>
            <a href="#products" style={styles.navLink}>Products</a>
            <a href="#about" style={styles.navLink}>About</a>
            <a href="#contact" style={styles.navLink}>Contact</a>
          </nav>
        </header>

        <main style={styles.main}>
          <section style={styles.hero}>
            <h2 style={styles.heroTitle}>Welcome to Our Service</h2>
            <p style={styles.heroText}>
              This is a sample page demonstrating the Dwesk WebChat SDK integration.
              The chat widget appears in the bottom right corner of the screen.
            </p>
            <button style={styles.ctaButton}>Get Started</button>
          </section>

          <section style={styles.features}>
            <div style={styles.feature}>
              <h3 style={styles.featureTitle}>Real-time Support</h3>
              <p style={styles.featureText}>
                Connect with our support team instantly through the chat widget.
              </p>
            </div>
            <div style={styles.feature}>
              <h3 style={styles.featureTitle}>Easy Integration</h3>
              <p style={styles.featureText}>
                Simple setup process with minimal configuration required.
              </p>
            </div>
            <div style={styles.feature}>
              <h3 style={styles.featureTitle}>Secure Communication</h3>
              <p style={styles.featureText}>
                All messages are encrypted and securely transmitted to our CRM.
              </p>
            </div>
          </section>

          <section style={styles.info}>
            <h2 style={styles.infoTitle}>Integration Instructions</h2>
            <div style={styles.codeBlock}>
              <pre style={styles.code}>{`import ChatWidget from './ChatWidget';

const config = {
  crmUrl: 'https://your-crm.com',
  companyId: 123,
  username: 'api-user',
  password: 'api-pass',
  webhookUrl: 'https://yoursite.com/webhook'
};

<ChatWidget config={config} />`}</pre>
            </div>
            <p style={styles.infoText}>
              Update the configuration values with your actual CRM credentials
              and webhook URL. The chat widget will appear in the bottom right
              corner of your page.
            </p>
          </section>
        </main>

        <footer style={styles.footer}>
          <p>&copy; 2024 Sample Company. All rights reserved.</p>
        </footer>
      </div>

      <ChatWidget config={chatConfig} />
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px'
  },
  header: {
    padding: '20px 0',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '40px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px'
  },
  nav: {
    display: 'flex',
    gap: '24px'
  },
  navLink: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '15px',
    transition: 'color 0.2s'
  },
  main: {
    paddingBottom: '60px'
  },
  hero: {
    textAlign: 'center',
    padding: '60px 0',
    marginBottom: '60px'
  },
  heroTitle: {
    fontSize: '42px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px'
  },
  heroText: {
    fontSize: '18px',
    color: '#6b7280',
    maxWidth: '600px',
    margin: '0 auto 32px',
    lineHeight: '1.6'
  },
  ctaButton: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '14px 32px',
    fontSize: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '32px',
    marginBottom: '60px'
  },
  feature: {
    padding: '24px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  featureTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px'
  },
  featureText: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.6'
  },
  info: {
    marginBottom: '60px'
  },
  infoTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '24px'
  },
  codeBlock: {
    backgroundColor: '#1f2937',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    overflow: 'auto'
  },
  code: {
    color: '#f3f4f6',
    fontSize: '14px',
    fontFamily: 'monospace',
    margin: 0
  },
  infoText: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.6'
  },
  footer: {
    borderTop: '1px solid #e5e7eb',
    padding: '24px 0',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px'
  }
};

export default App;