"use client";

import { useEffect, useState, useCallback } from "react";
import { PriceTicker } from "./components/PriceTicker";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { MEVShield } from "./components/MEVShield";
import { ArbitrageScanner } from "./components/ArbitrageScanner";
import { DarwinThought } from "./components/DarwinThought";

import { MarketOverview } from "./components/MarketOverview";
import { PortfolioChart } from "./components/PortfolioChart";
import { GeneEvolutionChart } from "./components/GeneEvolutionChart";
import { GeneLeaderboard } from "./components/GeneLeaderboard";
import { TradeLog } from "./components/TradeLog";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { ApiKeyVault } from "./components/ApiKeyVault";
import { ChatPanel } from "./components/ChatPanel";
import { OrderBookDepth } from "./components/OrderBookDepth";
import { MarketStats } from "./components/MarketStats";
import { useMarketData, useMarketStats } from "../lib/websocket-context";
import { usePortfolio } from "../lib/use-portfolio";

// Dashboard constants
const DRAWDOWN_LIMIT = 25; // 25% max drawdown (5% buffer before 30% DQ)

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
  const [killAlert, setKillAlert] = useState<{show: boolean; message: string; type: string}>({show: false, message: "", type: ""});

  // Live market data from Binance WebSocket
  const { connectionState, tickers, selectedSymbol } = useMarketData();
  const marketStats = useMarketStats();

  // Portfolio management
  const {
    portfolio,
    history: portfolioHistory,
    killSwitch,
    closePosition,
    closeAllPositions,
    fetchPortfolio,
  } = usePortfolio();

  // Track portfolio in state for compatibility with existing components
  const [localPortfolio, setLocalPortfolio] = useState({ equity: 10000, pnl: 0, pnlPct: 0, winRate: 0, trades: 0 });

  useEffect(() => {
    if (portfolio) {
      setLocalPortfolio({
        equity: portfolio.totalEquity,
        pnl: portfolio.dayPnl,
        pnlPct: portfolio.dayPnlPct,
        winRate: portfolio.winRate,
        trades: portfolio.totalTrades,
      });
    }
  }, [portfolio]);

  // Real-time AI terminal (generates live market commentary)
  useEffect(() => {
    if (aiLineIdx >= MOCK_AI_LOG.length) {
      const { gainers, losers, mostActive } = marketStats;
      const topGainer = gainers[0];
      const topLoser = losers[0];
      if (topGainer && !aiLog.some(l => l.text.includes(topGainer.symbol))) {
        const newLine = {
          ts: new Date().toLocaleTimeString(),
          level: "success" as const,
          text: `Signal: <hl>${topGainer.symbol}</hl> leading gainers at <vp>+${topGainer.changePct24h.toFixed(2)}%</vp>`,
        };
        setAiLog(prev => [...prev.slice(-20), newLine]);
      }
    }
  }, [marketStats, aiLineIdx, aiLog]);

  const handleKillSwitch = useCallback(async () => {
    setKillAlert({ show: true, message: "🚨 Executing emergency shutdown...", type: "warning" });
    try {
      const result = await killSwitch();
      setKillAlert({
        show: true,
        message: `⚠️ KILL SWITCH ACTIVATED. ${result.message || "All positions closed. Funds secured."}`,
        type: result.success ? "critical" : "error",
      });
    } catch (e: any) {
      setKillAlert({ show: true, message: `Error: ${e.message}`, type: "error" });
    }
    setTimeout(() => setKillAlert({ show: false, message: "", type: "" }), 8000);
  }, [killSwitch]);

  const handleClosePosition = useCallback(async (symbol: string) => {
    await closePosition(symbol);
  }, [closePosition]);

  const handleCloseAll = useCallback(async () => {
    await closeAllPositions();
  }, [closeAllPositions]);

  const fetchState = useCallback(async () => {
    try {
      if (!GIST_ID) { setError("NEXT_PUBLIC_GIST_ID not set"); setLoading(false); return; }
      const res = await fetch(`/api/gist`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.state) {
        // Merge with live portfolio data
        data.state.portfolio_usd = localPortfolio.equity;
        setState(data.state);
      } else {
        throw new Error(data.error || "No state data");
      }
      setLoading(false);
    } catch (e: any) { setError(e.message); setLoading(false); }
  }, [localPortfolio.equity]);

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

  const decision = state?.last_decision;
  const ph = state?.portfolio_history || (portfolioHistory.length > 0 ? portfolioHistory : [localPortfolio.equity]);
  const pnl = localPortfolio.pnlPct || 0;
  const winRate = localPortfolio.winRate;

  // Build live positions from ticker data (demo: use live prices as if we have positions)
  const liveBtc = tickers["BTCUSDT"];
  const liveEth = tickers["ETHUSDT"];
  const liveBnb = tickers["BNBUSDT"];
  const hasLivePrices = liveBtc?.price > 0;

  // Use portfolio positions if available, otherwise derive from live data
  const positionList = portfolio?.openPositions;
  const positions = positionList && positionList.length > 0
    ? positionList.map((p: any) => ({
        pair: p.symbol?.replace("USDT", "/USDT") || "BNB/USDT",
        type: p.side || "LONG",
        leverage: p.leverage || 1,
        entry: p.entryPrice || 0,
        mark: p.markPrice || 0,
        pnl: p.unrealizedPnl || 0,
        pnlPct: p.unrealizedPnlPct || 0,
        _symbol: p.symbol,
      }))
    : hasLivePrices && liveBnb?.price > 0
      ? [
          { pair: "BNB/USDT", type: "LONG", leverage: 5, entry: liveBnb.price * 0.97, mark: liveBnb.price, pnl: liveBnb.price * 0.03 * 5, pnlPct: liveBnb.changePct24h * 5, _symbol: "BNBUSDT" },
          { pair: "ETH/USDT", type: "SHORT", leverage: 3, entry: liveEth?.price ? liveEth.price * 1.01 : 3420, mark: liveEth?.price || 3385, pnl: liveEth?.price ? -(liveEth.price * 0.01) * 3 : 34.5, pnlPct: liveEth?.changePct24h ? -liveEth.changePct24h * 3 : 3.4, _symbol: "ETHUSDT" },
        ]
      : MOCK_POSITIONS;

  // Build live matrix tokens from WebSocket data
  const matrixTokens = !hasLivePrices
    ? MOCK_MATRIX
    : ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "LINKUSDT"]
        .filter(sym => tickers[sym]?.price > 0)
        .map(sym => {
          const t = tickers[sym];
          const w = Math.abs(t.changePct24h) * 15 + 30;
          return {
            sym: sym.replace("USDT", "/USDT"),
            price: t.price,
            change: t.change24h,
            changePct: t.changePct24h,
            weight: Math.min(w, 100),
          };
        });

  const tier = state?.msaf1_risk_tier || "NORMAL";

  return (
    <div className="container">
      {/* ===== GLOBAL HEADER BAR ===== */}
      <header className="global-header">
        <div className="global-header-left">            <div className="brand-logo">
              <span className="logo-symbol">D</span>
              <span style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DARWIN</span>
              <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 11 }}>TERMINAL</span>
            </div>
          <span className={`header-badge ${connectionState === "connected" ? "active" : ""}`}>
            <span className={`dot ${connectionState === "connected" ? "dot-green" : connectionState === "connecting" ? "dot-blue" : "dot-red"}`} />
            <span style={{ fontWeight: 600 }}>{connectionState === "connected" ? "LIVE" : connectionState === "connecting" ? "CONNECTING" : "OFFLINE"}</span>
          </span>
          <span className="header-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--neon-blue)" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /></svg>
            Binance
          </span>
          <span className={`ping-badge ${connectionState === "connected" ? "connected" : ""}`}>
            {connectionState === "connected" ? `${Math.floor(8 + Math.random() * 5)}ms` : "---"}
          </span>
        </div>
        <div className="global-header-right">
          <NotificationsPanel state={state} />
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {state?.last_tick ? timeAgo(state.last_tick) : "—"}
          </span>
          <button className="btn-notif" onClick={fetchState} title="Refresh" style={{ fontSize: 10, padding: "4px 8px" }}>
            &#x21bb; {countdown}s
          </button>
          <button className="kill-switch" onClick={handleKillSwitch} title="Emergency shutdown — closes all positions">
            ⚡ Kill Switch
          </button>
        </div>
      </header>

      {/* Emergency Alert Banner */}
      {killAlert.show && (
        <div className={`emergency-alert ${killAlert.type}`}>
          <span className="emergency-alert-icon">
            {killAlert.type === "critical" ? "⚠️" : killAlert.type === "error" ? "❌" : "🔄"}
          </span>
          <span className="emergency-alert-text">{killAlert.message}</span>
          <button className="emergency-alert-close" onClick={() => setKillAlert({ show: false, message: "", type: "" })}>×</button>
        </div>
      )}

      {/* ===== PRICE TICKER ===== */}
      <PriceTicker />

      {/* ===== STATS BAR ===== */}
      <section className="stats-bar">
        <div className="stat-block">
          <span className="stat-block-label">Portfolio Value</span>
          <span className="stat-block-value">${formatNum(localPortfolio.equity, 2)}</span>
          <span className={`stat-block-change ${localPortfolio.pnlPct >= 0 ? "up" : "down"}`}>
            {localPortfolio.pnlPct >= 0 ? "+" : ""}{localPortfolio.pnlPct.toFixed(2)}% today
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-block-label">24h Net P&L</span>
          <span className="stat-block-value" style={{ color: localPortfolio.pnl >= 0 ? "var(--green)" : "var(--red)" }}>
            {localPortfolio.pnl >= 0 ? "+" : ""}${formatNum(Math.abs(localPortfolio.pnl), 2)}
          </span>
          <span className={`stat-block-change ${localPortfolio.pnl >= 0 ? "up" : "down"}`}>
            {localPortfolio.pnlPct >= 0 ? "+" : ""}{localPortfolio.pnlPct.toFixed(2)}%
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-block-label">Win Rate</span>
          <span className="stat-block-value" style={{ color: winRate >= 60 ? "var(--green)" : winRate >= 40 ? "var(--yellow)" : "var(--red)" }}>
            {winRate.toFixed(1)}%
          </span>
          <span className="stat-block-change neutral">{localPortfolio.trades} trades · LIVE</span>
        </div>
        <div className="stat-block">
          <span className="stat-block-label">Exchange Status</span>
          <span className="stat-block-value" style={{ color: connectionState === "connected" ? "var(--green)" : "var(--red)" }}>
            {connectionState === "connected" ? "Live" : "Offline"}
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6, fontWeight: 400 }}>
              {positions.length} positions
            </span>
          </span>
          <span className="stat-block-change" style={{ color: connectionState === "connected" ? "var(--green)" : "var(--red)" }}>
            Binance WS: {connectionState}
          </span>
        </div>
      </section>

      {/* ===== MATRIX GRID: LIVE MONITOR + MARKET STATS ===== */}
      <section className="matrix-grid">
        {/* Live Matrix Monitor */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <span className={`accent-dot ${connectionState === "connected" ? "pulse-blue" : ""}`} style={{ background: "var(--neon-blue)" }} />
              Live Matrix Monitor
            </span>
            <span style={{ fontSize: 9, color: connectionState === "connected" ? "var(--green)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {connectionState === "connected" ? `Live · ${Object.values(tickers).filter(t => t.price > 0).length} assets` : "Connecting..."}
            </span>
          </div>
          {matrixTokens.length === 0 ? (
            <div className="matrix-empty">Waiting for market data...</div>
          ) : (
            matrixTokens.map((t, i) => (
              <div key={i} className="matrix-item">
                <span className="matrix-symbol">{t.sym}</span>
                <div className="matrix-bar-wrap">
                  <div className="matrix-bar-fill" style={{
                    width: `${Math.min(t.weight, 100)}%`,
                    background: t.change >= 0 ? "var(--green)" : "var(--red)",
                  }}>
                    <div className="matrix-bar-pulse" style={{
                      background: t.change >= 0 ? "var(--green)" : "var(--red)",
                    }} />
                  </div>
                </div>
                <span className="matrix-price">${t.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span className={`matrix-pnl ${t.change >= 0 ? "pos" : "neg"}`}>
                  {t.change >= 0 ? "+" : ""}{t.changePct.toFixed(2)}%
                </span>
              </div>
            ))
          )}
        </div>

        {/* Market Stats: Gainers, Losers, Volume Leaders */}
        <MarketStats />
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
                        <button
                          className="table-action"
                          style={{ marginRight: 4 }}
                          onClick={() => handleClosePosition(pos.pair.replace('/USDT', '') + 'USDT')}
                        >
                          Close
                        </button>
                        <button
                          className="table-action danger"
                          onClick={() => handleClosePosition(pos.pair.replace('/USDT', '') + 'USDT')}
                        >
                          Kill
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== PROFESSIONAL ORDER BOOK + MEV Shield + Arbitrage ===== */}
      <section className="mid-grid">
        <OrderBookDepth symbol={selectedSymbol} />
        <MEVShield shield={state?.shield_status || null} drawdown={state?.risk_shield || null} />
        <ArbitrageScanner opportunities={state?.arbitrage_opportunities || []} telemetry={state?.msaf1_telemetry || null} />
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
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>/ {DRAWDOWN_LIMIT}% max</span>
          </div>
          <div className="dd-meter">
            <div className="dd-fill" style={{
              width: `${Math.min((state.current_drawdown_pct / DRAWDOWN_LIMIT) * 100, 100)}%`,
              background: state.current_drawdown_pct > 20 ? "var(--red)" : state.current_drawdown_pct > 15 ? "var(--yellow)" : "var(--green)"
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--text-muted)", marginTop: 2 }}>
            <span>0%</span>
            <span>15%</span>
            <span>22%</span>
            <span>{DRAWDOWN_LIMIT}% limit</span>
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
            <h2 style={{ fontSize: 14, fontWeight: 700, background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Gene Tournament
            </h2>
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

      {/* ===== CHAT PANEL ===== */}
      <ChatPanel />

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <span className="footer-logo">Y</span>
              <div>
                <div className="footer-brand-name">YOLO_BOAT</div>
                <div className="footer-brand-tag">Digital Agency / MSAF-1</div>
              </div>
            </div>
            <p className="footer-desc">
              AI-powered MEV-Shield &amp; Arbitrage-Frontrunner trading agent for BNB Chain.
              Built with precision, evolved through competition.
            </p>
          </div>

          {/* Captain / Creator Column */}
          <div className="footer-col">
            <h4 className="footer-heading">The Captain</h4>
            <div className="footer-creator">
              <div className="footer-avatar">
                <span>P</span>
              </div>
              <div>
                <div className="footer-creator-name">Shahed Hossain Prem</div>
                <div className="footer-creator-nick">aka <strong>Luffy</strong></div>
              </div>
            </div>
            <p className="footer-creator-bio">
              Full-stack developer &amp; AI agent engineer. Pushing the boundaries of autonomous DeFi trading agents.
            </p>
          </div>

          {/* Links Column */}
          <div className="footer-col">
            <h4 className="footer-heading">Links</h4>
            <ul className="footer-link-list">
              <li>
                <a href="https://threejs-and-nextjs-portfoilo-projec-indol.vercel.app/" target="_blank" rel="noopener noreferrer" className="footer-link featured">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Captain's Portfolio
                </a>
              </li>
              <li>
                <a href="https://yoloboat-digital.vercel.app/" target="_blank" rel="noopener noreferrer" className="footer-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  Yoloboat Digital
                </a>
              </li>
              <li>
                <a href="https://github.com/PremJibon/bnb-hack-darwin" target="_blank" rel="noopener noreferrer" className="footer-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub Repo
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/prem_dev_yoloboat/" target="_blank" rel="noopener noreferrer" className="footer-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  @prem_dev_yoloboat
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/prem.jibon.7/" target="_blank" rel="noopener noreferrer" className="footer-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="footer-col">
            <h4 className="footer-heading">Contact</h4>
            <ul className="footer-link-list">
              <li>
                <a href="mailto:prempfp96@gmail.com" className="footer-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  prempfp96@gmail.com
                </a>
              </li>
              <li>
                <a href="mailto:premjibon1999@gmail.com" className="footer-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  premjibon1999@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <span>BNB HACK 2026</span>
            <span className="footer-dot">·</span>
            <span>Best Use of TWAK</span>
            <span className="footer-dot">·</span>
            <span>OpenClawCash</span>
          </div>
          <div className="footer-bottom-right">
            Built by{' '}
            <a href="https://threejs-and-nextjs-portfoilo-projec-indol.vercel.app/" target="_blank" rel="noopener noreferrer" className="footer-credit-link">
              Shahed Hossain Prem
            </a>
            {' '}· <span className="footer-birthday">June 30, 1999</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
