# DARWIN — Evolutionary Tournament Trading Agent
## Context Engineering Document · BNB HACK: AI Trading Agent Edition

> "I do not predict the market. I evolve to survive it."

## Architecture

```
.github/workflows/agent.yml  <- GitHub Actions (every 6h)
agent/
  darwin.py                  <- Main loop
  strategies.py              <- 4 genes + evolution
  risk_guard.py              <- Immutable risk rules
  brain.py                   <- Groq LLM engine
  state_manager.py           <- Gist persistence
  cmc_client.py              <- Market data
  twak_client.py             <- TWAK execution
  bnb_agent.py               <- bnbagent-sdk integration
dashboard/                   <- Next.js (Vercel)
  app/page.tsx               <- Live dashboard
  app/components/            <- Dashboard components
```

## Quick Start

```bash
pip install -r requirements.txt
cp .env.example .env
python -m agent.darwin
```

## API Keys Required

| Secret | Source |
|--------|--------|
| CMC_API_KEY | pro.coinmarketcap.com |
| GROQ_API_KEY | console.groq.com |
| OPENROUTER_API_KEY | openrouter.ai |
| GITHUB_TOKEN | GitHub Settings |
| GIST_ID | Create a private Gist |
