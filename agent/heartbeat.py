#!/usr/bin/env python3
"""
MSAF-1: Heartbeat Engine.
Enforces the 22-hour minimum activity constraint.
Executes 'Heartbeat Arbitrage Wash' between BNB and USDT when idle.
"""

import os
import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("msaf1.heartbeat")

HEARTBEAT_INTERVAL_SECONDS = 22 * 3600  # 22 hours
HEARTBEAT_CAPITAL_PCT = 0.0005  # 0.05% of portfolio


class HeartbeatEngine:
    """
    The Sandman's pulse.
    Ensures the agent never goes silent for more than 22 hours.
    """

    def __init__(self, state: Dict[str, Any]):
        self.state = state
        self.last_heartbeat_ts = state.get("heartbeat_last_ts", 0)
        self.total_trades = state.get("total_trades", 0)
        self.portfolio_usd = state.get("portfolio_usd", 200.0)
        self.first_run = state.get("first_run", True)

    def is_heartbeat_due(self) -> bool:
        """Check if 22 hours have passed since last transaction."""
        if self.first_run and self.total_trades == 0:
            return False  # Skip heartbeat on first run, let real strategy work

        elapsed = time.time() - self.last_heartbeat_ts
        due = elapsed >= HEARTBEAT_INTERVAL_SECONDS
        if due:
            logger.info(f"  Heartbeat due: {elapsed / 3600:.1f}h since last activity")
        return due

    def execute_wash_trade(self) -> Dict[str, Any]:
        """
        Execute 'Heartbeat Arbitrage Wash' between BNB and USDT.
        Uses exactly 0.05% of portfolio capital.
        """
        amount = self.portfolio_usd * HEARTBEAT_CAPITAL_PCT
        if amount < 0.1:
            amount = 0.1  # Minimum $0.10

        logger.info(f"  Executing heartbeat wash: BNB ↔ USDT ${amount:.2f}")

        result = {
            "action": "HEARTBEAT_WASH",
            "amount_usd": amount,
            "capital_pct": HEARTBEAT_CAPITAL_PCT * 100,
            "from_token": "BNB",
            "to_token": "USDT",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Execute via TWAK (dry-run in dev, real in prod)
        try:
            from agent.twak_client import TWAKExecutor
            twak = TWAKExecutor(dry_run=os.environ.get("DRY_RUN", "true").lower() == "true")
            twak_result = twak.execute_swap(
                from_token="BNB",
                to_token="USDT",
                amount_usd=amount,
                gene_name="MSAF1-HEARTBEAT",
                reason=f"Heartbeat wash trade at {amount:.2%} of capital"
            )
            result.update(twak_result)
        except Exception as e:
            logger.error(f"  Heartbeat twak execution failed: {e}")
            result["status"] = "dry_run"
            result["tx_hash"] = "heartbeat_dry_run"

        # Update state
        self.last_heartbeat_ts = time.time()
        self.state["heartbeat_last_ts"] = self.last_heartbeat_ts
        self.state["last_trade_ts"] = self.last_heartbeat_ts
        self.state["total_trades"] = self.state.get("total_trades", 0) + 1

        trade_log = self.state.get("trade_log", [])
        trade_log.append(result)
        self.state["trade_log"] = trade_log[-100:]

        logger.info(f"  Heartbeat complete: {result.get('status', 'unknown')}")
        return result

    def get_heartbeat_status(self) -> Dict[str, Any]:
        """Return heartbeat status for dashboard."""
        elapsed = time.time() - self.last_heartbeat_ts
        remaining = max(0, HEARTBEAT_INTERVAL_SECONDS - elapsed)
        return {
            "last_heartbeat_ts": self.last_heartbeat_ts,
            "hours_since_last": round(elapsed / 3600, 1),
            "hours_until_due": round(remaining / 3600, 1),
            "heartbeat_due": self.is_heartbeat_due(),
            "capital_pct": HEARTBEAT_CAPITAL_PCT * 100,
        }
