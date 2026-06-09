// ─── Industry-Grade Market Data Layer ───────────────────────────────
// Real-time Binance WebSocket + CMC data for professional trading
// ─────────────────────────────────────────────────────────────────────

export type Exchange = "binance" | "bybit" | "okx";

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  changePct24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdated: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBookData {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPct: number;
  lastUpdated: number;
}

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi14: number;
  macd: { macd: number; signal: number; histogram: number };
  bollinger: { upper: number; middle: number; lower: number };
  ema9: number;
  ema21: number;
  volumeSMA20: number;
}

export interface MarketSnapshot {
  tickers: Record<string, TickerData>;
  orderBooks: Record<string, OrderBookData>;
  btcDominance: number;
  totalMarketCap: number;
  fearGreedIndex: number;
  fearGreedLabel: string;
  fundingRates: Record<string, number>;
  lastUpdated: number;
}

export interface PortfolioPosition {
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  margin: number;
  leverage: number;
  openedAt: string;
}

export interface PortfolioSummary {
  totalEquity: number;
  totalPnl: number;
  totalPnlPct: number;
  dayPnl: number;
  dayPnlPct: number;
  openPositions: PortfolioPosition[];
  availableBalance: number;
  marginUsed: number;
  marginRatio: number;
}

// ─── CORE WATCHLIST (Major tokens every trader monitors) ────────────
export const WATCHLIST = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT",
  "MATICUSDT", "UNIUSDT", "ATOMUSDT", "NEARUSDT", "APTUSDT",
  "ARBUSDT", "OPUSDT", "SUIUSDT", "TIAUSDT", "SEIUSDT",
];

export const WATCHLIST_DISPLAY: Record<string, string> = {
  BTCUSDT: "BTC/USDT", ETHUSDT: "ETH/USDT", BNBUSDT: "BNB/USDT",
  SOLUSDT: "SOL/USDT", XRPUSDT: "XRP/USDT", ADAUSDT: "ADA/USDT",
  DOGEUSDT: "DOGE/USDT", AVAXUSDT: "AVAX/USDT", DOTUSDT: "DOT/USDT",
  LINKUSDT: "LINK/USDT", MATICUSDT: "MATIC/USDT", UNIUSDT: "UNI/USDT",
  ATOMUSDT: "ATOM/USDT", NEARUSDT: "NEAR/USDT", APTUSDT: "APT/USDT",
  ARBUSDT: "ARB/USDT", OPUSDT: "OP/USDT", SUIUSDT: "SUI/USDT",
  TIAUSDT: "TIA/USDT", SEIUSDT: "SEI/USDT",
};

// ─── BINANCE WEBSOCKET CLIENT ──────────────────────────────────────
export type WsMessageHandler = (data: any) => void;
export type WsConnectionState = "disconnected" | "connecting" | "connected" | "error";

export class BinanceWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private subscribers: Map<string, Set<WsMessageHandler>> = new Map();
  private connectionState: WsConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private baseDelay = 1000;
  private subscribedStreams: Set<string> = new Set();
  private url: string;

  constructor(symbols: string[] = WATCHLIST) {
    const streams = symbols.map(s => `${s.toLowerCase()}@ticker`).join("/");
    this.url = `wss://stream.binance.com:9443/ws`;
    this.subscribedStreams = new Set(symbols.map(s => `${s.toLowerCase()}@ticker`));
  }

  get state(): WsConnectionState {
    return this.connectionState;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.connectionState = "connecting";
    this.notify("_connection", { state: "connecting" });

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this.handleError(err);
      return;
    }

    this.ws.onopen = () => {
      this.connectionState = "connected";
      this.reconnectAttempts = 0;
      this.notify("_connection", { state: "connected" });

      // Subscribe to streams
      const subscribeMsg = {
        method: "SUBSCRIBE",
        params: Array.from(this.subscribedStreams),
        id: 1,
      };
      this.ws?.send(JSON.stringify(subscribeMsg));

      // Start ping interval (Binance requires ping every 3 min)
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Handle subscription confirmation
        if (data.result === null && data.id === 1) return;
        // Handle pong
        if (data.result === "Pong") return;

        // Route to subscribers
        if (data.e === "24hrTicker") {
          const ticker = this.parseTicker(data);
          this.notify(data.s, ticker);
          this.notify("_ticker", ticker);
        }
      } catch { /* ignore parse errors */ }
    };

    this.ws.onerror = () => {
      this.handleError("WebSocket error");
    };

    this.ws.onclose = () => {
      this.connectionState = "disconnected";
      this.stopPing();
      this.notify("_connection", { state: "disconnected" });
      this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.connectionState = "disconnected";
  }

  subscribe(symbol: string, handler: WsMessageHandler): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(handler);

    // Subscribe on WebSocket if connected
    if (this.connectionState === "connected" && !this.subscribedStreams.has(`${symbol.toLowerCase()}@ticker`)) {
      this.subscribedStreams.add(`${symbol.toLowerCase()}@ticker`);
      this.ws?.send(JSON.stringify({
        method: "SUBSCRIBE",
        params: [`${symbol.toLowerCase()}@ticker`],
        id: Date.now(),
      }));
    }

    return () => {
      this.subscribers.get(symbol)?.delete(handler);
    };
  }

  private parseTicker(data: any): TickerData {
    return {
      symbol: data.s,
      price: parseFloat(data.c),
      change24h: parseFloat(data.p),
      changePct24h: parseFloat(data.P),
      high24h: parseFloat(data.h),
      low24h: parseFloat(data.l),
      volume24h: parseFloat(data.v),
      lastUpdated: data.E,
    };
  }

  private notify(channel: string, data: any): void {
    const handlers = this.subscribers.get(channel);
    if (handlers) {
      handlers.forEach(h => {
        try { h(data); } catch { /* ignore handler errors */ }
      });
    }

    // Also notify wildcard subscribers
    const wildcard = this.subscribers.get("*");
    if (wildcard) {
      wildcard.forEach(h => {
        try { h({ channel, data }); } catch { /* ignore */ }
      });
    }
  }

  private handleError(err: any): void {
    this.connectionState = "error";
    this.notify("_connection", { state: "error", error: err });
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      try {
        this.ws?.send(JSON.stringify({ method: "PING", id: Date.now() }));
      } catch { /* ignore */ }
    }, 180_000); // Ping every 3 minutes
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      30_000
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// ─── CALCULATION UTILITIES ─────────────────────────────────────────
export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] >= 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

export function calculateSharpeRatio(returns: number[], riskFreeRate = 0.02): number {
  if (returns.length < 2) return 0;
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sq, r) => sq + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  return ((avgReturn * 365) - riskFreeRate) / (stdDev * Math.sqrt(365));
}

export function calculateMaxDrawdown(equity: number[]): { maxDrawdown: number; peakIndex: number; valleyIndex: number } {
  let peak = equity[0];
  let peakIndex = 0;
  let maxDrawdown = 0;
  let valleyIndex = 0;

  for (let i = 1; i < equity.length; i++) {
    if (equity[i] > peak) {
      peak = equity[i];
      peakIndex = i;
    }
    const drawdown = (peak - equity[i]) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      valleyIndex = i;
    }
  }

  return { maxDrawdown: maxDrawdown * 100, peakIndex, valleyIndex };
}

// ─── PROFESSIONAL FORMATTING ──────────────────────────────────────
export function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (price >= 0.01) return price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  return price.toFixed(8);
}

export function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
  return vol.toFixed(2);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
