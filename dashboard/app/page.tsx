"use client";

import { useEffect, useState } from "react";
import { GeneLeaderboard } from "./components/GeneLeaderboard";
import { DrawdownMeter } from "./components/DrawdownMeter";
import { TradeLog } from "./components/TradeLog";
import { DarwinThought } from "./components/DarwinThought";

interface DarwinState {
  portfolio_usd: number;
  portfolio_peak_usd: number;
  current_drawdown_pct: number;
  open_positions: string[];
  total_trades: number;
  generation: number;
  gene_scores: Record<string, number>;
  genes: Record<string, any>;
  last_decision: {
    decision: string;
    token: string;
    gene: string;
    confidence: number;
    reasoning: string;
    darwin_thought: string;
    timestamp: string;
  } | null;
  trade_log: any[];
  last_tick: string;
  evolution_history: any[];
}

const GIST_ID = process.env.NEXT_PUBLIC_GIST_ID || "";

function formatTime(iso: string) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString();
}

export default function Dashboard() {
  const [state, setState] = useState<DarwinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchState() {
    try {
      if (!GIST_ID) {
        setError("NEXT_PUBLIC_GIST_ID not set");
        setLoading(false);
        return;
      }
      const res = await fetch(
        `https://api.github.com/gists/${GIST_ID}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const gist = await res.json();
      const content = gist.files?.["darwin_state.json"]?.content;
      if (content) setState(JSON.parse(content));
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 80, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, color: "var(--text-muted)" }}>
          Loading DARWIN state...
        </h1>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="container" style={{ paddingTop: 80, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, color: "var(--danger)" }}>
          Dashboard Offline
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
          {error || "No state data available. Set NEXT_PUBLIC_GIST_ID."}
        </p>
      </div>
    );
  }

  const decision = state.last_decision;

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>DARWIN AGENT</h1>
          <div className="header-meta">
            <span>Gen {state.generation}</span>
            <span>·</span>
            <span>{state.total_trades} trades</span>
            <span>·</span>
            <span>Updated {formatTime(state.last_tick)}</span>
          </div>
        </div>
        <button onClick={fetchState} className="btn">Refresh</button>
      </div>

      <div className="grid grid-4" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-title">Portfolio</div>
          <div className="card-value">${state.portfolio_usd.toFixed(0)}</div>
          <div className="card-label">Peak: ${state.portfolio_peak_usd.toFixed(0)}</div>
        </div>
        <div className="card">
          <div className="card-title">Open Positions</div>
          <div className="card-value">{state.open_positions.length}</div>
          <div className="card-label">Max: 2</div>
        </div>
        <div className="card">
          <div className="card-title">Generation</div>
          <div className="card-value text-accent">#{state.generation}</div>
          <div className="card-label">Evolutions triggered</div>
        </div>
        <div className="card">
          <div className="card-title">Trades</div>
          <div className="card-value text-success">{state.total_trades}</div>
          <div className="card-label">All-time total</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <DrawdownMeter pct={state.current_drawdown_pct} />
        <DarwinThought
          thought={decision?.darwin_thought || ""}
          decision={decision?.decision || "HOLD"}
          confidence={decision?.confidence || 0}
          gene={decision?.gene || "NONE"}
          token={decision?.token || "\u2014"}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Gene Tournament
        </h2>
        <GeneLeaderboard genes={state.genes} scores={state.gene_scores} />
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Trade History
        </h2>
        <TradeLog trades={state.trade_log} />
      </div>

      <div className="footer">
        DARWIN - Evolutionary Tournament Trading Agent · BNB HACK 2026
      </div>
    </div>
  );
}
