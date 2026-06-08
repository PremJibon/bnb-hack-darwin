"use client";

interface TokenData {
  symbol: string;
  name: string;
  price_usd: number;
  percent_change_24h: number;
  volume_24h?: number;
}

interface MarketData {
  tokens?: TokenData[];
  fear_greed?: number;
  fear_greed_label?: string;
  fear_greed_trend?: number[];
}

interface Props {
  market: MarketData | null;
  openPositions: any[];
}

function formatVolume(v: number): string {
  if (!v) return "-";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${(v / 1e3).toFixed(0)}K`;
}

export function MarketOverview({ market, openPositions }: Props) {
  const tokens = market?.tokens || [];
  const fg = market?.fear_greed ?? 50;
  const fgLabel = market?.fear_greed_label || "Neutral";

  const fgColor = fg > 60 ? "var(--success)" : fg > 40 ? "var(--warning)" : "var(--danger)";
  const fgRotation = ((fg - 10) / 80) * 180;

  return (
    <div className="card">
      <div className="card-title">Market Overview</div>

      {/* Fear & Greed Gauge */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: `conic-gradient(${fgColor} ${fgRotation}deg, var(--bg) ${fgRotation}deg)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", flexShrink: 0,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "var(--bg-card)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column",
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: fgColor }}>{fg}</span>
            <span style={{ fontSize: 7, color: "var(--text-muted)", marginTop: -2 }}>F&G</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: fgColor }}>{fgLabel}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            {market?.fear_greed_trend?.length ? `${market.fear_greed_trend[0]} → ${fg}` : ""}
          </div>
        </div>
      </div>

      {/* Token Prices */}
      {tokens.length > 0 && (
        <>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>
            Top BEP-20 Tokens
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tokens.slice(0, 5).map((t) => (
              <div key={t.symbol} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 8px", borderRadius: 6, background: "var(--bg)", fontSize: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, width: 40 }}>{t.symbol}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{t.name}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    ${t.price_usd.toFixed(t.price_usd > 100 ? 0 : t.price_usd > 1 ? 2 : 4)}
                  </div>
                  <div style={{
                    fontSize: 10, fontFamily: "var(--font-mono)",
                    color: t.percent_change_24h >= 0 ? "var(--success)" : "var(--danger)",
                  }}>
                    {t.percent_change_24h >= 0 ? "+" : ""}{t.percent_change_24h.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginTop: 16, marginBottom: 8 }}>
            Open Positions ({openPositions.length}/2)
          </div>
          {openPositions.map((pos: any, i: number) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "6px 8px", borderRadius: 6, background: "var(--bg)", fontSize: 12, marginBottom: 4,
            }}>
              <span style={{ fontWeight: 600 }}>{pos.token}</span>
              <span style={{ color: (pos.pnl_pct || 0) >= 0 ? "var(--success)" : "var(--danger)", fontFamily: "var(--font-mono)" }}>
                {(pos.pnl_pct || 0) >= 0 ? "+" : ""}{(pos.pnl_pct || 0).toFixed(1)}%
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
