#!/usr/bin/env python3
"""
MSAF-1: The Sandman — Main Entry Point.
Bridges the MSAF-1 engine with state persistence (Gist + Redis).

"I do not chase hypes. I exploit block-space friction."

This is the entry point called by GitHub Actions every 6 hours.
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger("msaf1")


def setup_logging():
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(os.path.join(log_dir, "msaf1.log")),
        ],
    )


def run_tick(state: dict) -> dict:
    """
    One complete MSAF-1 tick cycle:
    1. Scan mempool (MEV Shield)
    2. Scan for arbitrage dislocations
    3. Check heartbeat requirement
    4. Determine risk tier
    5. Consult The Sandman brain (or bypass for emergency)
    6. Execute trade (or IDLE)
    7. Update state
    """
    print(f"\n{'='*60}")
    print(f"  MSAF-1: The Sandman — Tick Starting")
    print(f"  {datetime.now(timezone.utc).isoformat()}")
    print(f"  Portfolio: ${state.get('portfolio_usd', 200):.2f}")
    print(f"{'='*60}")

    from agent.msaf1_core import MSAF1Engine, run_msaf1_tick

    # Delegate to the MSAF-1 engine
    new_state = run_msaf1_tick(state)

    # Update portfolio tracking
    portfolio = new_state.get("portfolio_usd", 200.0)
    peak = new_state.get("portfolio_peak_usd", portfolio)
    if portfolio > peak:
        new_state["portfolio_peak_usd"] = portfolio
        new_state["current_drawdown_pct"] = 0.0
    else:
        dd = ((peak - portfolio) / peak) * 100
        new_state["current_drawdown_pct"] = round(max(0, dd), 2)

    # Track daily performance
    start_of_day = new_state.get("portfolio_start_of_day_usd", portfolio)
    if start_of_day == 0:
        new_state["portfolio_start_of_day_usd"] = portfolio

    # Track consecutive losses
    last_trade = new_state.get("trade_log", [])[-1] if new_state.get("trade_log") else None
    if last_trade and last_trade.get("pnl_pct", 0) < 0:
        new_state["consecutive_losses"] = new_state.get("consecutive_losses", 0) + 1
    else:
        new_state["consecutive_losses"] = 0

    # Build portfolio history
    history = new_state.get("portfolio_history", [])
    history.append(portfolio)
    new_state["portfolio_history"] = history[-50:]

    # Update last tick
    new_state["last_tick"] = datetime.now(timezone.utc).isoformat()
    new_state["last_tick_ts"] = time.time()

    # Build shield status for dashboard
    from agent.mev_shield import MEVShield
    shield = MEVShield(new_state)
    new_state["shield_status"] = shield.get_shield_status()

    # Build risk shield for dashboard
    from agent.risk_guard import RiskGuard
    risk = RiskGuard(portfolio, new_state)
    new_state["risk_shield"] = risk.get_shield_summary()

    print(f"\n{'='*60}")
    print(f"  Tick Summary:")
    print(f"  Portfolio: ${new_state['portfolio_usd']:.2f}")
    print(f"  Drawdown: {new_state['current_drawdown_pct']:.1f}%")
    print(f"  Risk Tier: {new_state.get('msaf1_risk_tier', 'NORMAL')}")
    print(f"  MEV Attacks Blocked: {new_state.get('mev_attacks_blocked', 0)}")
    print(f"  Trades: {new_state.get('total_trades', 0)}")
    print(f"{'='*60}")

    return new_state


def main():
    setup_logging()

    print(f"\n{'='*60}")
    print(f"  MSAF-1: The Sandman")
    print(f"  MEV-Shield & Arbitrage-Frontrunner")
    print(f"  \\\"I do not chase hypes. I exploit block-space friction.\\\"")
    print(f"{'='*60}")

    # Load state from Gist
    from agent.state_manager import GistStateManager
    state_mgr = GistStateManager()
    state = state_mgr.load()

    # Also try to load from Redis for any real-time data
    from agent.redis_state import RedisStateManager
    redis_mgr = RedisStateManager()
    redis_state = redis_mgr.load_state()
    if redis_state:
        # Merge Redis data on top (Redis has more recent real-time metrics)
        for key in ["shield_status", "risk_shield", "gas_gwei_avg",
                     "mev_attacks_blocked", "arbitrage_opportunities",
                     "msaf1_telemetry", "msaf1_strategy", "msaf1_risk_tier",
                     "gas_history"]:
            if key in redis_state:
                state[key] = redis_state[key]

    print(f"\nStarting state:")
    print(f"   Portfolio: ${state.get('portfolio_usd', 0):.2f}")
    print(f"   Peak: ${state.get('portfolio_peak_usd', 0):.2f}")
    print(f"   Drawdown: {state.get('current_drawdown_pct', 0):.1f}%")
    print(f"   Total trades: {state.get('total_trades', 0)}")
    print(f"   MEV attacks blocked: {state.get('mev_attacks_blocked', 0)}\n")

    # Run the MSAF-1 tick
    new_state = run_tick(state)

    # Save state to Gist (persistent backup)
    state_mgr.save(new_state)

    # Save to Redis (real-time dashboard access)
    redis_mgr.save_state(new_state)

    # Push live metrics
    live_metrics = {
        "portfolio_usd": new_state.get("portfolio_usd"),
        "current_drawdown_pct": new_state.get("current_drawdown_pct"),
        "mev_attacks_blocked": new_state.get("mev_attacks_blocked"),
        "total_trades": new_state.get("total_trades"),
        "total_arb_trades": new_state.get("total_arb_trades", 0),
        "msaf1_risk_tier": new_state.get("msaf1_risk_tier", "NORMAL"),
        "last_tick_ts": new_state.get("last_tick_ts", 0),
        "gas_gwei_avg": new_state.get("shield_status", {}).get("gas_gwei", 5),
        "dislocation_pct": new_state.get("msaf1_telemetry", {}).get("detected_dislocation_pct", 0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    redis_mgr.push_live_metrics(live_metrics)

    last_dec = new_state.get("last_decision", {})
    strategy = new_state.get("msaf1_strategy", {})
    print(f"\nSummary:")
    print(f"   Action: {strategy.get('action', last_dec.get('decision', 'NONE'))}")
    print(f"   Rationale: {strategy.get('rationale', '')}")
    print(f"   Risk Tier: {new_state.get('msaf1_risk_tier', 'NORMAL')}")
    print(f"   State saved to Gist + Redis.")


if __name__ == "__main__":
    main()
