import { NextResponse } from "next/server";

// ─── Portfolio API ────────────────────────────────────────────────
// Handles portfolio state: read balances, track P&L, connect to wallet
// ─────────────────────────────────────────────────────────────────────

// In-memory portfolio state (persists between requests)
let portfolioState = {
  totalEquity: 10000.00,
  dayStartEquity: 10000.00,
  historicalEquity: [10000.00],
  positions: [] as any[],
  trades: [] as any[],
  lastUpdated: Date.now(),
};

export async function GET() {
  const dayPnl = portfolioState.totalEquity - portfolioState.dayStartEquity;
  const dayPnlPct = portfolioState.dayStartEquity > 0
    ? (dayPnl / portfolioState.dayStartEquity) * 100
    : 0;

  // Calculate win rate
  const closedTrades = portfolioState.trades.filter((t: any) => t.closed);
  const wins = closedTrades.filter((t: any) => (t.pnl || 0) > 0);
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

  return NextResponse.json({
    success: true,
    portfolio: {
      totalEquity: portfolioState.totalEquity,
      dayStartEquity: portfolioState.dayStartEquity,
      dayPnl: Math.round(dayPnl * 100) / 100,
      dayPnlPct: Math.round(dayPnlPct * 100) / 100,
      totalPnl: Math.round((portfolioState.totalEquity - 10000) * 100) / 100,
      totalPnlPct: Math.round(((portfolioState.totalEquity - 10000) / 10000) * 10000) / 100,
      openPositions: portfolioState.positions,
      totalTrades: portfolioState.trades.length,
      winRate: Math.round(winRate * 100) / 100,
      lastUpdated: portfolioState.lastUpdated,
    },
    history: portfolioState.historicalEquity.slice(-100),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "UPDATE_EQUITY": {
        const { equity } = body;
        if (typeof equity === "number" && equity > 0) {
          portfolioState.totalEquity = equity;
          portfolioState.historicalEquity.push(equity);
          portfolioState.historicalEquity = portfolioState.historicalEquity.slice(-200);
          portfolioState.lastUpdated = Date.now();
        }
        break;
      }

      case "ADD_TRADE": {
        const { trade } = body;
        if (trade) {
          portfolioState.trades.push({ ...trade, timestamp: Date.now(), id: `T${Date.now()}` });
          // Update equity based on trade P&L
          if (trade.pnl) {
            portfolioState.totalEquity += trade.pnl;
            portfolioState.historicalEquity.push(portfolioState.totalEquity);
          }
          portfolioState.lastUpdated = Date.now();
        }
        break;
      }

      case "OPEN_POSITION": {
        const { position } = body;
        if (position) {
          const existing = portfolioState.positions.findIndex(
            (p: any) => p.symbol === position.symbol
          );
          if (existing >= 0) {
            portfolioState.positions[existing] = { ...position, openedAt: portfolioState.positions[existing].openedAt };
          } else {
            portfolioState.positions.push({ ...position, openedAt: new Date().toISOString() });
          }
          portfolioState.lastUpdated = Date.now();
        }
        break;
      }

      case "CLOSE_POSITION": {
        const { symbol } = body;
        portfolioState.positions = portfolioState.positions.filter(
          (p: any) => p.symbol !== symbol
        );
        portfolioState.lastUpdated = Date.now();
        break;
      }

      case "CLOSE_ALL": {
        // Close all positions at current market value
        const totalLiquidated = portfolioState.positions.reduce(
          (sum: number, p: any) => sum + (p.markPrice || 0) * (p.size || 0),
          0
        );
        portfolioState.positions = [];
        portfolioState.lastUpdated = Date.now();
        return NextResponse.json({
          success: true,
          action: "CLOSE_ALL",
          totalLiquidated: Math.round(totalLiquidated * 100) / 100,
          message: `All positions closed. Total liquidated: $${Math.round(totalLiquidated * 100) / 100}`,
        });
      }

      case "RESET_DAY": {
        portfolioState.dayStartEquity = portfolioState.totalEquity;
        portfolioState.lastUpdated = Date.now();
        break;
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, portfolio: portfolioState });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
