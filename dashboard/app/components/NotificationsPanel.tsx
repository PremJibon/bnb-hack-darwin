"use client";

import { useState, useEffect, useRef } from "react";

interface Notification {
  id: string;
  type: "trade" | "evolution" | "drawdown" | "signal" | "system";
  title: string;
  message: string;
  timestamp: string;
  severity: "info" | "warning" | "critical" | "success";
  read: boolean;
}

interface DarwinState {
  portfolio_usd: number;
  portfolio_peak_usd: number;
  current_drawdown_pct: number;
  total_trades: number;
  generation: number;
  gene_scores: Record<string, number>;
  genes: Record<string, any>;
  last_decision: any;
  trade_log: any[];
  evolution_history: any[];
  last_tick: string;
  [key: string]: any;
}

interface Props {
  state: DarwinState;
  prevStateRef?: React.MutableRefObject<DarwinState | null>;
}

function formatTime(iso: string) {
  if (!iso) return "";
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

export function NotificationsPanel({ state, prevStateRef }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [badge, setBadge] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<string>("");

  // Derive notifications from state data
  useEffect(() => {
    const stateKey = JSON.stringify({
      gen: state.generation,
      trades: state.total_trades,
      dd: state.current_drawdown_pct,
      decision: state.last_decision?.decision,
      thought: state.last_decision?.darwin_thought,
    });

    if (stateKey === prevRef.current) return;
    prevRef.current = stateKey;

    const newNotifications: Notification[] = [];
    const now = state.last_tick || new Date().toISOString();

    // Trade notification
    if (state.last_decision?.decision && state.last_decision.decision !== "HOLD") {
      const tradeCount = state.trade_log?.length || 0;
      const lastTrade = state.trade_log?.[tradeCount - 1];
      newNotifications.push({
        id: `trade-${now}-${Math.random().toString(36).slice(2, 6)}`,
        type: "trade",
        title: `${state.last_decision.decision} Signal`,
        message: state.last_decision.darwin_thought
          ? `DARWIN: ${state.last_decision.darwin_thought.slice(0, 100)}${state.last_decision.darwin_thought.length > 100 ? "..." : ""}`
          : `${state.last_decision.gene} gene triggered a ${state.last_decision.decision} on ${state.last_decision.token || "market"}`,
        timestamp: now,
        severity: state.last_decision.decision === "BUY" ? "success" : "warning",
        read: false,
      });
    }

    // Evolution notification
    if (state.evolution_history && state.evolution_history.length > 0) {
      const latest = state.evolution_history[state.evolution_history.length - 1];
      if (latest && latest.generation === state.generation) {
        const sorted = latest.scores
          ? Object.entries(latest.scores).sort(([, a]: any, [, b]: any) => b - a)
          : [];
        const winner = sorted[0];
        if (winner) {
          newNotifications.push({
            id: `evo-${now}`,
            type: "evolution",
            title: `Generation #${state.generation}`,
            message: `${String(winner[0])} leads with fitness ${Number(winner[1]).toFixed(4)}`,
            timestamp: now,
            severity: "info",
            read: false,
          });
        }
      }
    }

    // Drawdown warning
    if (state.current_drawdown_pct > 15) {
      newNotifications.push({
        id: `dd-${now}`,
        type: "drawdown",
        title: "Drawdown Alert",
        message: `Portfolio drawdown at ${state.current_drawdown_pct.toFixed(1)}% — above 15% threshold`,
        timestamp: now,
        severity: state.current_drawdown_pct > 20 ? "critical" : "warning",
        read: false,
      });
    }

    // Gene winner change notification (from gene_scores)
    if (state.gene_scores) {
      const sortedGenes = Object.entries(state.gene_scores).sort(([, a]: any, [, b]: any) => b - a);
      if (sortedGenes.length > 0) {
        const topGene = String(sortedGenes[0][0]);
        const topScore = Number(sortedGenes[0][1]);
        newNotifications.push({
          id: `gene-${now}`,
          type: "signal",
          title: `Leading Gene: ${topGene}`,
          message: `${topGene} fitness: ${topScore.toFixed(4)} — ${sortedGenes.length} genes competing`,
          timestamp: now,
          severity: "info",
          read: false,
        });
      }
    }

    if (newNotifications.length > 0) {
      setNotifications((prev) => {
        const combined = [...newNotifications, ...prev].slice(0, 50);
        return combined;
      });
      if (!open) {
        setBadge((prev) => Math.min(prev + newNotifications.length, 99));
      }
    }
  }, [state]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const togglePanel = () => {
    setOpen(!open);
    if (!open) setBadge(0);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    setBadge(0);
  };

  const typeIcon: Record<string, string> = {
    trade: "⚡",
    evolution: "🧬",
    drawdown: "⚠️",
    signal: "📊",
    system: "🔔",
  };

  const severityColor: Record<string, string> = {
    info: "var(--accent)",
    warning: "var(--warning)",
    critical: "var(--danger)",
    success: "var(--success)",
  };

  return (
    <div className="notif-wrapper" ref={panelRef}>
      <button className="btn btn-notif" onClick={togglePanel} title="Notifications">
        <span className="notif-bell">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
        {badge > 0 && <span className="notif-badge">{badge}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <div className="notif-title-row">
              <h3>Notifications</h3>
              <span className="notif-count">{notifications.length}</span>
            </div>
            <div className="notif-actions">
              <button className="btn btn-notif-action" onClick={markAllRead}>Mark read</button>
              <button className="btn btn-notif-action" onClick={clearAll}>Clear</button>
            </div>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  </svg>
                </div>
                <div className="notif-empty-text">No notifications yet</div>
                <div className="notif-empty-sub">DARWIN events will appear here</div>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`notif-item ${n.read ? "read" : "unread"}`}>
                  <div className="notif-item-icon" style={{ color: severityColor[n.severity] }}>
                    {typeIcon[n.type] || "🔔"}
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-msg">{n.message}</div>
                    <div className="notif-item-time">{timeAgo(n.timestamp)}</div>
                  </div>
                  {!n.read && <div className="notif-unread-dot" style={{ background: severityColor[n.severity] }} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
