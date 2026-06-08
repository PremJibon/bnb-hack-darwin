"use client";

interface Props {
  shield: {
    active: boolean;
    attacks_blocked: number;
    gas_gwei: number;
    gas_spike: boolean;
    gas_critical: boolean;
    sandwich_risk: number;
    status: string;
  } | null;
  drawdown: {
    drawdown_pct: number;
    risk_tier: string;
    tier_label: string;
    trade_size_mult: number;
    emergency_exit: boolean;
    max_trade_pct: number;
  } | null;
}

export function MEVShield({ shield, drawdown }: Props) {
  const statusColor = shield?.gas_critical
    ? "var(--danger)"
    : shield?.gas_spike
    ? "var(--warning)"
    : "var(--success)";

  const statusIcon = shield?.gas_critical
    ? "!"
    : shield?.gas_spike
    ? "~"
    : "✓";

  const tierColor = drawdown?.emergency_exit
    ? "var(--danger)"
    : drawdown?.risk_tier === "LEVEL_2"
    ? "var(--warning)"
    : drawdown?.risk_tier === "LEVEL_1"
    ? "#f97316"
    : "var(--success)";

  return (
    <div className="card">
      <div className="card-title">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}`,
          }} />
          MEV Shield
        </span>
        <span className={`badge badge-${shield?.gas_critical ? "sell" : shield?.gas_spike ? "hold" : "buy"}`}
              style={{ marginLeft: "auto" }}>
          {shield?.status || "ACTIVE"}
        </span>
      </div>

      {/* Shield stats */}
      <div className="shield-metrics">
        <div className="shield-metric">
          <div className="shield-metric-value" style={{ color: "var(--success)" }}>
            {shield?.attacks_blocked || 0}
          </div>
          <div className="shield-metric-label">Attacks Blocked</div>
        </div>
        <div className="shield-metric">
          <div className="shield-metric-value" style={{ color: statusColor }}>
            {shield?.gas_gwei?.toFixed(1) || "—"}
          </div>
          <div className="shield-metric-label">Gas (gwei)</div>
        </div>
        <div className="shield-metric">
          <div className="shield-metric-value" style={{ color: shield?.sandwich_risk && shield.sandwich_risk > 0.5 ? "var(--warning)" : "var(--text-secondary)" }}>
            {shield?.sandwich_risk ? `${(shield.sandwich_risk * 100).toFixed(0)}%` : "—"}
          </div>
          <div className="shield-metric-label">Sandwich Risk</div>
        </div>
      </div>

      {/* Gas gauge */}
      {shield && (
        <div className="shield-gas-gauge">
          <div className="shield-gas-bar">
            <div className="shield-gas-fill" style={{
              width: `${Math.min((shield.gas_gwei / 40) * 100, 100)}%`,
              background: shield.gas_critical
                ? "var(--danger)"
                : shield.gas_spike
                ? "var(--warning)"
                : "var(--success)",
            }} />
          </div>
          <div className="shield-gas-labels">
            <span>5 gwei (normal)</span>
            <span>15 gwei (spike)</span>
            <span>30 gwei (critical)</span>
          </div>
        </div>
      )}

      {/* Risk tier */}
      {drawdown && (
        <div className="shield-risk-tier" style={{
          borderTop: "1px solid var(--border)",
          marginTop: 12,
          paddingTop: 12,
        }}>
          <div className="shield-tier-header">
            <span className="shield-tier-label">Drawdown Shield</span>
            <span className="shield-tier-badge" style={{
              background: `${tierColor}15`,
              color: tierColor,
              border: `1px solid ${tierColor}30`,
            }}>
              {drawdown.risk_tier}
            </span>
          </div>
          <div className="shield-tier-bar">
            <div className="shield-tier-fill" style={{
              width: `${Math.min((drawdown.drawdown_pct / 27) * 100, 100)}%`,
              background: drawdown.emergency_exit
                ? "var(--danger)"
                : drawdown.drawdown_pct > 22
                ? "var(--warning)"
                : drawdown.drawdown_pct > 15
                ? "#f97316"
                : "var(--success)",
            }} />
            <div className="shield-tier-markers">
              <div className="shield-tier-marker" style={{ left: `${(15 / 27) * 100}%` }}>
                <div className="shield-tier-dot" style={{ background: "#f97316" }} />
                <span className="shield-tier-marker-label">15%</span>
              </div>
              <div className="shield-tier-marker" style={{ left: `${(22 / 27) * 100}%` }}>
                <div className="shield-tier-dot" style={{ background: "var(--warning)" }} />
                <span className="shield-tier-marker-label">22%</span>
              </div>
              <div className="shield-tier-marker" style={{ left: `${(27 / 27) * 100}%` }}>
                <div className="shield-tier-dot" style={{ background: "var(--danger)" }} />
                <span className="shield-tier-marker-label">27%</span>
              </div>
            </div>
          </div>
          <div className="shield-tier-detail">
            <span>Trade size: {drawdown.trade_size_mult === 0 ? "HALTED" : `${(drawdown.trade_size_mult * 100).toFixed(0)}%`}</span>
            <span>Max trade: {drawdown.max_trade_pct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
