"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface Props {
  history: number[];
  labels?: string[];
  peak?: number;
}

export function PortfolioChart({ history, labels, peak }: Props) {
  if (!history || history.length < 2) {
    return (
      <div className="card">
        <div className="card-title">Portfolio Performance</div>
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
          Insufficient data to display chart. DARWIN needs at least 2 ticks.
        </div>
      </div>
    );
  }

  const data = history.map((val, i) => ({
    name: labels?.[i] || `T+${i * 6}h`,
    value: val,
  }));

  const startVal = history[0];
  const endVal = history[history.length - 1];
  const pnl = endVal - startVal;
  const pnlPct = ((endVal - startVal) / startVal) * 100;
  const isPositive = pnl >= 0;

  return (
    <div className="card" style={{ gridColumn: "span 2" }}>
      <div className="card-title">
        Portfolio Performance
        <span style={{ marginLeft: 12, fontSize: 13, color: isPositive ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
          {isPositive ? "+" : ""}{pnlPct.toFixed(1)}%
        </span>
        <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>
          ${startVal.toFixed(0)} → ${endVal.toFixed(0)}
        </span>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "var(--success)" : "var(--danger)"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isPositive ? "var(--success)" : "var(--danger)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis domain={["dataMin - 10", "dataMax + 10"]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(value: any) => [value != null ? `$${Number(value).toFixed(2)}` : "$0", "Portfolio"]}
            />
            <Area type="monotone" dataKey="value" stroke={isPositive ? "var(--success)" : "var(--danger)"} fillOpacity={1} fill="url(#colorPnl)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
