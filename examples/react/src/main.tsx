import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  RadioTower,
  Save,
  Send,
  Settings,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react";
import {
  DweskWebChatClient,
  type DweskWebChatConfig,
  type IncomingAgentMessage,
  type WebChatDebugEvent,
} from "../../../src";
import "./styles.css";

type DemoConfig = {
  crmUrl: string;
  companyId: string;
  username: string;
  password: string;
  webhookUrl: string;
  publicForwardBaseUrl: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

type UiMessage = {
  id: string;
  from: "customer" | "agent" | "system";
  text: string;
  time: string;
  fileName?: string;
};

type LogEntry = WebChatDebugEvent & { id: string };
type TunnelState = {
  active: boolean;
  url: string | null;
  webhookUrl: string | null;
  error?: string;
};

const defaults: DemoConfig = {
  crmUrl: import.meta.env.VITE_DWESK_CRM_URL ?? "http://localhost:8080",
  companyId: String(import.meta.env.VITE_DWESK_COMPANY_ID ?? "1"),
  username: import.meta.env.VITE_DWESK_USERNAME ?? "",
  password: import.meta.env.VITE_DWESK_PASSWORD ?? "",
  webhookUrl: import.meta.env.VITE_DWESK_WEBHOOK_URL ?? "http://localhost:3000/api/webhook/chat",
  publicForwardBaseUrl: import.meta.env.VITE_DWESK_PUBLIC_FORWARD_URL ?? "",
  customerName: import.meta.env.VITE_DWESK_CUSTOMER_NAME ?? "Demo Customer",
  customerEmail: import.meta.env.VITE_DWESK_CUSTOMER_EMAIL ?? "demo@example.com",
  customerPhone: import.meta.env.VITE_DWESK_CUSTOMER_PHONE ?? "0770000000",
};

function loadConfig(): DemoConfig {
  const saved = localStorage.getItem("dwesk.webchat.demo.config");
  return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
}

function toClientConfig(config: DemoConfig, onDebugEvent: (e: WebChatDebugEvent) => void): DweskWebChatConfig {
  const webhookUrl = replyWebhookUrl(config);
  const cfg: DweskWebChatConfig = {
    crmUrl: config.crmUrl,
    companyId: Number(config.companyId),
    webhookUrl,
    customer: { name: config.customerName, email: config.customerEmail, phone: config.customerPhone },
    onDebugEvent,
  };
  if (config.username) cfg.username = config.username;
  if (config.password) cfg.password = config.password;
  return cfg;
}

function replyWebhookUrl(config: DemoConfig): string {
  const base = config.publicForwardBaseUrl.trim() || config.webhookUrl.trim();
  return base.replace(/\/+$/, "").replace(/\/api\/webhook\/chat$/, "") + "/api/webhook/chat";
}

function tunnelApiUrl(config: DemoConfig, path: string): string {
  return config.webhookUrl.trim().replace(/\/+$/, "").replace(/\/api\/webhook\/chat$/, "") + path;
}

/* ─── Config Modal ─────────────────────────────────────────────────── */
function ConfigModal({
  config, tunnel, tunnelBusy, saved,
  onClose, onChange, onSave, onToggleTunnel,
}: {
  config: DemoConfig; tunnel: TunnelState; tunnelBusy: boolean; saved: boolean;
  onClose: () => void; onChange: (k: keyof DemoConfig, v: string) => void;
  onSave: () => void; onToggleTunnel: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!tunnel.url) return;
    navigator.clipboard.writeText(tunnel.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-hd">
          <div className="modal-hd-icon"><Settings size={17} /></div>
          <div>
            <div className="modal-hd-title">Configuration</div>
            <div className="modal-hd-sub">API, tunnel and customer setup</div>
          </div>
          <button className="modal-x" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-scroll">
          {/* API */}
          <div className="cfg-block">
            <div className="cfg-block-label">API Connection</div>
            <div className="cfg-grid-2">
              <Inp label="External API URL" span={2} value={config.crmUrl} placeholder="https://api.example.com" onChange={v => onChange("crmUrl", v)} />
              <Inp label="Company ID" value={config.companyId} placeholder="1" onChange={v => onChange("companyId", v)} />
              <Inp label="Username" value={config.username} placeholder="username" onChange={v => onChange("username", v)} />
              <Inp label="Password" type="password" value={config.password} placeholder="••••••••" onChange={v => onChange("password", v)} />
            </div>
          </div>

          {/* Tunnel */}
          <div className="cfg-block">
            <div className="cfg-block-label">Tunnel & Webhook</div>
            <div className="tunnel-bar">
              <div className="tunnel-indicator">
                <span className={`tun-dot ${tunnel.active ? "on" : ""}`} />
                <span className="tun-label">{tunnel.active ? "Tunnel Active" : "Tunnel Inactive"}</span>
              </div>
              <button
                className={`tun-btn ${tunnel.active ? "tun-stop" : "tun-start"}`}
                onClick={onToggleTunnel} disabled={tunnelBusy}
              >
                {tunnelBusy ? <Loader2 size={13} className="spin" /> : <RadioTower size={13} />}
                {tunnelBusy ? "Working…" : tunnel.active ? "Stop" : "Start Tunnel"}
              </button>
            </div>
            {tunnel.error && <div className="tun-err">{tunnel.error}</div>}
            
            {tunnel.active && tunnel.url && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <div className="inp-wrap">
                  <span className="inp-label">Public Tunnel URL</span>
                  <div className="tun-url-box">
                    <code className="tun-url-text">{tunnel.url}</code>
                    <button className={`tun-copy ${copied ? "ok" : ""}`} onClick={copy}>
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="inp-wrap">
                  <span className="inp-label">Dwesk Webhook URL (Copy this to external Dwesk app)</span>
                  <div className="tun-url-box">
                    <code className="tun-url-text">{`${tunnel.url.replace(/\/+$/, "")}/api/webhook/chat`}</code>
                    <button 
                      className="tun-copy" 
                      onClick={() => {
                        const webhookUrl = `${tunnel.url!.replace(/\/+$/, "")}/api/webhook/chat`;
                        navigator.clipboard.writeText(webhookUrl);
                        // Briefly change icon to check
                        const btn = document.getElementById('webhook-copy-btn');
                        if (btn) {
                          btn.innerText = 'Copied';
                          setTimeout(() => { btn.innerText = 'Copy'; }, 2000);
                        }
                      }}
                    >
                      <Copy size={13} />
                      <span id="webhook-copy-btn">Copy</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="cfg-block">
            <div className="cfg-block-label">Customer Details</div>
            <div className="cfg-grid-2">
              <Inp label="Name" span={2} value={config.customerName} placeholder="Full name" onChange={v => onChange("customerName", v)} />
              <Inp label="Email" value={config.customerEmail} placeholder="email@example.com" onChange={v => onChange("customerEmail", v)} />
              <Inp label="Phone" value={config.customerPhone} placeholder="+94 77 000 0000" onChange={v => onChange("customerPhone", v)} />
            </div>
          </div>
        </div>

        <div className="modal-ft">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary-sm" onClick={() => { onSave(); onClose(); }}>
            <Save size={14} />{saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Inp({ label, value, type = "text", placeholder, onChange, span }: {
  label: string; value: string; type?: string; placeholder?: string;
  onChange: (v: string) => void; span?: number;
}) {
  return (
    <label className="inp-wrap" style={span ? { gridColumn: `span ${span}` } : {}}>
      <span className="inp-label">{label}</span>
      <input className="inp-field" type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

/* ─── App ───────────────────────────────────────────────────────────── */
function App() {
  const [config, setConfig] = useState<DemoConfig>(loadConfig);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [tunnel, setTunnel] = useState<TunnelState>({ active: false, url: null, webhookUrl: null });
  const [tunnelBusy, setTunnelBusy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [connected, setConnected] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<DweskWebChatClient | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const client = new DweskWebChatClient(
      toClientConfig(config, event =>
        setLogs(prev => [{ ...event, id: crypto.randomUUID() }, ...prev].slice(0, 100))
      )
    );
    client.onReply((reply: IncomingAgentMessage) => {
      setConnected(true);
      setMessages(prev => [...prev, {
        id: reply.id, from: "agent",
        text: reply.message || "Attachment received",
        time: new Date(reply.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        fileName: reply.attachment?.name,
      }]);
    });
    client.onError(({ error }) => {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), from: "system", text: error.message, time: "now" }]);
    });
    chatRef.current = client;
    setConnected(false);
    return () => client.disconnect();
  }, [config]);

  useEffect(() => { void refreshTunnel(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const updateConfig = (k: keyof DemoConfig, v: string) => { setConfig(c => ({ ...c, [k]: v })); setSaved(false); };
  const saveConfig = () => { localStorage.setItem("dwesk.webchat.demo.config", JSON.stringify(config)); setSaved(true); };

  async function sendMessage() {
    const msg = text.trim();
    if (!msg || busy || !chatRef.current) return;
    setText(""); setBusy(true);
    setMessages(prev => [...prev, { id: crypto.randomUUID(), from: "customer", text: msg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    try { await chatRef.current.sendMessage(msg); } finally { setBusy(false); }
  }

  async function sendFile(file: File | undefined) {
    if (!file || busy || !chatRef.current) return;
    setBusy(true);
    setMessages(prev => [...prev, { id: crypto.randomUUID(), from: "customer", text: "File sent", fileName: file.name, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    try { await chatRef.current.sendFile({ file, fileName: file.name, fileType: file.type }); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function refreshTunnel() {
    try {
      const r = await fetch(tunnelApiUrl(config, "/api/tunnel/status"), { cache: "no-store" });
      if (r.ok) setTunnel(await r.json());
    } catch { setTunnel({ active: false, url: null, webhookUrl: null, error: "Bridge unreachable" }); }
  }

  async function toggleTunnel() {
    if (tunnelBusy) return;
    setTunnelBusy(true);
    try {
      const r = await fetch(tunnelApiUrl(config, tunnel.active ? "/api/tunnel/stop" : "/api/tunnel/start"), { method: "POST" });
      const next = await r.json() as TunnelState;
      setTunnel(next);
      if (next.url) { updateConfig("publicForwardBaseUrl", next.url); const u = { ...config, publicForwardBaseUrl: next.url }; localStorage.setItem("dwesk.webchat.demo.config", JSON.stringify(u)); setSaved(true); }
    } finally { setTunnelBusy(false); }
  }

  const initial = config.customerName?.trim()?.[0]?.toUpperCase() ?? "C";
  const sessionId = chatRef.current?.getSessionId();

  return (
    <div className="layout">
      {showConfig && (
        <ConfigModal config={config} tunnel={tunnel} tunnelBusy={tunnelBusy} saved={saved}
          onClose={() => setShowConfig(false)} onChange={updateConfig} onSave={saveConfig} onToggleTunnel={toggleTunnel} />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-mark"><MessageSquare size={18} /></div>
          <span className="brand-name">Dwesk Chat</span>
        </div>

        {/* Customer card */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Customer</div>
          <div className="customer-card">
            <div className="customer-avatar">{initial}</div>
            <div className="customer-info">
              <div className="customer-name">{config.customerName || "—"}</div>
              <div className="customer-meta">
                <Mail size={11} />{config.customerEmail || "—"}
              </div>
              <div className="customer-meta">
                <Phone size={11} />{config.customerPhone || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Session */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Session</div>
          <div className="session-card">
            <div className="session-row">
              <span className="session-key">Status</span>
              <span className={`session-badge ${connected ? "online" : "idle"}`}>
                {connected ? "Connected" : "Ready"}
              </span>
            </div>
            <div className="session-row">
              <span className="session-key">Tunnel</span>
              <span className={`session-badge ${tunnel.active ? "tunnel-on" : "offline"}`}>
                {tunnel.active ? "Active" : "Off"}
              </span>
            </div>
            {sessionId && (
              <div className="session-id-row">
                <span className="session-key">ID</span>
                <code className="session-id">{sessionId.slice(0, 14)}…</code>
              </div>
            )}
          </div>
        </div>

        {/* Messages count */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Stats</div>
          <div className="stats-grid">
            <div className="stat-tile">
              <div className="stat-num">{messages.filter(m => m.from === "customer").length}</div>
              <div className="stat-label">Sent</div>
            </div>
            <div className="stat-tile">
              <div className="stat-num">{messages.filter(m => m.from === "agent").length}</div>
              <div className="stat-label">Received</div>
            </div>
          </div>
        </div>

        {/* Sidebar actions */}
        <div className="sidebar-actions">
          <button className="sidebar-btn" onClick={() => setShowConfig(true)}>
            <Settings size={15} />Configuration
          </button>
          <button className={`sidebar-btn ${showDebug ? "active" : ""}`} onClick={() => setShowDebug(v => !v)}>
            <Activity size={15} />Debug Events
            {logs.length > 0 && <span className="sidebar-badge">{logs.length}</span>}
          </button>
          <button className="sidebar-btn danger" onClick={() => { setMessages([]); setLogs([]); }}>
            <Trash2 size={15} />Clear Session
          </button>
        </div>
      </aside>

      {/* ── MAIN CHAT ── */}
      <main className="chat-main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-avatar">S</div>
            <div>
              <div className="topbar-name">Support Agent</div>
              <div className="topbar-status">
                <span className="status-dot" />
                Online · Ready to assist
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn" onClick={() => setShowConfig(true)} title="Settings">
              <Settings size={16} />
            </button>
            <button className={`topbar-btn ${showDebug ? "pressed" : ""}`} onClick={() => setShowDebug(v => !v)} title="Debug">
              <Zap size={16} />
              {logs.length > 0 && <span className="topbar-badge">{logs.length}</span>}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="messages-wrap">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><MessageSquare size={32} /></div>
              <div className="empty-title">No messages yet</div>
              <div className="empty-sub">Type a message below to start testing the chat integration</div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`msg-row ${msg.from}`}>
              {msg.from === "agent" && <div className="msg-ava agent-ava">S</div>}
              {msg.from === "customer" && <div className="msg-ava cust-ava">{initial}</div>}
              <div className={`bubble ${msg.from}`}>
                {msg.from !== "system" && (
                  <div className="bubble-sender">{msg.from === "agent" ? "Support Agent" : config.customerName}</div>
                )}
                <div className="bubble-text">{msg.text}</div>
                {msg.fileName && (
                  <div className="bubble-file"><Paperclip size={11} />{msg.fileName}</div>
                )}
                <div className="bubble-time">{msg.time}</div>
              </div>
            </div>
          ))}
          {busy && (
            <div className="msg-row agent">
              <div className="msg-ava agent-ava">S</div>
              <div className="bubble agent typing-bubble">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="composer-wrap">
          <input ref={fileRef} type="file" hidden onChange={e => void sendFile(e.target.files?.[0])} />
          <div className="composer-box">
            <button className="composer-attach" onClick={() => fileRef.current?.click()} disabled={busy} title="Attach file">
              <Paperclip size={18} />
            </button>
            <textarea
              className="composer-input"
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
              placeholder="Type a message… (Enter to send)"
              disabled={busy}
            />
            <button className="composer-send" onClick={() => void sendMessage()} disabled={busy || !text.trim()} aria-label="Send">
              {busy ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </div>
          <div className="composer-hint">Press Enter to send · Shift+Enter for new line</div>
        </div>
      </main>

      {/* ── DEBUG PANEL ── */}
      {showDebug && (
        <DebugDrawer
          logs={logs}
          onClear={() => setLogs([])}
          onClose={() => setShowDebug(false)}
        />
      )}
    </div>
  );
}

function DebugDrawer({
  logs,
  onClear,
  onClose,
}: {
  logs: LogEntry[];
  onClear: () => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "request" | "response" | "error" | "sse">("all");
  const [search, setSearch] = useState("");
  const [expandAll, setExpandAll] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const filtered = logs.filter((log) => {
    // Tab filter
    if (filter === "request" && log.type !== "request") return false;
    if (filter === "response" && log.type !== "response") return false;
    if (filter === "error" && log.type !== "error") return false;
    if (filter === "sse" && !log.type.startsWith("sse-")) return false;

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.type.toLowerCase().includes(q) ||
        (log.message && log.message.toLowerCase().includes(q)) ||
        JSON.stringify(log).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const copyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(filtered, null, 2)).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  return (
    <aside className="debug-aside">
      {/* Title / Action bar */}
      <div className="debug-hd">
        <div className="debug-hd-title">
          <Activity size={15} />
          <span>Debug Console</span>
          <span className="debug-count">{filtered.length}</span>
        </div>
        <div className="debug-hd-actions">
          <button
            className={`debug-btn ${expandAll ? "active" : ""}`}
            onClick={() => setExpandAll((v) => !v)}
            title={expandAll ? "Collapse all" : "Expand all"}
          >
            <ChevronDown size={14} style={{ transform: expandAll ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          <button className="debug-btn" onClick={copyAll} title="Copy filtered logs">
            {copiedAll ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <button className="debug-btn" onClick={onClear} title="Clear logs">
            <Trash2 size={13} />
          </button>
          <button className="debug-btn" onClick={onClose} title="Close Panel">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="debug-controls">
        <input
          type="text"
          className="debug-search"
          placeholder="Filter logs by keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="debug-tabs">
          <button className={`debug-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
          <button className={`debug-tab ${filter === "request" ? "active" : ""}`} onClick={() => setFilter("request")}>Reqs</button>
          <button className={`debug-tab ${filter === "response" ? "active" : ""}`} onClick={() => setFilter("response")}>Resps</button>
          <button className={`debug-tab ${filter === "sse" ? "active" : ""}`} onClick={() => setFilter("sse")}>SSE</button>
          <button className={`debug-tab ${filter === "error" ? "active" : ""}`} onClick={() => setFilter("error")}>Errors</button>
        </div>
      </div>

      {/* Log list */}
      <div className="debug-list">
        {filtered.length === 0 ? (
          <div className="debug-empty">
            <Zap size={22} />
            <span>No events match this criteria</span>
          </div>
        ) : (
          filtered.map((log) => (
            <LogCard key={log.id} log={log} forceOpen={expandAll} />
          ))
        )}
      </div>
    </aside>
  );
}

function LogCard({ log, forceOpen }: { log: LogEntry; forceOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOpen(forceOpen);
  }, [forceOpen]);

  const copyItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(log, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Determine indicator color based on log type
  let typeClass = "sse";
  if (log.type === "request") typeClass = "req";
  else if (log.type === "response") typeClass = "resp";
  else if (log.type === "error") typeClass = "err";

  return (
    <div className={`log-card ${typeClass}`}>
      <div className="log-card-hd" onClick={() => setOpen((v) => !v)}>
        <div className="log-card-hd-left">
          <span className={`log-dot ${typeClass}`} />
          <span className="log-type">{log.type}</span>
          {log.context && <span className="log-context">{log.context}</span>}
        </div>
        <div className="log-card-hd-right">
          <time className="log-time">
            {new Date(log.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </time>
          <button className="log-card-copy-btn" onClick={copyItem} title="Copy event JSON">
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
          {open ? <ChevronDown size={13} style={{ transform: "rotate(180deg)", transition: "transform 0.15s" }} /> : <ChevronDown size={13} />}
        </div>
      </div>
      {open && (
        <div className="log-body">
          <pre className="log-pre">{JSON.stringify(log, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
