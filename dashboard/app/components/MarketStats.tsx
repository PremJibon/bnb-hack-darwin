"use client";
import { useMarketData, useMarketStats } from "../../lib/websocket-context";
import { WATCHLIST_DISPLAY } from "../../lib/market-data";
import { useEffect, useState } from "react";

// ─── Market Stats Widget ─────────────────────────────────────────
// Professional market overview: top gainers, top losers, volume leaders
// Uses live Binance WebSocket data
// ─────────────────────────────────────────────────────────────────

export function MarketStats() {
  const { connectionState, tickers } = useMarketData();
  const { gainers, losers, mostActive, avgChange, positiveCount, negativeCount } = useMarketStats();
  const [fearGreed, setFearGreed] = useState({ value: 50, label: "Neutral" });

  // Fetch Fear & Greed index
  useEffect(() => {
    async function fetchFG() {
      try {
        const res = await fetch("/api/market/prices");
        if (res.ok) {
          const data = await res.json();
          if (data.fearGreed) setFearGreed(data.fearGreed);
        }
      } catch { /* ignore */ }
    }
    fetchFG();
    const interval = setInterval(fetchFG, 300000); // Every 5 min
    return () => clearInterval(interval);
  }, []);

  const activeTickers = Object.values(tickers).filter(t => t.price > 0);
  const isConnected = connectionState === "connected";

  return (
    <div className="card market-stats-card">
      <div className="card-header">
        <span className="card-title">
          <span className={`market-stats-indicator ${isConnected ? "live" : "offline"}`} />
          Market Overview
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {isConnected ? `${activeTickers.length} assets` : "Offline"}
        </span>
      </div>

      {/* Sentiment bar */}
      <div className="market-sentiment-bar">
        <div className="sentiment-segment positive" style={{ flex: positiveCount || 1 }} />
        <div className="sentiment-segment negative" style={{ flex: negativeCount || 1 }} />
      </div>
      <div className="market-sentiment-labels">
        <span style={{ color: "var(--green)" }}>{positiveCount} positive</span>
        <span style={{ color: "var(--text-muted)", fontSize: 9 }}>
          Avg: <span style={{ color: avgChange >= 0 ? "var(--green)" : "var(--red)" }}>
            {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}%
          </span>
        </span>
        <span style={{ color: "var(--red)" }}>{negativeCount} negative</span>
      </div>

      {/* Fear & Greed */}
      <div className="market-fear-greed">
        <div className="fg-header">
          <span className="fg-label">Fear & Greed</span>
          <span className="fg-value" style={{
            color: fearGreed.value > 60 ? "var(--green)" : fearGreed.value > 40 ? "var(--yellow)" : "var(--red)"
          }}>
            {fearGreed.value}
          </span>
        </div>
        <div className="fg-bar">
          <div className="fg-fill" style={{
            width: `${fearGreed.value}%`,
            background: fearGreed.value > 60 ? "var(--green)" : fearGreed.value > 40 ? "var(--yellow)" : "var(--red)",
          }} />
        </div>
        <span className="fg-label-text">{fearGreed.label}</span>
      </div>

      {/* Gainers */}
      <div className="market-section">
        <div className="market-section-header">
          <span className="market-section-title" style={{ color: "var(--green)" }}>▲ Top Gainers</span>
        </div>
        {gainers.length === 0 ? (
          <div className="market-empty">Waiting for data...</div>
        ) : (
          gainers.slice(0, 4).map((t, i) => (
            <div key={i} className="market-row">
              <span className="market-symbol">{WATCHLIST_DISPLAY[t.symbol] || t.symbol.replace("USDT", "/USDT")}</span>
              <span className="market-price">${t.price.toLocaleString()}</span>
              <span className="market-change positive">+{t.changePct24h.toFixed(2)}%</span>
            </div>
          ))
        )}
      </div>

      {/* Losers */}
      <div className="market-section">
        <div className="market-section-header">
          <span className="market-section-title" style={{ color: "var(--red)" }}>▼ Top Losers</span>
        </div>
        {losers.length === 0 ? (
          <div className="market-empty">Waiting for data...</div>
        ) : (
          losers.slice(0, 4).map((t, i) => (
            <div key={i} className="market-row">
              <span className="market-symbol">{WATCHLIST_DISPLAY[t.symbol] || t.symbol.replace("USDT", "/USDT")}</span>
              <span className="market-price">${t.price.toLocaleString()}</span>
              <span className="market-change negative">{t.changePct24h.toFixed(2)}%</span>
            </div>
          ))
        )}
      </div>

      {/* Volume Leaders */}
      <div className="market-section">
        <div className="market-section-header">
          <span className="market-section-title" style={{ color: "var(--neon-blue)" }}>● Volume Leaders</span>
        </div>
        {mostActive.length === 0 ? (
          <div className="market-empty">Waiting for data...</div>
        ) : (
          mostActive.slice(0, 4).map((t, i) => (
            <div key={i} className="market-row">
              <span className="market-symbol">{WATCHLIST_DISPLAY[t.symbol] || t.symbol.replace("USDT", "/USDT")}</span>
              <span className="market-price">${t.price.toLocaleString()}</span>
              <span className="market-volume">
                ${(t.volume24h / 1e9).toFixed(2)}B
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
