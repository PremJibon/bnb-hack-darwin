"use client";

import { useEffect, useState, useRef } from "react";

interface TickerPrice {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  direction: "up" | "down" | "same";
}

const PAIRS = [
  { symbol: "BNBUSDT", label: "BNB", decimals: 2 },
  { symbol: "BTCUSDT", label: "BTC", decimals: 0 },
  { symbol: "ETHUSDT", label: "ETH", decimals: 2 },
  { symbol: "SOLUSDT", label: "SOL", decimals: 2 },
  { symbol: "CAKEUSDT", label: "CAKE", decimals: 3 },
  { symbol: "XRPUSDT", label: "XRP", decimals: 4 },
  { symbol: "ADAUSDT", label: "ADA", decimals: 4 },
  { symbol: "DOTUSDT", label: "DOT", decimals: 3 },
  { symbol: "DOGEUSDT", label: "DOGE", decimals: 5 },
  { symbol: "LINKUSDT", label: "LINK", decimals: 3 },
];

const WS_URL = "wss://stream.binance.com:9443/ws";

export function PriceTicker() {
  const [prices, setPrices] = useState<Record<string, TickerPrice>>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const prevPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const streams = PAIRS.map((p) => `${p.symbol.toLowerCase()}@ticker`).join("/");
      const ws = new WebSocket(`${WS_URL}?streams=${streams}`);

      ws.onopen = () => {
        setConnected(true);
        reconnectTimer.current = undefined;
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const data = raw.data || raw;
          const symbol = data.s;
          if (!symbol) return;

          const pair = PAIRS.find((p) => p.symbol === symbol);
          if (!pair) return;

          const price = parseFloat(data.c);
          const change = parseFloat(data.P);
          const high = parseFloat(data.h);
          const low = parseFloat(data.l);

          if (isNaN(price)) return;

          const prev = prevPrices.current[symbol];
          let direction: "up" | "down" | "same" = "same";
          if (prev !== undefined) {
            direction = price > prev ? "up" : price < prev ? "down" : "same";
          }
          prevPrices.current[symbol] = price;

          setPrices((prev) => ({
            ...prev,
            [symbol]: { symbol, price, change24h: change, high24h: high, low24h: low, direction },
          }));
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (!reconnectTimer.current) {
          reconnectTimer.current = setTimeout(() => {
            reconnectTimer.current = undefined;
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  if (Object.keys(prices).length === 0) {
    return (
      <div className="ticker-bar">
        <div className="ticker-inner">
          <span className="ticker-placeholder">
            {connected ? "Waiting for prices..." : "Connecting to market data..."}
            {!connected && <span className="ticker-dot" />}
          </span>
        </div>
      </div>
    );
  }

  const entries = PAIRS.map((pair) => {
    const p = prices[pair.symbol];
    if (!p) return null;
    return (
      <div
        key={pair.symbol}
        className={`ticker-item ${p.direction === "up" ? "ticker-up" : p.direction === "down" ? "ticker-down" : ""}`}
      >
        <span className="ticker-symbol">{pair.label}</span>
        <span className="ticker-price">
          ${p.price.toFixed(pair.decimals)}
        </span>
        <span className={`ticker-change ${p.change24h >= 0 ? "up" : "down"}`}>
          {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(1)}%
        </span>
      </div>
    );
  });

  // Duplicate for seamless scroll
  const entries2 = PAIRS.map((pair) => {
    const p = prices[pair.symbol];
    if (!p) return null;
    return (
      <div
        key={`dup-${pair.symbol}`}
        className={`ticker-item ${p.direction === "up" ? "ticker-up" : p.direction === "down" ? "ticker-down" : ""}`}
      >
        <span className="ticker-symbol">{pair.label}</span>
        <span className="ticker-price">
          ${p.price.toFixed(pair.decimals)}
        </span>
        <span className={`ticker-change ${p.change24h >= 0 ? "up" : "down"}`}>
          {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(1)}%
        </span>
      </div>
    );
  });

  return (
    <div className="ticker-container">
      <div className="ticker-badge">
        <span className={`ticker-status ${connected ? "connected" : ""}`} />
        LIVE
      </div>
      <div className="ticker-bar">
        <div className="ticker-track">
          <div className="ticker-inner">{entries}</div>
          <div className="ticker-inner">{entries2}</div>
        </div>
      </div>
    </div>
  );
}
