"use client";

import { useEffect, useState, useCallback } from "react";
import { GeneLeaderboard } from "./components/GeneLeaderboard";
import { DrawdownMeter } from "./components/DrawdownMeter";
import { TradeLog } from "./components/TradeLog";
import { DarwinThought } from "./components/DarwinThought";
import { PortfolioChart } from "./components/PortfolioChart";
import { GeneEvolutionChart } from "./components/GeneEvolutionChart";
import { MarketOverview } from "./components/MarketOverview";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { PriceTicker } from "./components/PriceTicker";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { MEVShield } from "./components/MEVShield";
import { ArbitrageScanner } from "./components/ArbitrageScanner";
import { GasMonitor } from "./components/GasMonitor";

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
  gene_scores_history?: Array<{ timestamp: string; scores: Record<string, number> }>;
  genes: Record<string, any>;
  market_snapshot?: any;
  last_decision: any;
  trade_log: any[];
  last_tick: string;
  evolution_history: any[];
  // MSAF-1 fields
  msaf1_telemetry?: {
    detected_dislocation_pct: number;
    current_calculated_drawdown: number;
    risk_tier: string;
    gas_gwei_avg: number;
    mev_attacks_blocked: number;
    total_arb_opportunities: number;
    hours_since_last_trade: number;
  };
  msaf1_strategy?: {
    action: string;
    rationale: string;
  };
  msaf1_risk_tier?: string;
  mev_attacks_blocked?: number;
  arbitrage_opportunities?: any[];
  shield_status?: {
    active: boolean;
    attacks_blocked: number;
    gas_gwei: number;
    gas_spike: boolean;
    gas_critical: boolean;
    sandwich_risk: number;
    status: string;
  };
  risk_shield?: {
    drawdown_pct: number;
    risk_tier: string;
    tier_label: string;
    trade_size_mult: number;
    emergency_exit: boolean;
    max_trade_pct: number;
  };
}

const GIST_ID = process.env.NEXT_PUBLIC_GIST_ID || "";
const REFRESH_INTERVAL = 30_000; // 30 seconds

function formatTime(iso: string) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

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

export default function Dashboard() {
  const [state, setState] = useState<DarwinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

  const fetchState = useCallback(async () => {
    try {
      if (!GIST_ID) {
        setError("NEXT_PUBLIC_GIST_ID not set");
        setLoading(false);
        return;
      }
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const gist = await res.json();
      const content = gist.files?.["darwin_state.json"]?.content;
      if (content) setState(JSON.parse(content));
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const fetchInterval = setInterval(fetchState, REFRESH_INTERVAL);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? REFRESH_INTERVAL / 1000 : prev - 1));
    }, 1000);
    return () => { clearInterval(fetchInterval); clearInterval(countdownInterval); };
  }, [fetchState]);

  if (loading) return <LoadingSkeleton />;

  if (error || !state) {
    return (
      <div className="container" style={{ paddingTop: 120, textAlign: "center" }}>
        <div className="error-state">
          <div className="error-icon">!</div>
          <h2>Dashboard Offline</h2>
          <p>{error || "No state data available."}</p>
          <button className="btn btn-primary" onClick={fetchState}>Retry Connection</button>
        </div>
      </div>
    );
  }

  const decision = state.last_decision;
  const portfolioHistory = state.portfolio_history || [state.portfolio_usd];
  const geneHistory = state.gene_scores_history || [];
  const pnlPct = state.portfolio_start_of_day_usd > 0
    ? ((state.portfolio_usd - state.portfolio_start_of_day_usd) / state.portfolio_start_of_day_usd) * 100
    : 0;

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="header-brand">
            <span className="logo-icon" style={{background: "linear-gradient(135deg, #f87171, #a78bfa)"}}>S</span>
            <h1><span>MSAF-1</span> <span className="header-sub">The Sandman</span></h1>
          </div>
          <div className="header-meta">
            <span className="meta-chip">{state.total_trades} trades</span>
            <span className="meta-chip">{state.open_positions.length} positions</span>
            {state.shield_status && (
              <span className={`meta-chip ${state.shield_status.gas_critical ? "badge-sell" : state.shield_status.gas_spike ? "badge-hold" : "badge-buy"}`}>
                {state.shield_status.gas_gwei.toFixed(1)} gwei
              </span>
            )}
            <span className="meta-chip" style={{
              color: state.msaf1_risk_tier === "CRITICAL_SHIELD" ? "var(--danger)" :
                     state.msaf1_risk_tier === "LEVEL_2" ? "var(--warning)" :
                     state.msaf1_risk_tier === "LEVEL_1" ? "#f97316" : "var(--success)",
              borderColor: "currentColor"
            }}>
              {state.msaf1_risk_tier || "NORMAL"}
            </span>
            <span className="meta-chip live-indicator">
              <span className="live-dot" /> LIVE
            </span>
          </div>
        </div>
        <div className="header-right">
          <NotificationsPanel state={state} />
          <span className="last-updated" title={formatTime(state.last_tick)}>
            {timeAgo(state.last_tick)}
          </span>
          <button className="btn btn-refresh" onClick={fetchState}>
            <span className="refresh-icon" style={{ animation: countdown <= 3 ? "spin 1s linear" : "none" }}>&#x21bb;</span>
            {countdown}s
          </button>
        </div>
      </header>

      {/* Live Price Ticker */}
      <PriceTicker />

      {/* Portfolio Summary Cards */}
      <section className="stats-grid">
        <div className="stat-card stat-portfolio">
          <div className="stat-label">Portfolio Value</div>
          <div className="stat-value">${state.portfolio_usd.toFixed(0)}</div>
          <div className={`stat-change ${pnlPct >= 0 ? "up" : "down"}`}>
            {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}% today
          </div>
          <div className="stat-sub">Peak: ${state.portfolio_peak_usd.toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Drawdown</div>
          <div className="stat-value" style={{ color: state.current_drawdown_pct > 15 ? "var(--danger)" : state.current_drawdown_pct > 8 ? "var(--warning)" : "var(--success)" }}>
            {state.current_drawdown_pct.toFixed(1)}%
          </div>
          <div className="stat-sub">Max: 25% limit</div>
          <div className="mini-bar">
            <div className="mini-bar-fill" style={{
              width: `${Math.min((state.current_drawdown_pct / 25) * 100, 100)}%`,
              background: state.current_drawdown_pct > 15 ? "var(--danger)" : state.current_drawdown_pct > 8 ? "var(--warning)" : "var(--success)"
            }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open Positions</div>
          <div className="stat-value">{state.open_positions.length}/2</div>
          <div className="stat-sub">
            {state.open_positions.map((p: any) => p.token).join(", ") || "No open positions"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Gene</div>
          <div className="stat-value" style={{ color: "var(--accent)" }}>
            {decision?.gene || "NONE"}
          </div>
          <div className="stat-sub">
            {decision?.decision || "HOLD"} · {(decision?.confidence || 0) * 100}% confidence
          </div>
        </div>
      </section>

      {/* Charts Row */}
      <section className="charts-grid">
        <PortfolioChart history={portfolioHistory} peak={state.portfolio_peak_usd} />
        <GeneEvolutionChart history={geneHistory} />
      </section>

      {/* Middle Row: Drawdown + Thought + Market */}
      {/* MSAF-1 Row: MEV Shield + Arbitrage Scanner + Gas Monitor */}
      <section className="msaf1-grid">
        <MEVShield
          shield={state.shield_status || null}
          drawdown={state.risk_shield || null}
        />
        <ArbitrageScanner
          opportunities={state.arbitrage_opportunities || []}
          telemetry={state.msaf1_telemetry || null}
        />
        <GasMonitor
          currentGas={state.shield_status?.gas_gwei || 5}
          gasHistory={state.msaf1_telemetry?.gas_gwei_avg ? [{gwei: state.msaf1_telemetry.gas_gwei_avg, ts: Date.now()}] : []}
          gasSpike={state.shield_status?.gas_spike || false}
          gasCritical={state.shield_status?.gas_critical || false}
        />
      </section>

      {/* Middle Row: Drawdown + Thought + Market */}
      <section className="mid-grid">
        <DrawdownMeter pct={state.current_drawdown_pct} />
        <DarwinThought
          thought={decision?.darwin_thought || ""}
          decision={state.msaf1_strategy?.action || decision?.decision || "HOLD"}
          confidence={decision?.confidence || 0}
          gene={decision?.gene || "MSAF1"}
          token={decision?.token || "\u2014"}
          reasoning={state.msaf1_strategy?.rationale || decision?.reasoning || ""}
        />
        <MarketOverview
          market={state.market_snapshot || null}
          openPositions={state.open_positions}
        />
      </section>

      {/* Gene Tournament */}
      <section className="section">
        <div className="section-header">
          <h2>Gene Tournament</h2>
          <span className="section-sub">4 strategies competing · winner executes</span>
        </div>
        <GeneLeaderboard genes={state.genes} scores={state.gene_scores} />
      </section>

      {/* Trade History */}
      <section className="section">
        <div className="section-header">
          <h2>Trade History</h2>
          <span className="section-sub">Last {Math.min(state.trade_log?.length || 0, 50)} trades</span>
        </div>
        <TradeLog trades={state.trade_log} />
      </section>

      {/* Evolution Timeline */}
      {state.evolution_history && state.evolution_history.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>Evolution Timeline</h2>
            <span className="section-sub">Gene mutations over generations</span>
          </div>
          <div className="card">
            <div className="evolution-timeline">
              {state.evolution_history.slice().reverse().map((evo: any, i: number) => {
                const winner = evo.scores ? Object.entries(evo.scores).sort(([,a]: any, [,b]: any) => b - a)[0] : null;
                return (
                  <div key={i} className="evo-item">
                    <div className="evo-marker">
                      <div className="evo-dot" />
                      {i < state.evolution_history.length - 1 && <div className="evo-line" />}
                    </div>
                    <div className="evo-content">
                      <div className="evo-gen">Generation #{evo.generation}</div>
                      <div className="evo-time">{formatTime(evo.timestamp)}</div>
                      <div className="evo-scores">
                        {evo.scores && Object.entries(evo.scores).map(([gene, score]: any) => {
                          const isWinner = winner && winner[0] === gene;
                          return (
                            <span key={gene} className={`evo-gene ${isWinner ? "winner" : ""}`}
                                  style={{ borderColor: gene === "PULSE" ? "#f59e0b" : gene === "WAVE" ? "#3b82f6" : gene === "GRAVITY" ? "#10b981" : "#8b5cf6" }}>
                              {gene}: {score.toFixed(3)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <div>MSAF-1 — The Sandman: MEV-Shield &amp; Arbitrage-Frontrunner</div>
        <div className="footer-links">
          <span>BNB HACK 2026</span>
          <span>Best Use of TWAK</span>
          <a href="https://github.com/PremJibon/bnb-hack-darwin" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
