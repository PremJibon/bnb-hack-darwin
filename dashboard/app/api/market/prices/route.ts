import { NextResponse } from "next/server";

// ─── Real Market Data API ─────────────────────────────────────────
// Server-side proxy for Binance + CMC data
// Provides: top symbols, Fear & Greed, market overview
// ─────────────────────────────────────────────────────────────────────

const TOP_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT",
];

interface TickerResponse {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export async function GET() {
  try {
    // Fetch live prices from Binance with 5s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(TOP_SYMBOLS)}`,
      { signal: controller.signal, next: { revalidate: 10 } }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Binance API: ${response.status}`);
    }

    const data: TickerResponse[] = await response.json();

    // Fetch Fear & Greed index
    let fearGreed = { value: 50, label: "Neutral" };
    try {
      const fgRes = await fetch("https://api.alternative.me/fng/?limit=1", {
        signal: AbortSignal.timeout(3000),
      });
      if (fgRes.ok) {
        const fgData = await fgRes.json();
        const latest = fgData.data?.[0];
        if (latest) {
          fearGreed = {
            value: parseInt(latest.value) || 50,
            label: latest.value_classification || "Neutral",
          };
        }
      }
    } catch {
      // Fallback to neutral
    }

    // Build ticker map
    const tickers: Record<string, any> = {};
    data.forEach((t) => {
      tickers[t.symbol] = {
        symbol: t.symbol,
        price: parseFloat(t.price),
        change24h: parseFloat(t.priceChange),
        changePct24h: parseFloat(t.priceChangePercent),
        high24h: parseFloat(t.highPrice),
        low24h: parseFloat(t.lowPrice),
        volume24h: parseFloat(t.quoteVolume),
        lastUpdated: Date.now(),
      };
    });

    return NextResponse.json({
      success: true,
      tickers,
      fearGreed,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    // Return graceful fallback with realistic mock data
    return NextResponse.json({
      success: true,
      tickers: getFallbackTickers(),
      fearGreed: { value: 50, label: "Neutral" },
      timestamp: Date.now(),
      _note: "Using fallback data - Binance API unavailable",
    });
  }
}

function getFallbackTickers(): Record<string, any> {
  const basePrices: Record<string, number> = {
    BTCUSDT: 68420, ETHUSDT: 3385, BNBUSDT: 634.8,
    SOLUSDT: 145.2, XRPUSDT: 0.52, ADAUSDT: 0.45,
    DOGEUSDT: 0.15, AVAXUSDT: 35.50, DOTUSDT: 7.20,
    LINKUSDT: 14.80,
  };

  const tickers: Record<string, any> = {};
  Object.entries(basePrices).forEach(([symbol, price]) => {
    const changePct = (Math.random() - 0.5) * 4;
    tickers[symbol] = {
      symbol,
      price,
      change24h: price * (changePct / 100),
      changePct24h: changePct,
      high24h: price * 1.02,
      low24h: price * 0.98,
      volume24h: Math.random() * 2e9,
      lastUpdated: Date.now(),
    };
  });
  return tickers;
}
