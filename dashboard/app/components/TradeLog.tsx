"use client";

interface Trade {
  tx_hash?: string;
  status?: string;
  gene?: string;
  reason?: string;
  amount_usd?: number;
  from_token?: string;
  to_token?: string;
  timestamp?: string;
}

interface Props {
  trades: Trade[];
}

function formatTime(ts?: string) {
  if (!ts) return "\u2014";
  return new Date(ts).toLocaleString();
}

export function TradeLog({ trades }: Props) {
  if (!trades || trades.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
          No trades yet. DARWIN is observing...
        </div>
      </div>
    );
  }

  const recent = [...trades].reverse().slice(0, 50);

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Gene</th>
              <th>Direction</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((t, i) => (
              <tr key={i}>
                <td style={{ fontSize: 11 }}>{formatTime(t.timestamp)}</td>
                <td>
                  <span style={{
                    color: t.gene === "PULSE" ? "#f59e0b" :
                           t.gene === "WAVE" ? "#3b82f6" :
                           t.gene === "GRAVITY" ? "#10b981" :
                           t.gene === "PHANTOM" ? "#8b5cf6" : "var(--text-muted)",
                    fontWeight: 600, fontSize: 11,
                  }}>{t.gene || "\u2014"}</span>
                </td>
                <td>
                  {t.from_token && t.to_token ? (
                    <span style={{ fontSize: 11 }}>{t.from_token} {'->'} {t.to_token}</span>
                  ) : "\u2014"}
                </td>
                <td style={{ fontWeight: 600 }}>
                  {t.amount_usd ? `$${t.amount_usd.toFixed(0)}` : "\u2014"}
                </td>
                <td>
                  <span className={`badge badge-${t.status === "executed" ? "buy" : "hold"}`}>
                    {t.status || "\u2014"}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.reason || "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
