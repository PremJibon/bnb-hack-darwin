"use client";

interface ArbitrageOpp {
  symbol: string;
  cmc_price: number;
  dex_price: number;
  variance_pct: number;
  net_profit_pct: number;
  direction: string;
  timestamp: string;
  confidence: number;
}

interface Props {
  opportunities: ArbitrageOpp[];
  telemetry: {
    detected_dislocation_pct: number;
    current_calculated_drawdown: number;
    risk_tier: string;
  } | null;
}

export function ArbitrageScanner({ opportunities, telemetry }: Props) {
  const bestOpp = opportunities?.[0];
  const dislocationColor = telemetry?.detected_dislocation_pct
    ? telemetry.detected_dislocation_pct > 1.8
      ? "var(--success)"
      : telemetry.detected_dislocation_pct > 0.5
      ? "var(--warning)"
      : "var(--text-muted)"
    : "var(--text-muted)";

  return (
    <div className="card">
      <div className="card-title">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Arbitrage Scanner
        </span>
        {bestOpp && (
          <span className="badge badge-buy" style={{ marginLeft: "auto", fontSize: 10 }}>
            {opportunities.length} opps
          </span>
        )}
      </div>

      {/* Current dislocation gauge */}
      {telemetry && (
        <div className="arb-gauge">
          <div className="arb-gauge-header">
            <span className="arb-gauge-label">Mempool Dislocation</span>
            <span className="arb-gauge-value" style={{ color: dislocationColor }}>
              {telemetry.detected_dislocation_pct > 0
                ? `${(telemetry.detected_dislocation_pct * 100).toFixed(1)}%`
                : "0.0%"}
            </span>
          </div>
          <div className="arb-gauge-bar">
            <div className="arb-gauge-fill" style={{
              width: `${Math.min(telemetry.detected_dislocation_pct * 30, 100)}%`,
              background: dislocationColor,
            }} />
            <div className="arb-gauge-threshold" style={{ left: "54%" }}>
              <span className="arb-gauge-threshold-label">1.8% threshold</span>
            </div>
          </div>
        </div>
      )}

      {/* Opportunities list */}
      {opportunities && opportunities.length > 0 ? (
        <div className="arb-list">
          {opportunities.slice(0, 5).map((opp, i) => {
            const profitColor = opp.net_profit_pct > 1 ? "var(--success)" : opp.net_profit_pct > 0.3 ? "var(--warning)" : "var(--text-muted)";
            return (
              <div key={i} className="arb-item">
                <div className="arb-item-header">
                  <span className="arb-item-symbol">{opp.symbol}</span>
                  <span className={`arb-item-direction ${opp.direction === "BUY_DEX" ? "badge badge-buy" : "badge badge-sell"}`}>
                    {opp.direction === "BUY_DEX" ? "BUY DEX" : "SELL DEX"}
                  </span>
                </div>
                <div className="arb-item-details">
                  <div className="arb-item-detail">
                    <span className="arb-item-label">CMC</span>
                    <span className="arb-item-value">${opp.cmc_price.toFixed(opp.cmc_price > 100 ? 0 : 4)}</span>
                  </div>
                  <div className="arb-item-detail">
                    <span className="arb-item-label">DEX</span>
                    <span className="arb-item-value">${opp.dex_price.toFixed(opp.dex_price > 100 ? 0 : 4)}</span>
                  </div>
                  <div className="arb-item-detail">
                    <span className="arb-item-label">Spread</span>
                    <span className="arb-item-value" style={{ color: profitColor }}>
                      {opp.variance_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="arb-item-detail">
                    <span className="arb-item-label">Net</span>
                    <span className="arb-item-value" style={{ color: profitColor }}>
                      {opp.net_profit_pct > 0 ? "+" : ""}{opp.net_profit_pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="arb-item-confidence">
                  <div className="arb-conf-bar">
                    <div className="arb-conf-fill" style={{
                      width: `${opp.confidence * 100}%`,
                      background: opp.confidence >= 0.7 ? "var(--success)" : opp.confidence >= 0.5 ? "var(--warning)" : "var(--danger)",
                    }} />
                  </div>
                  <span className="arb-conf-text" style={{
                    color: opp.confidence >= 0.7 ? "var(--success)" : opp.confidence >= 0.5 ? "var(--warning)" : "var(--text-muted)",
                  }}>
                    {(opp.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="arb-empty">
          <div className="arb-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="arb-empty-text">No dislocations detected</div>
          <div className="arb-empty-sub">The mempool is calm. The Sandman waits.</div>
        </div>
      )}
    </div>
  );
}
