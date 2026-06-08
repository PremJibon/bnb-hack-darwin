"use client";

interface Props {
  pct: number;
}

export function DrawdownMeter({ pct }: Props) {
  const MAX_DRAWDOWN = 25;
  const fillPct = Math.min((pct / MAX_DRAWDOWN) * 100, 100);

  let color = "var(--success)";
  let label = "Safe";
  if (pct > 15) { color = "var(--warning)"; label = "Warning"; }
  if (pct > 20) { color = "var(--danger)"; label = "Critical"; }

  return (
    <div className="card">
      <div className="card-title">Drawdown Meter</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div className="card-value" style={{ color }}>{pct.toFixed(1)}%</div>
        <div className="card-label">/ {MAX_DRAWDOWN}% max · {label}</div>
      </div>
      <div className="drawdown-meter">
        <div className="drawdown-fill" style={{ width: `${fillPct}%`, background: color }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
        <span>0%</span>
        <span>{MAX_DRAWDOWN}% limit</span>
      </div>
    </div>
  );
}
