# 🏆 BNB HACK 2026 — DARWIN Submission Guide

**DARWIN — Evolutionary Tournament Trading Agent**

> *"I do not predict the market. I evolve to survive it."*

---

## 📋 Quick Overview

| Item | Detail |
|------|--------|
| **Track** | 🤖 Track 1: Autonomous Trading Agents ($24,000) |
| **Bounties** | Best Use of TWAK ($2,000), Best Use of Agent Hub ($2,000), Best Use of BNB AI Agent SDK ($2,000) |
| **On-Chain Registration** | `twak compete register` → contract `0x212c61b9b72c95d95bf29cf032f5e5635629aed5` |
| **Eligible Tokens** | 149 BEP-20 tokens (listed below — trades outside this list don't count) |
| **Drawdown Cap** | 30% max — disqualification if exceeded |
| **Minimum Trades** | 1 per day (7 over the trading week) |
| **Live Trading** | June 22–28, 2026 |
| **Submission Deadline** | June 21, 2026 |

---

## 🚀 Live Dashboard

**URL:** https://dashboard-weld-chi-90.vercel.app

---

## 🧬 Project Overview

DARWIN is an **evolutionary AI trading agent** on BNB Chain that runs 4 competing strategy genes in parallel. Only the fittest gene executes real trades. Every 24 hours, the weakest gene *evolves* toward the strongest.

**Key Innovation:** This is the first trading agent that learns *which strategy works* rather than *which token to buy*.

### The Four Strategy Genes

| Gene | Strategy | Trigger | Hold |
|------|----------|---------|------|
| **PULSE** | Volume Surge Detection | 2.5x volume ratio | 3h |
| **WAVE** | Social Velocity Momentum | +40% social velocity | 6h |
| **GRAVITY** | Mean Reversion | -6% in 24h, rank < 100 | 18h |
| **PHANTOM** | Category Rotation | Top token +8%, laggard -5% | 9h |

---

## 📁 Project Structure

```
bnb-hack-darwin/
├── agent/           # Python autonomous trading agent (GitHub Actions)
│   ├── darwin.py          # Main loop — entry point
│   ├── strategies.py      # 4 genes + evolution engine
│   ├── risk_guard.py      # 3-level drawdown shield (25%/22%/15% + 30% DQ hard stop)
│   ├── brain.py           # Groq/OpenRouter LLM inference
│   ├── cmc_client.py      # CoinMarketCap data + x402 protocol
│   ├── twak_client.py     # TWAK execution + competition registration
│   ├── msaf1_core.py      # MSAF-1: The Sandman arbitrage engine
│   ├── mev_shield.py      # Sandwich attack protection
│   ├── openclaw_wallet.py # Wallet operations
│   └── state_manager.py   # Gist persistence
├── dashboard/      # Next.js industry-grade trading dashboard
│   ├── app/
│   │   ├── page.tsx       # Live dashboard (20+ components)
│   │   ├── api/
│   │   │   ├── market/    # Binance WS + Fear & Greed
│   │   │   ├── portfolio/ # P&L tracking
│   │   │   ├── trade/     # Kill Switch execution
│   │   │   └── chat/      # AI chat (The Sandman)
│   │   └── components/    # OrderBookDepth, MarketStats, PriceTicker...
│   └── lib/               # Binance WebSocket client + React context
├── .github/workflows/     # GitHub Actions (6h cron loop)
└── .env.example           # All required API keys
```

---

## 🔧 Registration Steps (Track 1)

**Must be completed before June 22, 2026 (trading window opens).**

### 1. Set Up API Keys

| Variable | Where to Get |
|----------|-------------|
| `CMC_API_KEY` | https://pro.coinmarketcap.com (free Basic plan) |
| `GROQ_API_KEY` | https://console.groq.com (free, 30 req/min) |
| `OPENROUTER_API_KEY` | https://openrouter.ai (free credits) |
| `TWAK_ACCESS_ID` + `TWAK_HMAC_SECRET` | https://portal.trustwallet.com |
| `GIST_ID` + `GITHUB_TOKEN` | Create a private GitHub Gist |
| `AGENTWALLETAPI_KEY` | OpenClawCash dashboard |

### 2. Register Your Agent On-Chain

```bash
# Install TWAK CLI
curl -fsSL https://agent-kit.trustwallet.com/install.sh | bash
twak init --mode agent-wallet

# Register for the competition
twak compete register --contract 0x212c61b9b72c95d95bf29cf032f5e5635629aed5

# Verify registration
twak compete status --contract 0x212c61b9b72c95d95bf29cf032f5e5635629aed5
```

The agent will also auto-register on startup via `agent/twak_client.py` → `register_for_competition()`.

### 3. Configure GitHub Actions

Push the repo to GitHub. The agent runs automatically every 6 hours via `.github/workflows/agent.yml`. Add all secrets in **Settings → Secrets and variables → Actions**.

### 4. Deploy Dashboard

```bash
cd dashboard
npm install
npm run build    # ✅ Verified: builds clean
vercel --prod    # Deploy
```

---

## 🛡️ Risk Management (Aligned with 30% DQ Cap)

| Level | Drawdown | Action Taken |
|-------|----------|-------------|
| 🟢 NORMAL | < 15% | Full operations, 2 max positions |
| 🟡 LEVEL 1 | 15–22% | 50% trade size reduction |
| 🟠 LEVEL 2 | 22–25% | 80% reduction, restricted token list |
| 🔴 CRITICAL SHIELD | ≥ 25% | **Atomic Liquidation** — bypasses LLM, closes all positions |
| 🚫 DISQUALIFICATION | ≥ 30% | **Hard stop** — all trading halted (hackathon DQ threshold) |

---

## 📊 Eligible Tokens (149)

Trades must use tokens from the BNB HACK 2026 eligible list. *Trades outside this list do not count towards competition score.*

ETH, USDT, USDC, XRP, TRX, DOGE, ZEC, ADA, LINK, BCH, DAI, TON, USD1, USDe, M, LTC, AVAX, SHIB, XAUt, WLFI, H, DOT, UNI, ASTER, DEXE, USDD, ETC, AAVE, ATOM, U, STABLE, FIL, INJ, NIGHT, FET, TUSD, BONK, PENGU, CAKE, SIREN, LUNC, ZRO, KITE, FDUSD, BEAT, PIEVERSE, BTT, NFT, EDGE, FLOKI, LDO, B, FF, PENDLE, NEX, STG, AXS, TWT, HOME, RAY, COMP, GWEI, XCN, GENIUS, XPL, BAT, SKYAI, APE, IP, SFP, TAG, NXPC, AB, SAHARA, 1INCH, CHEEMS, BANANAS31, RIVER, MYX, RAVE, SNX, FORM, LAB, HTX, USDf, CTM, BDX, SLX, UB, DUCKY, FRAX, BILL, WFI, KOGE, ALE, FRXUSD, USDF, GOMINING, VCNT, GUA, DUSD, SMILEK, 0G, BEAM, MY, SOON, REAL, Q, AIOZ, ZIG, YFI, TAC, lisUSD, CYS, ZAMA, TRIA, HUMA, PLUME, ZIL, XPR, ZETA, BabyDoge, NILA, ROSE, VELO, UAI, BRETT, OPEN, BSB, TOSHI, BAS, ACH, AXL, LUR, ELF, KAVA, APR, IRYS, EURI, XUSD, BARD, DUSK, SUSHI, PEAQ, COAI, BDCA, XAUM

---

## 🏆 Prizes

| Place | Amount |
|------|--------|
| 🥇 1st | $10,000 |
| 🥈 2nd | $6,000 |
| 🥉 3rd | $4,000 |
| 4th | $2,000 |
| 5th | $2,000 |

**Special Prizes ($2,000 each):**
- 🏅 Best Use of Trust Wallet Agent Kit
- 🏅 Best Use of Agent Hub (CMC)
- 🏅 Best Use of BNB AI Agent SDK

---

## 📅 Timeline

| Date | Event |
|------|-------|
| June 3, 2026 | Registration opens |
| June 3–21 (3 weeks) | Build window |
| **June 21 (12pm UTC)** | **Submission deadline** |
| June 22–28 (1 week) | Live trading window (Track 1) |
| June 29 – July 5 | Judging |
| Week of July 6 | Winners announced |

---

## 🎥 Demo Video Checklist (2-3 min)

1. [ ] Show live dashboard with real-time Binance WebSocket prices
2. [ ] Demonstrate the **Order Book Depth** visualization
3. [ ] Click the **Kill Switch** — show emergency alert banner
4. [ ] Use the **AI Chat Panel** — ask "What's the market doing?"
5. [ ] Show **Market Stats** — gainers, losers, Fear & Greed
6. [ ] Show GitHub Actions running the agent
7. [ ] End with your portfolio link: https://threejs-and-nextjs-portfoilo-projec-indol.vercel.app/

---

## 👤 Team

| Field | Value |
|-------|-------|
| **Captain** | Shahed Hossain Prem (Luffy) |
| **Portfolio** | https://threejs-and-nextjs-portfoilo-projec-indol.vercel.app/ |
| **Agency** | Yoloboat Digital |
| **GitHub** | https://github.com/PremJibon/bnb-hack-darwin |
| **Email** | prempfp96@gmail.com |

---

> *"I do not predict the market. I evolve to survive it."*
