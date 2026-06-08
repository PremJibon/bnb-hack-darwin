# DARWIN — Evolutionary Tournament Trading Agent

> "I do not predict the market. I evolve to survive it."

DARWIN is an **evolutionary AI trading agent** for BNB Chain. It runs 4 competing strategy genes simultaneously in paper-trade mode. Only the highest-fitness gene executes real trades via TWAK (Trust Wallet Agent Kit) or bnbagent-sdk.

Every 24 hours, the weakest gene **evolves** - mutating toward the strongest gene's parameters.

## The Four Genes

| Gene | Strategy | Hypothesis |
|------|----------|-----------|
| **PULSE** | Volume Surge | Volume spikes -> short-term continuation |
| **WAVE** | Social Velocity | Social attention precedes price by 2-6h |
| **GRAVITY** | Mean Reversion | Quality tokens revert after panic dips |
| **PHANTOM** | Category Rotation | Laggards catch up in trending categories |

## Infrastructure (100% Free Tier)

- **Brain:** Python on GitHub Actions (2000 min/month free)
- **Dashboard:** Next.js on Vercel (free)
- **State:** GitHub Gist API (free)
- **LLM:** Groq (llama-3.1-8b-instant, free)
- **Data:** CoinMarketCap Basic API (free)
- **Execution:** TWAK Agent Wallet + bnbagent-sdk

## Quick Start

```bash
pip install -r requirements.txt
cp .env.example .env
python app.py
```

## For Judges

DARWIN runs an **internal tournament**. Watch genes compete in real-time on the dashboard. When a gene's fitness drops, DARWIN kills it and evolves a better one. This is the first trading agent that learns **which strategy works** rather than **which token to buy**.

---

*Built for BNB HACK: AI Trading Agent Edition*
*Track 1: Autonomous Trading Agents | Special: Best Use of TWAK*
