#!/usr/bin/env python3
"""
DARWIN - Main Agent Loop.
Runs via GitHub Actions every 6 hours.
"""

import os
import sys
import json
import logging
import random
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.strategies import GenePool
from agent.risk_guard import RiskGuard
from agent.brain import call_brain
from agent.cmc_client import CMCClient
from agent.twak_client import TWAKExecutor
from agent.state_manager import GistStateManager, INITIAL_STATE

logger = logging.getLogger("darwin")


def setup_logging():
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(os.path.join(log_dir, "darwin.log")),
        ],
    )


def run_tick(state: dict) -> dict:
    """One complete DARWIN tick - observe, score, think, guard, act, log."""
    print(f"\nDARWIN TICK - {datetime.now(timezone.utc).isoformat()}")

    # Step 1: OBSERVE
    print("Fetching market data...")
    cmc = CMCClient()
    bep20_tokens = cmc.fetch_top_bep20(limit=30)
    trending = cmc.fetch_trending()
    categories = cmc.fetch_categories()
    fear_greed = cmc.fetch_fear_greed()
    tokens_with_signals = generate_paper_signals(bep20_tokens, trending, categories, fear_greed)

    market_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tokens": bep20_tokens,
        "trending": trending,
        "categories": categories,
        "fear_greed": fear_greed.get("value", 50),
        "fear_greed_label": fear_greed.get("label", "Neutral"),
        "fear_greed_trend": fear_greed.get("trend_7d", []),
        "portfolio_usd": state.get("portfolio_usd", INITIAL_STATE["portfolio_usd"]),
        "drawdown_pct": state.get("current_drawdown_pct", 0),
        "open_positions": len(state.get("open_positions", [])),
    }

    # Step 2: SCORE
    print("Scoring gene fitness...")
    genes = GenePool(state.get("genes", {}))
    for gene in genes.genes:
        token_signal = tokens_with_signals.get(gene.name)
        if token_signal and random.random() < 0.6:
            entry = token_signal["price"]
            exit_price = entry * (1 + (gene.take_profit_pct / 100) * random.uniform(0.5, 1.0))
            if random.random() < 0.55:
                genes.simulate_paper_trade(gene, token_signal["symbol"], "BUY", entry, exit_price)
            else:
                loss_exit = entry * (1 + (gene.stop_loss_pct / 100) * random.uniform(0.8, 1.2))
                genes.simulate_paper_trade(gene, token_signal["symbol"], "BUY", entry, loss_exit)

    gene_scores = genes.update_fitness_scores()
    for name, score in gene_scores.items():
        print(f"   {name:<8}: {score:.4f}")

    # Step 3: THINK
    print("Consulting DARWIN brain (Groq)...")
    decision = call_brain(market_data, gene_scores)
    print(f"   Decision: {decision.get('action', 'HOLD')} "
          f"{decision.get('token', 'N/A')} "
          f"via {decision.get('recommended_gene', 'NONE')} "
          f"(conf: {decision.get('confidence', 0):.2f})")
    print(f"   Thought: {decision.get('darwin_thought', '')}")

    # Step 4: GUARD
    print("Risk Guard check...")
    trade_amount = _calculate_position_size(state, decision)
    risk = RiskGuard(
        portfolio_value_usd=state.get("portfolio_usd", INITIAL_STATE["portfolio_usd"]),
        state=state,
    )
    trade_approved, approval_reason = risk.approve_trade(trade_amount, decision.get("confidence", 0))
    print(f"   {approval_reason}")

    # Step 5: ACT
    trade_result = None
    if trade_approved and decision.get("action") in ("BUY", "SELL"):
        print("Executing via TWAK...")
        twak = TWAKExecutor(dry_run=True)
        if os.environ.get("DRY_RUN", "true").lower() == "false":
            twak.dry_run = False
        trade_result = twak.execute_swap(
            from_token="BNB" if decision["action"] == "BUY" else decision.get("token", "BNB"),
            to_token=decision.get("token", "BNB") if decision["action"] == "BUY" else "BNB",
            amount_usd=trade_amount,
            gene_name=decision.get("recommended_gene", "NONE"),
            reason=decision.get("reasoning", ""),
        )
        print(f"   TX: {trade_result.get('tx_hash', 'dry-run')[:20]}...")
    else:
        print(f"   No trade - {decision.get('action', 'HOLD')}")

    # Step 6: EVOLVE (daily at 00:00 UTC)
    current_hour = datetime.now(timezone.utc).hour
    evolved = False
    if current_hour == 0:
        print("DAILY EVOLUTION CYCLE...")
        genes.evolve()
        evolved = True

    # Step 7: BUILD NEW STATE
    new_state = dict(state)
    new_state.update({
        "last_tick": datetime.now(timezone.utc).isoformat(),
        "genes": genes.to_dict(),
        "gene_scores": gene_scores,
        "last_decision": {
            "decision": decision.get("action"),
            "token": decision.get("token"),
            "gene": decision.get("recommended_gene"),
            "confidence": decision.get("confidence"),
            "reasoning": decision.get("reasoning"),
            "darwin_thought": decision.get("darwin_thought"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "last_trade": trade_result,
        "total_trades": state.get("total_trades", 0) + (1 if trade_result else 0),
        "ticks_since_last_loss": state.get("ticks_since_last_loss", 99) + 1,
        "market_snapshot": market_data,
    })

    if evolved:
        new_state["generation"] = state.get("generation", 1) + 1
        evo_history = state.get("evolution_history", [])
        evo_history.append({
            "generation": new_state["generation"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "scores": gene_scores,
        })
        new_state["evolution_history"] = evo_history[-20:]

    trade_log = state.get("trade_log", [])
    if trade_result:
        trade_log.append(trade_result)
    new_state["trade_log"] = trade_log[-100:]

    print(f"\nTick complete. Portfolio: ${new_state['portfolio_usd']:.2f}")
    return new_state


def generate_paper_signals(tokens, trending, categories, fear_greed):
    signals = {}
    if not tokens:
        return signals

    vol_sorted = sorted(tokens, key=lambda t: t.get("volume_24h", 0), reverse=True)
    if vol_sorted:
        signals["PULSE"] = vol_sorted[0]

    if trending:
        signals["WAVE"] = {"symbol": trending[0].get("symbol", "LINK"), "price": 14.0}

    dropped = sorted(tokens, key=lambda t: t.get("percent_change_24h", 0))
    if dropped and dropped[0].get("percent_change_24h", 0) < -3:
        signals["GRAVITY"] = dropped[0]

    if categories:
        top_cat = max(categories, key=lambda c: c.get("market_cap_change_24h", 0))
        if top_cat.get("market_cap_change_24h", 0) > 5:
            signals["PHANTOM"] = tokens[1] if len(tokens) > 1 else tokens[0]
    return signals


def _calculate_position_size(state, decision):
    base = state.get("portfolio_usd", INITIAL_STATE["portfolio_usd"]) * 0.04
    adjusted = base * decision.get("position_size_multiplier", 0.75)
    max_size = state.get("portfolio_usd", 200) * 0.05
    return min(adjusted, max_size, 50.0)


def main():
    setup_logging()
    print("=" * 60)
    print("  DARWIN - Evolutionary Tournament Trading Agent")
    print('  "I do not predict the market. I evolve to survive it."')
    print("=" * 60)

    state_mgr = GistStateManager()
    state = state_mgr.load()

    print(f"\nStarting state:")
    print(f"   Portfolio: ${state.get('portfolio_usd', 0):.2f}")
    print(f"   Generation: {state.get('generation', 1)}")
    print(f"   Total trades: {state.get('total_trades', 0)}\n")

    new_state = run_tick(state)
    state_mgr.save(new_state)
    print("State saved.")

    last_dec = new_state.get("last_decision", {})
    print(f"\nSummary:")
    print(f"   Action: {last_dec.get('decision', 'NONE')}")
    print(f"   Gene: {last_dec.get('gene', 'NONE')}")
    print(f"   Confidence: {last_dec.get('confidence', 0):.2f}")
    print(f"   Thought: {last_dec.get('darwin_thought', '')}")


if __name__ == "__main__":
    main()
