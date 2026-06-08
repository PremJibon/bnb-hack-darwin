"use client";

import { useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  exchange: string;
  publicKey: string;
  secretKey: string;
  permissions: { read: boolean; trade: boolean; withdraw: boolean };
  status: "active" | "paused";
  createdAt: string;
}

const EXCHANGES = ["Binance Futures", "Bybit Derivatives", "Alpaca Markets", "dYdX L2"];

export function ApiKeyVault() {
  const [keys, setKeys] = useState<ApiKey[]>([
    { id: "1", name: "Binance Futures Main", exchange: "Binance Futures", publicKey: "ak_live_51Nx...8m9p", secretKey: "secret_live_99f...77za", permissions: { read: true, trade: true, withdraw: false }, status: "active", createdAt: "2026-05-12" },
    { id: "2", name: "Bybit Arbitrage Sub", exchange: "Bybit Derivatives", publicKey: "ak_live_34za...22kl", secretKey: "secret_live_44qq...11xx", permissions: { read: true, trade: true, withdraw: false }, status: "paused", createdAt: "2026-06-01" },
  ]);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState({ name: "", exchange: EXCHANGES[0], trade: true, withdraw: false });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleStatus = (id: string) =>
    setKeys(keys.map(k => k.id === id ? { ...k, status: k.status === "active" ? "paused" : "active" } : k));

  const deleteKey = (id: string) =>
    setKeys(keys.filter(k => k.id !== id));

  const createKey = (e: React.FormEvent) => {
    e.preventDefault();
    const k: ApiKey = {
      id: Date.now().toString(),
      name: newKey.name || "Untitled Key",
      exchange: newKey.exchange,
      publicKey: "ak_live_" + Math.random().toString(36).slice(2, 8) + "...vault",
      secretKey: "secret_live_" + Math.random().toString(36).slice(2, 12) + "...vault",
      permissions: { read: true, trade: newKey.trade, withdraw: newKey.withdraw },
      status: "active",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setKeys([...keys, k]);
    setShowCreate(false);
    setNewKey({ name: "", exchange: EXCHANGES[0], trade: true, withdraw: false });
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>API Key Management Vault</h2>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Securely encrypt and route API authorizations. Keys are isolated in hardware-security-module simulation.</p>
        </div>
        <button className="kill-switch" style={{ borderColor: "var(--violet)", color: "var(--violet)", fontSize: 10, whiteSpace: "nowrap" }}
                onClick={() => setShowCreate(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Connect Exchange API
        </button>
      </div>

      {/* Security Banner */}
      <div style={{ display: "flex", gap: 10, padding: "8px 12px", background: "var(--yellow-dim)", border: "1px solid rgba(255,214,0,0.3)", borderRadius: "var(--radius-sm)", marginBottom: 14, fontSize: 11, color: "var(--yellow)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <strong>Security Guardrail Active</strong> — API secrets encrypted at rest using AES-256-GCM. Never share raw execution outputs publicly.
        </div>
      </div>

      {/* Table */}
      <div className="position-table-wrap">
        <table className="position-table">
          <thead>
            <tr>
              <th style={{ width: "25%" }}>Credential Details</th>
              <th style={{ width: "28%" }}>Public API Key</th>
              <th style={{ width: "18%" }}>Scoped Capabilities</th>
              <th style={{ width: "12%" }}>Status</th>
              <th style={{ width: "17%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(key => (
              <tr key={key.id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)" }}>{key.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--neon-blue)" strokeWidth="2" style={{ display: "inline" }}>
                      <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    {key.exchange} &middot; Added {key.createdAt}
                  </div>
                </td>
                <td>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-surface)", padding: "3px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>
                    <span>{revealId === key.id ? key.secretKey : key.publicKey}</span>
                    <span style={{ borderLeft: "1px solid var(--border)", paddingLeft: 6, display: "flex", gap: 2 }}>
                      <button onClick={() => setRevealId(revealId === key.id ? null : key.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, lineHeight: 0 }}
                              title="Reveal secret">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {revealId === key.id
                            ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                            : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                          }
                        </svg>
                      </button>
                      <button onClick={() => handleCopy(key.id, key.publicKey)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, lineHeight: 0 }}
                              title="Copy key">
                        {copiedId === key.id
                          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        }
                      </button>
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <span className="badge badge-buy" style={{ fontSize: 8, padding: "1px 5px" }}>Read</span>
                    {key.permissions.trade && <span className="badge" style={{ fontSize: 8, padding: "1px 5px", background: "var(--violet-dim)", color: "var(--violet)" }}>Trade</span>}
                    {key.permissions.withdraw
                      ? <span className="badge badge-sell" style={{ fontSize: 8, padding: "1px 5px" }}>Withdraw</span>
                      : <span className="badge badge-none" style={{ fontSize: 8, padding: "1px 5px" }}>No-Withdraw</span>
                    }
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => toggleStatus(key.id)}
                            style={{
                              width: 28, height: 16, borderRadius: 8, border: "none", cursor: "pointer", position: "relative",
                              background: key.status === "active" ? "rgba(0,200,83,0.3)" : "var(--border)",
                              transition: "background var(--transition-fast)",
                            }}>
                      <span style={{
                        position: "absolute", top: 2, width: 12, height: 12, borderRadius: "50%",
                        background: key.status === "active" ? "var(--green)" : "var(--text-muted)",
                        left: key.status === "active" ? 14 : 2, transition: "left var(--transition-fast)",
                        boxShadow: key.status === "active" ? "0 0 4px var(--green)" : "none",
                      }} />
                    </button>
                    <span style={{ fontSize: 10, fontWeight: 600, color: key.status === "active" ? "var(--green)" : "var(--text-muted)" }}>
                      {key.status === "active" ? "Running" : "Offline"}
                    </span>
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="table-action" title="Rotate" style={{ padding: "2px 6px", fontSize: 9, marginRight: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", verticalAlign: "middle" }}>
                      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </button>
                  <button className="table-action danger" onClick={() => deleteKey(key.id)} title="Delete" style={{ padding: "2px 6px", fontSize: 9 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", verticalAlign: "middle" }}>
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 12 }}>
                No exchange access configured. Connect an API to let strategies execute transactions.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={() => setShowCreate(false)}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
            padding: 24, maxWidth: 440, width: "90%", boxShadow: "var(--shadow-elevated)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Secure Key Integration</h3>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>
              Provide your exchange API credentials. Never grant unrestricted permissions unless required.
            </p>
            <form onSubmit={createKey}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Key Identifier Name</label>
                <input value={newKey.name} onChange={e => setNewKey({...newKey, name: e.target.value})}
                       placeholder="e.g., Grid Trading Bot Sub-Account"
                       style={{
                         width: "100%", padding: "8px 10px", fontSize: 12, background: "var(--bg-surface)",
                         border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
                         fontFamily: "var(--font-sans)",
                       }} required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Exchange Provider</label>
                <select value={newKey.exchange} onChange={e => setNewKey({...newKey, exchange: e.target.value})}
                        style={{
                          width: "100%", padding: "8px 10px", fontSize: 12, background: "var(--bg-surface)",
                          border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
                        }}>
                  {EXCHANGES.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
              </div>

              {/* Permissions */}
              <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: 12, marginBottom: 16 }}>
                <h4 style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 10 }}>Set Strategy Scopes</h4>
                {/* Read (always on) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div><div style={{ fontSize: 12, fontWeight: 600 }}>Read / Telemetry</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Balance and position fetching</div></div>
                  <span className="badge badge-buy" style={{ fontSize: 9 }}>Required</span>
                </div>
                {/* Trade */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <div><div style={{ fontSize: 12, fontWeight: 600 }}>Trade Execution</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Open/close leverage orders</div></div>
                  <button type="button" onClick={() => setNewKey({...newKey, trade: !newKey.trade})}
                          style={{
                            width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", position: "relative",
                            background: newKey.trade ? "var(--violet-dim)" : "var(--border)",
                          }}>
                    <span style={{
                      position: "absolute", top: 2, width: 14, height: 14, borderRadius: "50%",
                      background: newKey.trade ? "var(--violet)" : "var(--text-muted)",
                      left: newKey.trade ? 16 : 2, transition: "left var(--transition-fast)",
                    }} />
                  </button>
                </div>
                {/* Withdraw */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)" }}>Capital Withdrawal</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>&#9888;&#65039; Risk: Permits moving off-exchange funds</div></div>
                  <button type="button" onClick={() => setNewKey({...newKey, withdraw: !newKey.withdraw})}
                          style={{
                            width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", position: "relative",
                            background: newKey.withdraw ? "var(--red-dim)" : "var(--border)",
                          }}>
                    <span style={{
                      position: "absolute", top: 2, width: 14, height: 14, borderRadius: "50%",
                      background: newKey.withdraw ? "var(--red)" : "var(--text-muted)",
                      left: newKey.withdraw ? 16 : 2, transition: "left var(--transition-fast)",
                    }} />
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="table-action" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="kill-switch" style={{ borderColor: "var(--violet)", color: "var(--violet)", background: "var(--violet-dim)" }}>
                  Save &amp; Encrypt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
