# DARWIN — Evolutionary Tournament Trading Agent
## Complete Developer Guide · BNB HACK 2026

> "I do not predict the market. I evolve to survive it."

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     DARWIN (bnb-hack-darwin/)                    │
├──────────────────────────┬───────────────────────────────────────┤
│   AGENT (Python)         │   DASHBOARD (Next.js)                │
│   ─────────────          │   ──────────────────                  │
│   agent/                 │   app/                                │
│   ├── darwin.py          │   ├── page.tsx       ← Live dashboard │
│   ├── strategies.py      │   ├── layout.tsx     ← Data context   │
│   ├── risk_guard.py      │   ├── globals.css    ← Dark theme     │
│   ├── brain.py           │   ├── api/                            │
│   ├── cmc_client.py      │   │   ├── market/prices  ← Binance    │
│   ├── twak_client.py     │   │   ├── portfolio     ← P&L tracking│
│   ├── bnb_agent.py       │   │   ├── trade         ← Kill Switch │
│   ├── msaf1_core.py      │   │   └── chat          ← AI persona  │
│   ├── mev_shield.py      │   └── components/                     │
│   ├── arbitrage_scanner  │       ├── OrderBookDepth  ← Depth viz │
│   ├── heartbeat.py       │       ├── MarketStats     ← Live stats│
│   ├── openclaw_wallet.py │       ├── PriceTicker     ← WS prices │
│   ├── state_manager.py   │       └── 15 more...                 │
│   └── redis_state.py     │   lib/                                │
│                          │   ├── market-data.ts     ← WS client  │
│   .github/workflows/     │   ├── websocket-context  ← React ctx  │
│   └── agent.yml          │   └── use-portfolio.ts   ← API hooks  │
└──────────────────────────┴───────────────────────────────────────┘
```

## Data Flow

```
Binance WebSocket API           ──►  lib/market-data.ts (WS client)
        │                                    │
        ▼                                    ▼
   lib/websocket-context.tsx  ──►  All dashboard components
        │
        ▼
   app/page.tsx (renders live prices, order book, stats)

GitHub Actions (agent) ──► Gist API ──► app/api/market/prices ──► Dashboard
                        ──► Redis  ──► app/api/portfolio    ──► Dashboard
```

## API Endpoints (Dashboard Backend)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/market/prices` | GET | Live Binance prices + Fear & Greed |
| `/api/portfolio` | GET/POST | Portfolio tracking & P&L |
| `/api/trade` | GET/POST | Kill Switch, Close Position, Pause |
| `/api/chat` | POST | AI chat (The Sandman persona) |

## Live Data Stack

- **Binance WebSocket** — 24hr ticker for 20 major tokens (auto-reconnect, exponential backoff)
- **Fear & Greed Index** — from alternative.me API (polled every 5 min)
- **Market Statistics** — gainers/losers, volume leaders derived from WebSocket data
- **Order Book Depth** — professional bid/ask spread visualization

## Deployment

```bash
# Deploy dashboard to Vercel
cd dashboard
npm install
npm run build
vercel --prod

# Set environment variables on Vercel:
#   NEXT_PUBLIC_GIST_ID, GROQ_API_KEY, OPENROUTER_API_KEY, AGENTWALLETAPI_KEY
```

## API Keys Required for Vercel

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_GIST_ID` | Create a private Gist on GitHub |
| `GROQ_API_KEY` | console.groq.com (free) |
| `OPENROUTER_API_KEY` | openrouter.ai (free credits) |
| `AGENTWALLETAPI_KEY` | OpenClawCash dashboard |

## Key Files Reference

| File | What It Does |
|------|-------------|
| `agent/darwin.py` | Main agent loop (called by GitHub Actions) |
| `agent/strategies.py` | 4 strategy genes + evolution engine |
| `agent/risk_guard.py` | 3-level drawdown shield (15%, 22%, 27%) |
| `agent/brain.py` | Groq/OpenRouter LLM inference |
| `agent/openclaw_wallet.py` | Real wallet operations via OpenClawCash |
| `dashboard/lib/market-data.ts` | Binance WebSocket client with reconnect |
| `dashboard/lib/websocket-context.tsx` | React context for live data |
| `dashboard/lib/use-portfolio.ts` | Portfolio hooks (kill switch, close) |
| `dashboard/app/components/OrderBookDepth.tsx` | Professional order book |
| `dashboard/app/components/MarketStats.tsx` | Live market gainers/losers |
| `.github/workflows/agent.yml` | 6-hour cron for agent execution |

## Quick Start

```bash
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys
python app.py
cd dashboard && npm install && npm run build
```

## Track & Bounties

**BNB HACK 2026 — AI Trading Agent Edition**
- Track: Autonomous Trading Agents
- Bounties: Best Use of TWAK, OpenClawCash Integration
