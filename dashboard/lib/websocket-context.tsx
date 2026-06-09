"use client";

// ─── Real-Time Market Data Context ─────────────────────────────────
// Provides live Binance WebSocket data to all dashboard components
// Auto-reconnects, handles errors, and delivers real ticker updates
// ─────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  BinanceWebSocketClient,
  TickerData,
  WsConnectionState,
  WATCHLIST,
} from "./market-data";

export interface MarketDataState {
  connectionState: WsConnectionState;
  tickers: Record<string, TickerData>;
  selectedSymbol: string;
  lastUpdate: number;
  reconnectCount: number;
}

interface MarketDataContextType extends MarketDataState {
  setSelectedSymbol: (symbol: string) => void;
  getTicker: (symbol: string) => TickerData | undefined;
}

const MarketDataContext = createContext<MarketDataContextType | null>(null);

const INITIAL_TICKERS: Record<string, TickerData> = {};
WATCHLIST.forEach(sym => {
  INITIAL_TICKERS[sym] = {
    symbol: sym,
    price: 0,
    change24h: 0,
    changePct24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    lastUpdated: 0,
  };
});

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<WsConnectionState>("disconnected");
  const [tickers, setTickers] = useState<Record<string, TickerData>>(INITIAL_TICKERS);
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [lastUpdate, setLastUpdate] = useState(0);
  const [reconnectCount, setReconnectCount] = useState(0);
  const clientRef = useRef<BinanceWebSocketClient | null>(null);

  useEffect(() => {
    const client = new BinanceWebSocketClient(WATCHLIST);
    clientRef.current = client;

    // Listen for connection state changes
    client.subscribe("_connection", (data: any) => {
      setConnectionState(data.state);
      if (data.state === "connected") {
        setReconnectCount(prev => prev + 1);
      }
    });

    // Listen for all tickers
    client.subscribe("_ticker", (ticker: TickerData) => {
      setTickers(prev => ({
        ...prev,
        [ticker.symbol]: ticker,
      }));
      setLastUpdate(Date.now());
    });

    // Subscribe to individual tickers
    WATCHLIST.forEach(sym => {
      client.subscribe(sym, (ticker: TickerData) => {
        setTickers(prev => ({
          ...prev,
          [ticker.symbol]: ticker,
        }));
      });
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, []);

  const getTicker = useCallback(
    (symbol: string): TickerData | undefined => tickers[symbol],
    [tickers]
  );

  return (
    <MarketDataContext.Provider
      value={{
        connectionState,
        tickers,
        selectedSymbol,
        lastUpdate,
        reconnectCount,
        setSelectedSymbol,
        getTicker,
      }}
    >
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData() {
  const ctx = useContext(MarketDataContext);
  if (!ctx) throw new Error("useMarketData must be used within MarketDataProvider");
  return ctx;
}

export function useTicker(symbol: string): TickerData | undefined {
  const { getTicker } = useMarketData();
  return getTicker(symbol);
}

// ─── MARKET STATISTICS HOOK ───────────────────────────────────────
export interface MarketStats {
  gainers: TickerData[];
  losers: TickerData[];
  mostActive: TickerData[];
  avgChange: number;
  positiveCount: number;
  negativeCount: number;
}

export function useMarketStats(): MarketStats {
  const { tickers } = useMarketData();
  const values = Object.values(tickers).filter(t => t.price > 0);

  const sorted = [...values].sort((a, b) => b.changePct24h - a.changePct24h);
  const gainers = sorted.filter(t => t.changePct24h > 0).slice(0, 5);
  const losers = sorted.filter(t => t.changePct24h < 0).slice(-5).reverse();
  const mostActive = [...values].sort((a, b) => b.volume24h - a.volume24h).slice(0, 5);

  const positiveCount = values.filter(t => t.changePct24h > 0).length;
  const negativeCount = values.filter(t => t.changePct24h < 0).length;
  const avgChange = values.length > 0
    ? values.reduce((sum, t) => sum + t.changePct24h, 0) / values.length
    : 0;

  return { gainers, losers, mostActive, avgChange, positiveCount, negativeCount };
}
