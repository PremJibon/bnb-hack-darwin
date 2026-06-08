"use client";

import { useEffect, useState, useCallback } from "react";
import { PriceTicker } from "./components/PriceTicker";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { MEVShield } from "./components/MEVShield";
import { ArbitrageScanner } from "./components/ArbitrageScanner";
import { GasMonitor } from "./components/GasMonitor";
import { DarwinThought } from "./components/DarwinThought";
import { DrawdownMeter } from "./components/DrawdownMeter";
import { MarketOverview } from "./components/MarketOverview";
import { PortfolioChart } from "./components/PortfolioChart";
import { GeneEvolutionChart } from "./components/GeneEvolutionChart";
import { GeneLeaderboard } from "./components/GeneLeaderboard";
import { TradeLog } from "./components/TradeLog";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { ApiKeyVault } from "./components/ApiKeyVault";

interface DarwinState {
  portfolio_usd: number;
  portfolio_peak_usd: number;
  portfolio_start_of_day_usd: number;
  portfolio_history?: number[];
  current_drawdown_pct: number;
  open_positions: any[];
  total_trades: number;
  generation: number;
  gene_scores: Record<string, number>;
  genes: Record<string, any>;
  market_snapshot?: any;
  last_decision: any;
  trade_log: any[];
  last_tick: string;
  evolution_history: any[];
  msaf1_telemetry?: any;
  msaf1_strategy?: any;
  msaf1_risk_tier?: string;
  shield_status?: any;
  risk_shield?: any;
  arbitrage_opportunities?: any[];
  [key: string]: any;
}

const GIST_ID = process.env.NEXT_PUBLIC_GIST_ID || "";
const REFRESH_INTERVAL = 30_000;

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatNum(n: number, d = 2) { return n.toLocaleString(undefined, {minimumFractionDigits: d, maximumFractionDigits: d}); }
function formatUsd(n: number) { return n >= 1000 ? `$${(n/1000).toFixed(1)}K` : `$${n.toFixed(2)}`; }

// Mock positions for demo when none exist
const MOCK_POSITIONS = [
  { pair: "BNB/USDT", type: "Long", leverage: 5, entry: 620.40, mark: 634.80, pnl: 72.00, pnlPct: 14.4 },
  { pair: "ETH/USDT", type: "Short", leverage: 3, entry: 3420.00, mark: 3385.50, pnl: 34.50, pnlPct: 3.4 },
];

// Mock matrix data
const MOCK_MATRIX = [
  { sym: "BTC/USDT", price: 68420.00, change: 1240.00, changePct: 1.85, weight: 75 },
  { sym: "ETH/USDT", price: 3385.50, change: -42.30, changePct: -1.23, weight: 60 },
  { sym: "BNB/USDT", price: 634.80, change: 14.40, changePct: 2.32, weight: 90 },
  { sym: "SOL/USDT", price: 145.20, change: -3.80, changePct: -2.55, weight: 45 },
  { sym: "LINK/USDT", price: 18.45, change: 1.12, changePct: 6.46, weight: 30 },
];

// Mock AI terminal lines
const MOCK_AI_LOG = [
  { ts: "14:32:01", level: "info", text: "Agent Engine: Initializing MSAF-1 Sandman protocol..." },
  { ts: "14:32:02", level: "success", text: "n8n Webhook: Received market data payload (200 OK)" },
  { ts: "14:32:03", level: "info", text: "Analysis: Volatility spike detected on <hl>BNB/USDT</hl> (σ=2.4%)" },
  { ts: "14:32:04", level: "warn", text: "MEV Shield: Gas anomaly detected — 22.4 gwei (avg: 8.1)" },
  { ts: "14:32:05", level: "info", text: "Strategy: Mempool Congestion Dislocation — variance <vl>1.8%</vl> on BNB" },
  { ts: "14:32:06", level: "success", text: "Signal: <hl>ARBITRAGE_SWAP</hl> — BNB/USDT spread: <vp>+2.4%</vp> — confidence: <vp>87%</vp>" },
];

export default function Dashboard() {
  const [state, setState] = useState<DarwinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [aiLog, setAiLog] = useState(MOCK_AI_LOG);
  const [aiLineIdx, setAiLineIdx] = useState(0);

  const fetchState = useCallback(async () => {
    try {
      if (!GIST_ID) { setError("NEXT_PUBLIC_GIST_ID not set"); setLoading(false); return; }
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const gist = await res.json();
      const content = gist.files?.["darwin_state.json"]?.content;
      if (content) setState(JSON.parse(content));
      setLoading(false);
    } catch (e: any) { setError(e.message); setLoading(false); }
  }, []);

  // Stream AI terminal logs progressively
  useEffect(() => {
    if (aiLineIdx < MOCK_AI_LOG.length) {
      const timer = setTimeout(() => { setAiLineIdx(i => i + 1); }, 1800);
      return () => clearTimeout(timer);
    }
  }, [aiLineIdx]);

  useEffect(() => {
    fetchState();
    const fi = setInterval(fetchState, REFRESH_INTERVAL);
    const ci = setInterval(() => { setCountdown(p => p <= 1 ? REFRESH_INTERVAL / 1000 : p - 1); }, 1000);
    return () => { clearInterval(fi); clearInterval(ci); };
  }, [fetchState]);

  if (loading) return <LoadingSkeleton />;
  if (error || !state) return (
    <div className="container" style={{ paddingTop: 120, textAlign: "center" }}>
      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        <div style={{
          width: 56, height: 56, margin: "0 auto 16px",
          background: "var(--red-dim)", color: "var(--red)",
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)",
        }}>!</div>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Dashboard Offline</h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>{error || "No state data available."}</p>
        <button className="table-action" onClick={fetchState} style={{ padding: "6px 16px" }}>Retry Connection</button>
      </div>
    </div>
  );

  const decision = state.last_decision;
  const ph = state.portfolio_history || [state.portfolio_usd];
  const pnl = state.portfolio_start_of_day_usd > 0
    ? ((state.portfolio_usd - state.portfolio_start_of_day_usd) / state.portfolio_start_of_day_usd) * 100
    : 0;
  const winRate = state.total_trades > 0
    ? ((state.trade_log?.filter((t: any) => t.pnl_pct > 0).length || 0) / state.total_trades) * 100
    : 0;
  const positions = state.open_positions?.length > 0
    ? state.open_positions.map((p: any) => ({
        pair: p.token + "/USDT",
        type: p.direction || "Long",
        leverage: p.leverage || 1,
        entry: p.entry_price || 0,
        mark: p.current_price || p.entry_price || 0,
        pnl: p.pnl_usd || 0,
        pnlPct: p.pnl_pct || 0,
      }))
    : MOCK_POSITIONS;

  const matrixTokens = MOCK_MATRIX;
  const tier = state.msaf1_risk_tier || "NORMAL";

  return (
    <div className="container">
      {/* ===== GLOBAL HEADER BAR ===== */}
      <header className="global-header">
        <div className="global-header-left">
          <div className="brand-logo">
            <span className="logo-symbol">Y</span>
            <span>YOLO_BOAT</span>
            <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 12, marginLeft: 2 }}>/ MSAF-1</span>
          </div>
          <span className="header-badge active">
            <span className="dot dot-green" /> Agent: Active
          </span>
          <span className="header-badge">
            <span className="dot dot-blue" /> Binance Futures
          </span>
          <span className="ping-badge">Ping: {Math.floor(8 + Math.random() * 5)}ms</span>
        </div>
        <div className="global-header-right">
          <NotificationsPanel state={state} />
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {timeAgo(state.last_tick)}
          </span>
          <button className="btn-notif" onClick={fetchState} title="Refresh" style={{ fontSize: 10, padding: "4px 8px" }}>
            &#x21bb; {countdown}s
          </button>
          <button className="kill-switch" onClick={() => alert("EMERGENCY KILL — All positions would be closed.")}>
            ⚡ Kill Switch
          </button>
        </div>
      </header>

      {/* ===== PRICE TICKER ===== */}
      <PriceTicker />

      {/* ===== STATS BAR ===== */}
      <section className="stats-bar">
        <div className="stat-block">
          <span className="stat-block-label">Portfolio Value</span>
          <span className="stat-block-value">${formatNum(state.portfolio_usd, 2)}</span>
          <span className={`stat-block-change ${pnl >= 0 ? "up" : "down"}`}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}% today
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-block-label">24h Net P&L</span>
          <span className="stat-block-value" style={{ color: pnl >= 0 ? "var(--green)" : "var(--red)" }}>
            {pnl >= 0 ? "+" : ""}${formatNum(state.portfolio_usd - state.portfolio_start_of_day_usd, 2)}
          </span>
          <span className={`stat-block-change ${pnl >= 0 ? "up" : "down"}`}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-block-label">Win Rate</span>
          <span className="stat-block-value" style={{ color: winRate >= 60 ? "var(--green)" : winRate >= 40 ? "var(--yellow)" : "var(--red)" }}>
            {winRate.toFixed(1)}%
          </span>
          <span className="stat-block-change neutral">{state.total_trades} trades · {state.generation} gens</span>
        </div>
        <div className="stat-block">
          <span className="stat-block-label">Active Bots</span>
          <span className="stat-block-value" style={{ color: "var(--neon-blue)" }}>
            2 / 4
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6, fontWeight: 400 }}>
              {state.open_positions.length} positions
            </span>
          </span>
          <span className="stat-block-change" style={{ color: tier === "CRITICAL_SHIELD" ? "var(--red)" : tier === "LEVEL_2" ? "var(--yellow)" : tier === "LEVEL_1" ? "#f97316" : "var(--green)" }}>
            Shield: {tier}
          </span>
        </div>
      </section>

      {/* ===== MATRIX GRID: LIVE MONITOR + AI ENGINE ===== */}
      <section className="matrix-grid">
        {/* Live Matrix Monitor */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <span className="accent-dot" style={{ background: "var(--neon-blue)" }} />
              Live Matrix Monitor
            </span>
            <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Real-time
            </span>
          </div>
          {matrixTokens.map((t, i) => (
            <div key={i} className="matrix-item">
              <span className="matrix-symbol">{t.sym}</span>
              <div className="matrix-bar-wrap">
                <div className="matrix-bar-fill" style={{
                  width: `${t.weight}%`,
                  background: t.change >= 0 ? "var(--green)" : "var(--red)",
                }}>
                  <div className="matrix-bar-pulse" style={{
                    background: t.change >= 0 ? "var(--green)" : "var(--red)",
                  }} />
                </div>
              </div>
              <span className="matrix-price">${t.price.toLocaleString()}</span>
              <span className={`matrix-pnl ${t.change >= 0 ? "pos" : "neg"}`}>
                {t.change >= 0 ? "+" : ""}{t.changePct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>

        {/* AI Intelligence Engine */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <span className="accent-dot" style={{ background: "var(--violet)" }} />
              Agent Intelligence Engine
            </span>
            <span style={{ fontSize: 9, color: "var(--violet)", fontFamily: "var(--font-mono)" }}>
              {state.msaf1_strategy?.action || "IDLE"}
            </span>
          </div>
          <div className="ai-terminal">
            {aiLog.slice(0, aiLineIdx + 1).map((line, i) => (
              <span key={i} className="ai-line">
                <span className="timestamp">[{line.ts}]</span>{" "}
                <span className={`level-${line.level}`}>[{line.level.toUpperCase()}]</span>{" "}
                {line.text.split(/(<hl>.*?<\/hl>|<vl>.*?<\/vl>|<vp>.*?<\/vp>)/g).map((seg, j) => {
                  if (seg.startsWith("<hl>")) return <span key={j} className="highlight">{seg.slice(4, -5)}</span>;
                  if (seg.startsWith("<vl>")) return <span key={j} className="value-down">{seg.slice(4, -5)}</span>;
                  if (seg.startsWith("<vp>")) return <span key={j} className="value-up">{seg.slice(4, -5)}</span>;
                  return seg;
                })}
              </span>
            ))}
            {aiLineIdx < MOCK_AI_LOG.length && <span className="cursor-blink" />}
            {state.msaf1_strategy?.rationale && aiLineIdx >= MOCK_AI_LOG.length && (
              <span className="ai-line" style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <span className="level-info">[SANDBOX]</span> {state.msaf1_strategy.rationale}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ===== WORKFLOW TELEMETRY ===== */}
      <div className="workflow-bar">
        <div className="workflow-step status-ok">
          <span className="step-dot" style={{ background: "var(--green)" }} />
          <span className="step-label">n8n Instance</span>
          <span className="step-status">Connected</span>
        </div>
        <span className="workflow-arrow">→</span>
        <div className="workflow-step status-ok">
          <span className="step-dot" style={{ background: "var(--green)" }} />
          <span className="step-label">Webhook</span>
          <span className="step-status">Received</span>
        </div>
        <span className="workflow-arrow">→</span>
        <div className="workflow-step status-ok">
          <span className="step-dot" style={{ background: "var(--green)" }} />
          <span className="step-label">Gemini LLM</span>
          <span className="step-status">Strategy Ready</span>
        </div>
        <span className="workflow-arrow">→</span>
        <div className="workflow-step status-ok">
          <span className="step-dot" style={{ background: "var(--green)" }} />
          <span className="step-label">Exchange</span>
          <span className="step-status">Executing</span>
        </div>
        <span className="workflow-arrow">→</span>
        <div className={`workflow-step ${state.msaf1_risk_tier === "CRITICAL_SHIELD" ? "status-err" : "status-ok"}`}>
          <span className="step-dot" style={{
            background: state.msaf1_risk_tier === "CRITICAL_SHIELD" ? "var(--red)" : "var(--green)"
          }} />
          <span className="step-label">Kill Switch</span>
          <span className="step-status">{state.msaf1_risk_tier === "CRITICAL_SHIELD" ? "TRIGGERED" : "Armed"}</span>
        </div>
      </div>

      {/* ===== POSITION TRACKER ===== */}
      <section className="section">
        <div className="section-header">
          <h2>Real-Time Order Book &amp; Position Tracker</h2>
          <span className="sub">{positions.length} active positions</span>
        </div>
        <div className="card">
          <div className="position-table-wrap">
            <table className="position-table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Type</th>
                  <th>Leverage</th>
                  <th>Entry Price</th>
                  <th>Mark Price</th>
                  <th>Unrealized P&amp;L</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, i) => {
                  const isProfitable = pos.pnl >= 0;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{pos.pair}</td>
                      <td><span className={`position-type ${pos.type.toLowerCase()}`}>{pos.type}</span></td>
                      <td>
                        <div className="lev-bar">
                          <div className="lev-fill" style={{
                            width: `${Math.min((pos.leverage / 20) * 100, 100)}%`,
                            background: pos.leverage > 10 ? "var(--red)" : "var(--neon-blue)",
                          }} />
                        </div>
                        <span className="lev-text">{pos.leverage}x</span>
                      </td>
                      <td>{formatUsd(pos.entry)}</td>
                      <td style={{ color: isProfitable ? "var(--green)" : "var(--red)" }}>
                        {formatUsd(pos.mark)}
                      </td>
                      <td>
                        <span style={{ color: isProfitable ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                          {isProfitable ? "+" : ""}{formatUsd(pos.pnl)} ({isProfitable ? "+" : ""}{pos.pnlPct.toFixed(1)}%)
                        </span>
                      </td>
                      <td>
                        <button className="table-action" style={{ marginRight: 4 }}>Pause</button>
                        <button className="table-action danger">Kill</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== MID GRID: MEV Shield + Arbitrage + Gas ===== */}
      <section className="mid-grid">
        <MEVShield shield={state.shield_status || null} drawdown={state.risk_shield || null} />
        <ArbitrageScanner opportunities={state.arbitrage_opportunities || []} telemetry={state.msaf1_telemetry || null} />
        <GasMonitor
          currentGas={state.shield_status?.gas_gwei || 5}
          gasHistory={state.msaf1_telemetry?.gas_gwei_avg ? [{gwei: state.msaf1_telemetry.gas_gwei_avg, ts: Date.now()}] : []}
          gasSpike={state.shield_status?.gas_spike || false}
          gasCritical={state.shield_status?.gas_critical || false}
        />
      </section>

      {/* ===== DRAWDOWN + DARWIN'S THOUGHT + MARKET ===== */}
      <section className="mid-grid">
        <div className="card">
          <div className="card-header" style={{ marginBottom: 4, paddingBottom: 4, borderBottom: "none" }}>
            <span className="card-title">Drawdown Meter</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{
              fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)",
              color: state.current_drawdown_pct > 20 ? "var(--red)" : state.current_drawdown_pct > 15 ? "var(--yellow)" : "var(--green)"
            }}>{state.current_drawdown_pct.toFixed(1)}%</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>/ 27% max</span>
          </div>
          <div className="dd-meter">
            <div className="dd-fill" style={{
              width: `${Math.min((state.current_drawdown_pct / 27) * 100, 100)}%`,
              background: state.current_drawdown_pct > 20 ? "var(--red)" : state.current_drawdown_pct > 15 ? "var(--yellow)" : "var(--green)"
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--text-muted)", marginTop: 2 }}>
            <span>0%</span>
            <span>15%</span>
            <span>22%</span>
            <span>27% limit</span>
          </div>
        </div>

        <DarwinThought
          thought={decision?.darwin_thought || ""}
          decision={state.msaf1_strategy?.action || decision?.decision || "HOLD"}
          confidence={decision?.confidence || 0}
          gene={decision?.gene || "MSAF1"}
          token={decision?.token || "—"}
          reasoning={state.msaf1_strategy?.rationale || decision?.reasoning || ""}
        />

        <MarketOverview market={state.market_snapshot || null} openPositions={state.open_positions} />
      </section>

      {/* ===== PORTFOLIO + GENE CHARTS ===== */}
      <section className="matrix-grid">
        <PortfolioChart history={ph} peak={state.portfolio_peak_usd} />
        <GeneEvolutionChart history={[]} />
      </section>

      {/* ===== GENE TOURNAMENT ===== */}
      {state.genes && Object.keys(state.genes).length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>Gene Tournament</h2>
            <span className="sub">4 strategies competing · winner executes</span>
          </div>
          <GeneLeaderboard genes={state.genes} scores={state.gene_scores} />
        </section>
      )}

      {/* ===== TRADE HISTORY ===== */}
      <section className="section">
        <div className="section-header">
          <h2>Trade History</h2>
          <span className="sub">Last {Math.min(state.trade_log?.length || 0, 50)} trades</span>
        </div>
        <TradeLog trades={state.trade_log} />
      </section>

      {/* ===== API KEY VAULT ===== */}
      <ApiKeyVault />

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div>MSAF-1 — The Sandman: MEV-Shield &amp; Arbitrage-Frontrunner</div>
        <div className="footer-links">
          <span>BNB HACK 2026</span>
          <span>Best Use of TWAK</span>
          <span>OpenClawCash</span>
          <a href="https://github.com/PremJibon/bnb-hack-darwin" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
