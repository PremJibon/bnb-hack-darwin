"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export interface PortfolioData {
  totalEquity: number;
  dayStartEquity: number;
  dayPnl: number;
  dayPnlPct: number;
  totalPnl: number;
  totalPnlPct: number;
  openPositions: any[];
  totalTrades: number;
  winRate: number;
  lastUpdated: number;
}

export interface TradeAction {
  action: "KILL_SWITCH" | "CLOSE_POSITION" | "CLOSE_ALL" | "PAUSE" | "RESUME" | "SET_STOP_LOSS";
  symbol?: string;
  params?: Record<string, any>;
}

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setPortfolio(data.portfolio);
        if (data.history) setHistory(data.history);
      }
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
    intervalRef.current = setInterval(fetchPortfolio, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPortfolio]);

  const executeAction = useCallback(async (action: TradeAction) => {
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  const killSwitch = useCallback(async () => {
    const result = await executeAction({ action: "KILL_SWITCH" });
    // Also close all positions via portfolio API
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CLOSE_ALL" }),
    });
    await fetchPortfolio();
    return result;
  }, [executeAction, fetchPortfolio]);

  const closePosition = useCallback(async (symbol: string) => {
    await executeAction({ action: "CLOSE_POSITION", symbol });
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CLOSE_POSITION", symbol }),
    });
    await fetchPortfolio();
  }, [executeAction, fetchPortfolio]);

  const closeAllPositions = useCallback(async () => {
    await executeAction({ action: "CLOSE_ALL" });
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CLOSE_ALL" }),
    });
    await fetchPortfolio();
  }, [executeAction, fetchPortfolio]);

  return {
    portfolio,
    history,
    loading,
    error,
    killSwitch,
    closePosition,
    closeAllPositions,
    fetchPortfolio,
  };
}

// ─── LIVE MARKET PRICES HOOK ─────────────────────────────────────
export interface LivePrices {
  [symbol: string]: {
    price: number;
    changePct24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  };
}

export function useLivePrices() {
  const [prices, setPrices] = useState<LivePrices | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("/api/market/prices");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPrices(data.tickers);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  return { prices, loading };
}
