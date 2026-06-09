# 🧬 DARWIN — Evolutionary Tournament Trading Agent

> *"I do not predict the market. I evolve to survive it."* — DARWIN Agent

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://darwin-trading-agent.vercel.app)
[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![BNB Chain](https://img.shields.io/badge/BNB%20Chain-BSC%20Testnet-yellow?logo=binance)](https://testnet.bnbchain.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🏆 BNB HACK 2026 — AI Trading Agent Edition

**Track:** Autonomous Trading Agents  
**Bounties:** Best Use of TWAK · OpenClawCash Integration  

**DARWIN** is an **industry-grade autonomous trading agent** for BNB Chain that runs 4 competing AI strategy genes in parallel. Only the fittest gene executes real trades. Every 24 hours, the weakest gene *evolves* toward the strongest.

This is the **first trading agent that learns *which strategy works*** rather than *which token to buy*.

---

## ✨ Key Features

### 🔬 Evolutionary Engine
- **4 Strategy Genes** — PULSE (volume), WAVE (social), GRAVITY (reversion), PHANTOM (rotation)
- **Fitness Scoring** — win_rate × profit_factor × recency_weight
- **Daily Evolution** — weakest gene mutates 30% toward the strongest
- **Paper Trade Mode** — virtual trades before real execution

### 📊 Live Trading Dashboard
- **Binance WebSocket** — real-time prices for 20 major tokens (BTC, ETH, BNB, SOL, XRP...)
- **Order Book Depth** — professional bid/ask spread visualization
- **Market Stats** — top gainers/losers, volume leaders, Fear & Greed index
- **Functional Kill Switch** — emergency shutdown that closes all positions
- **Connection Status** — live WebSocket health indicator
- **Shotgun Controls** — Close/Kill buttons per position
- **Portfolio Tracking** — P&L, win rate, day performance chart
- **AI Chat Panel** — "The Sandman" persona for real-time trading insights

### 🛡️ Risk Management (3-Level Shield)
| Level | Drawdown | Action |
|-------|----------|--------|
| 🟢 NORMAL | < 15% | Full operations |
| 🟡 LEVEL 1 | 15–22% | 50% trade size reduction |
| 🟠 LEVEL 2 | 22–27% | 80% reduction, top-10 tokens only |
| 🔴 CRITICAL | ≥ 27% | **Atomic Liquidation** — bypasses LLM entirely |

### 🔌 Live Data Infrastructure
- **Binance WebSocket API** — real-time 24hr ticker streams with auto-reconnect
- **CoinMarketCap API** — market data and x402 premium endpoints
- **Fear & Greed Index** — live market sentiment from alternative.me
- **BSCScan Gas Tracker** — real-time BNB Chain gas prices
- **Upstash Redis** — real-time state streaming to dashboard

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DARWIN AGENT SYSTEM                         │
│                                                                 │
│  GitHub Actions (Cron: every 6h)                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TICK LOOP (agent/darwin.py)                             │  │
│  │  1. OBSERVE → CMC + BSC data                             │  │
│  │  2. SCORE → Update gene fitness                          │  │
│  │  3. THINK → Groq/OpenRouter LLM decision                 │  │
│  │  4. GUARD → 3-level risk check                           │  │
│  │  5. ACT → TWAK / OpenClawCash execution                  │  │
│  │  6. EVOLVE → Mutate weakest gene (24h cycle)            │  │
│  │  7. LOG → Push state to Gist + Redis                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Vercel (Next.js Dashboard — Industry-Grade)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Live P&L | Order Book | Market Stats | Gene Leaderboard│  │
│  │  Drawdown Meter | Kill Switch | AI Chat | Portfolio     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Infrastructure Stack (100% Free Tier)

| Component | Service | Cost |
|-----------|---------|------|
| Agent Brain | GitHub Actions | Free (2000 min/month) |
| Dashboard | Vercel Hobby | Free |
| State Store | GitHub Gist API | Free |
| Real-time State | Upstash Redis | Free (10MB) |
| LLM Fast | Groq (llama-3.1-8b) | Free |
| LLM Reasoning | OpenRouter | Free credits |
| Market Data | CoinMarketCap Basic | Free |
| Real-time Prices | Binance WebSocket | Free |
| Execution | TWAK / OpenClawCash | Testnet |

---

## 🧬 The Four Strategy Genes

<details>
<summary><strong>GENE-1: PULSE</strong> — Volume Surge Detection</summary>

```
HYPOTHESIS: Sudden volume spikes predict short-term price continuation.
TRIGGER:    volume_24h / volume_7d_avg > 2.5x
HOLD_TIME:  3 hours
STOP LOSS:  -1.5%
TAKE PROFIT: +3.0%
```
</details>

<details>
<summary><strong>GENE-2: WAVE</strong> — Social Velocity Momentum</summary>

```
HYPOTHESIS: Social attention precedes price movement by 2–6 hours.
TRIGGER:    social_velocity > +40%
HOLD_TIME:  6 hours
STOP LOSS:  -2.0%
TAKE PROFIT: +5.0%
```
</details>

<details>
<summary><strong>GENE-3: GRAVITY</strong> — Mean Reversion on Quality Tokens</summary>

```
HYPOTHESIS: Quality BEP-20 tokens revert to mean after panic dips.
TRIGGER:    price dropped > 6% in 24h AND rank < 100
HOLD_TIME:  18 hours
STOP LOSS:  -3.0%
TAKE PROFIT: +4.0%
```
</details>

<details>
<summary><strong>GENE-4: PHANTOM</strong> — Narrative Category Rotation</summary>

```
HYPOTHESIS: Laggard tokens in trending categories have the most upside.
TRIGGER:    category top token gained > 8% AND laggard behind > 5%
HOLD_TIME:  9 hours
STOP LOSS:  -2.5%
TAKE PROFIT: +6.0%
```
</details>

---

## 🚀 Quick Start

### Prerequisites

```bash
# Python 3.11+ for the agent
pip install -r requirements.txt

# Node.js 18+ for the dashboard
cd dashboard && npm install
```

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your API keys (all have free tiers)
```

| Variable | Description | Where to Get |
|----------|-------------|-------------|
| `CMC_API_KEY` | CoinMarketCap data | [pro.coinmarketcap.com](https://pro.coinmarketcap.com) |
| `GROQ_API_KEY` | Fast LLM inference | [console.groq.com](https://console.groq.com) |
| `OPENROUTER_API_KEY` | Deep reasoning LLM | [openrouter.ai](https://openrouter.ai) |
| `GITHUB_TOKEN` | Gist state persistence | GitHub Settings > Developer settings |
| `GIST_ID` | Private Gist for state | Create a private Gist |
| `AGENTWALLETAPI_KEY` | OpenClawCash wallet | OpenClawCash dashboard |
| `TWAK_ACCESS_ID` | Trust Wallet Agent Kit | [portal.trustwallet.com](https://portal.trustwallet.com) |

### 2. Run the Agent

```bash
# Local test (dry-run mode)
python app.py

# Or with GitHub Actions (runs every 6h)
# Push to GitHub — workflow runs automatically
```

### 3. Deploy the Dashboard

```bash
cd dashboard
npm install
npm run build    # Verify it compiles
vercel --prod    # Deploy to Vercel
```

---

## 📁 Project Structure

```
bnb-hack-darwin/
├── agent/                       # 🤖 Python Trading Agent
│   ├── darwin.py               # Main loop & tick orchestrator
│   ├── strategies.py           # 4 strategy genes + evolution
│   ├── risk_guard.py           # 3-level drawdown shield
│   ├── brain.py                # Groq/OpenRouter LLM
│   ├── cmc_client.py           # CMC data + x402 protocol
│   ├── twak_client.py          # TWAK swap execution
│   ├── bnb_agent.py            # bnbagent-sdk integration
│   ├── msaf1_core.py           # MSAF-1 arbitrage engine
│   ├── mev_shield.py           # Sandwich attack protection
│   ├── arbitrage_scanner.py    # Price dislocation scanner
│   ├── heartbeat.py            # 22h activity enforcement
│   ├── openclaw_wallet.py      # OpenClawCash wallet
│   ├── state_manager.py        # Gist persistence
│   └── redis_state.py          # Redis real-time state
├── dashboard/                   # 🖥️ Next.js Dashboard
│   ├── app/
│   │   ├── page.tsx            # Industry-grade dashboard
│   │   ├── layout.tsx          # Live data context provider
│   │   ├── globals.css         # Professional dark theme
│   │   ├── api/
│   │   │   └── ...             # Market, Portfolio, Trade, Chat APIs
│   │   └── components/
│   │       ├── OrderBookDepth.tsx    # Order book viz
│   │       ├── MarketStats.tsx       # Live market stats
│   │       ├── PriceTicker.tsx       # Real-time ticker
│   │       └── ... (15 components)
│   └── lib/
│       ├── market-data.ts       # Binance WebSocket client
│       ├── websocket-context.tsx # React context
│       └── use-portfolio.ts     # Portfolio hooks
├── .github/workflows/           # ⏰ GitHub Actions
│   └── agent.yml               # 6-hour cron loop
├── .env.example                 # 🔑 Environment template
├── requirements.txt             # Python dependencies
├── vercel.json                  # 🚀 Vercel config
├── AGENT.md                     # Developer guide
├── README.md                    # This file
└── SUBMISSION.md                # Hackathon submission guide
```

---

## 🖥️ Dashboard Preview

The dashboard includes **20 components** with professional dark theme:

| Component | Description |
|-----------|-------------|
| **Global Header** | Connection status, ping, brand |
| **Live Matrix Monitor** | Real-time prices from Binance WS |
| **Market Stats** | Gainers, losers, volume, Fear & Greed |
| **Order Book Depth** | Professional bid/ask depth |
| **Stats Bar** | Portfolio value, P&L, win rate |
| **Position Tracker** | Live positions with Close/Kill buttons |
| **Kill Switch** | Emergency shutdown (functional) |
| **MEV Shield** | Sandwich attack monitoring |
| **Arbitrage Scanner** | Price dislocation detection |
| **Gas Monitor** | BNB Chain gas price tracking |
| **Drawdown Meter** | 3-level shield visualization |
| **Darwin's Thought** | AI agent's inner monologue |
| **Portfolio Chart** | P&L chart with recharts |
| **Gene Tournament** | 4-gene evolution leaderboard |
| **Trade Log** | Complete trade history |
| **AI Chat Panel** | The Sandman persona chat |
| **API Key Vault** | Secure key management |
| **Notifications** | Event alerts |
| **Emergency Alert** | Functional kill switch feedback |
| **Full Branding Footer** | Captain credits & links |

---

## 👤 Creator

**Shahed Hossain Prem** (aka **Luffy**)

| Link | URL |
|------|-----|
| 🌐 Portfolio | https://threejs-and-nextjs-portfoilo-projec-indol.vercel.app/ |
| 🏢 Agency | https://yoloboat-digital.vercel.app/ |
| 📱 Instagram | [@prem_dev_yoloboat](https://www.instagram.com/prem_dev_yoloboat/) |
| 📧 Email | prempfp96@gmail.com |
| 🐙 GitHub | [PremJibon](https://github.com/PremJibon) |

---

## 📜 License

MIT — Built for [BNB HACK 2026](https://dorahacks.io/hackathon/bnbhack-twt-cmc/detail)
