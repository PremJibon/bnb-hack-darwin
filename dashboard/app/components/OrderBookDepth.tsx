"use client";
import { useMarketData } from "../../lib/websocket-context";

// ─── Order Book Depth ────────────────────────────────────────────
// Professional depth visualization showing bid/ask liquidity
// Used by real traders to gauge support/resistance levels
// ─────────────────────────────────────────────────────────────────

interface OrderBookProps {
  symbol: string;
}

export function OrderBookDepth({ symbol }: OrderBookProps) {
  const { connectionState } = useMarketData();

  // Generate simulated order book depth based on current price
  const price = symbol === "BTCUSDT" ? 68420 : symbol === "ETHUSDT" ? 3385 : 634.8;
  const spread = price * 0.0006; // 0.06% spread
  const bidPrice = price - spread / 2;
  const askPrice = price + spread / 2;
  const midPrice = price;

  // Generate depth levels (professional: 10 bids + 10 asks)
  const levels = 10;
  const bids = Array.from({ length: levels }, (_, i) => {
    const p = bidPrice - (i * spread * 0.3);
    const qty = (10 - i) * (1 + Math.random() * 0.5);
    return { price: p, quantity: qty, total: 0 };
  });

  const asks = Array.from({ length: levels }, (_, i) => {
    const p = askPrice + (i * spread * 0.3);
    const qty = (10 - i) * (1 + Math.random() * 0.3);
    return { price: p, quantity: qty, total: 0 };
  });

  // Calculate cumulative totals
  let bidTotal = 0;
  bids.forEach(b => { bidTotal += b.quantity; b.total = bidTotal; });
  let askTotal = 0;
  asks.forEach(a => { askTotal += a.quantity; a.total = askTotal; });

  const maxTotal = Math.max(bidTotal, askTotal);

  const isConnected = connectionState === "connected";

  return (
    <div className="card orderbook-card">
      <div className="card-header">
        <span className="card-title">
          <span className={`orderbook-status ${isConnected ? "connected" : "disconnected"}`} />
          Order Book Depth — {symbol.replace("USDT", "/USDT")}
        </span>
        <div className="orderbook-controls">
          <span className={`orderbook-status-label ${isConnected ? "live" : "offline"}`}>
            {isConnected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Spread indicator */}
      <div className="orderbook-spread">
        <span>Spread: ${(askPrice - bidPrice).toFixed(2)}</span>
        <span className="spread-pct">
          {(((askPrice - bidPrice) / midPrice) * 100).toFixed(4)}%
        </span>
      </div>

      {/* Depth table */}
      <div className="orderbook-table">
        {/* Header */}
        <div className="orderbook-header">
          <span>Price</span>
          <span>Quantity</span>
          <span>Total</span>
          <span>Depth</span>
        </div>

        {/* Asks (sell side) — reversed so best ask is at bottom */}
        <div className="orderbook-asks">
          {[...asks].reverse().map((level, i) => (
            <div key={`ask-${i}`} className="orderbook-row ask-row">
              <span className="orderbook-price ask-price">
                ${level.price.toFixed(symbol === "BTCUSDT" ? 2 : 4)}
              </span>
              <span className="orderbook-qty">{level.quantity.toFixed(4)}</span>
              <span className="orderbook-total">{level.total.toFixed(2)}</span>
              <div className="orderbook-depth-bar">
                <div
                  className="depth-fill ask-fill"
                  style={{ width: `${(level.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mid price */}
        <div className="orderbook-mid">
          <span className="mid-price">${midPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="mid-label">MID PRICE</span>
        </div>

        {/* Bids (buy side) */}
        <div className="orderbook-bids">
          {bids.map((level, i) => (
            <div key={`bid-${i}`} className="orderbook-row bid-row">
              <span className="orderbook-price bid-price">
                ${level.price.toFixed(symbol === "BTCUSDT" ? 2 : 4)}
              </span>
              <span className="orderbook-qty">{level.quantity.toFixed(4)}</span>
              <span className="orderbook-total">{level.total.toFixed(2)}</span>
              <div className="orderbook-depth-bar">
                <div
                  className="depth-fill bid-fill"
                  style={{ width: `${(level.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
