#!/usr/bin/env python3
"""
MSAF-1: Upstash Redis State Management.
Real-time state persistence for the Sandman agent.
Provides faster reads than GitHub Gist for the dashboard.
"""

import os
import json
import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("msaf1.redis")

# Upstash Redis REST API
REDIS_REST_URL = os.environ.get(
    "UPSTASH_REDIS_REST_URL",
    "https://just-toucan-118941.upstash.io"
)
REDIS_REST_TOKEN = os.environ.get(
    "UPSTASH_REDIS_REST_TOKEN",
    "gQAAAAAAAdCdAAIgcDJhZmI5NmYwNGM3M2M0MjYxYjJjYWUyMTJlMjVlNzQ3MA"
)

REDIS_KEY_AGENT_STATE = "msaf1:agent_state"
REDIS_KEY_TICK_LOG = "msaf1:tick_log"
REDIS_KEY_GAS_HISTORY = "msaf1:gas_history"
REDIS_KEY_ARB_OPPORTUNITIES = "msaf1:arb_opportunities"
REDIS_KEY_LIVE_METRICS = "msaf1:live_metrics"


class RedisStateManager:
    """
    Upstash Redis-backed state manager.
    Dual-writes to both Redis (fast) and Gist (persistent backup).
    """

    def __init__(self):
        self.enabled = bool(REDIS_REST_URL and REDIS_REST_TOKEN)
        self.headers = {
            "Authorization": f"Bearer {REDIS_REST_TOKEN}",
            "Content-Type": "application/json",
        }
        self.base_url = f"{REDIS_REST_URL.rstrip('/')}"

        if self.enabled:
            logger.info("Upstash Redis state manager initialized")
        else:
            logger.warning("Upstash Redis not configured - falling back to Gist only")

    def save_state(self, state: Dict[str, Any]) -> bool:
        """Save full agent state to Redis."""
        if not self.enabled:
            return False
        try:
            import httpx
            with httpx.Client(timeout=5) as client:
                resp = client.post(
                    f"{self.base_url}/set/{REDIS_KEY_AGENT_STATE}",
                    headers=self.headers,
                    data=json.dumps(state, default=str),
                )
                # Set expiry for fresh data (24h)
                client.post(
                    f"{self.base_url}/expire/{REDIS_KEY_AGENT_STATE}/86400",
                    headers=self.headers,
                )
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Redis save failed: {e}")
            return False

    def load_state(self) -> Optional[Dict[str, Any]]:
        """Load agent state from Redis."""
        if not self.enabled:
            return None
        try:
            import httpx
            with httpx.Client(timeout=5) as client:
                resp = client.get(
                    f"{self.base_url}/get/{REDIS_KEY_AGENT_STATE}",
                    headers=self.headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    result = data.get("result")
                    if result:
                        return json.loads(result)
                return None
        except Exception as e:
            logger.error(f"Redis load failed: {e}")
            return None

    def push_tick_log(self, tick_data: Dict[str, Any]) -> bool:
        """Push a tick event to Redis list (for real-time dashboard)."""
        if not self.enabled:
            return False
        try:
            import httpx
            with httpx.Client(timeout=5) as client:
                client.post(
                    f"{self.base_url}/lpush/{REDIS_KEY_TICK_LOG}",
                    headers=self.headers,
                    data=json.dumps(tick_data, default=str),
                )
                client.post(
                    f"{self.base_url}/ltrim/{REDIS_KEY_TICK_LOG}/0/99",
                    headers=self.headers,
                )
                return True
        except Exception as e:
            logger.debug(f"Redis push_tick_log failed: {e}")
            return False

    def push_live_metrics(self, metrics: Dict[str, Any]) -> bool:
        """Push live metrics for dashboard real-time updates."""
        if not self.enabled:
            return False
        try:
            import httpx
            with httpx.Client(timeout=5) as client:
                client.post(
                    f"{self.base_url}/set/{REDIS_KEY_LIVE_METRICS}",
                    headers=self.headers,
                    data=json.dumps(metrics, default=str),
                )
                # 60-second TTL for live metrics
                client.post(
                    f"{self.base_url}/expire/{REDIS_KEY_LIVE_METRICS}/60",
                    headers=self.headers,
                )
                return True
        except Exception as e:
            logger.debug(f"Redis push_live_metrics failed: {e}")
            return False

    def save_gas_history(self, gas_entry: Dict[str, Any]) -> bool:
        """Append to gas history in Redis."""
        if not self.enabled:
            return False
        try:
            import httpx
            with httpx.Client(timeout=5) as client:
                client.post(
                    f"{self.base_url}/lpush/{REDIS_KEY_GAS_HISTORY}",
                    headers=self.headers,
                    data=json.dumps(gas_entry, default=str),
                )
                client.post(
                    f"{self.base_url}/ltrim/{REDIS_KEY_GAS_HISTORY}/0/199",
                    headers=self.headers,
                )
                return True
        except Exception as e:
            logger.debug(f"Redis save_gas_history failed: {e}")
            return False

    def get_live_metrics(self) -> Optional[Dict[str, Any]]:
        """Get current live metrics (for dashboard polling)."""
        if not self.enabled:
            return None
        try:
            import httpx
            with httpx.Client(timeout=5) as client:
                resp = client.get(
                    f"{self.base_url}/get/{REDIS_KEY_LIVE_METRICS}",
                    headers=self.headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    result = data.get("result")
                    if result:
                        return json.loads(result)
                return None
        except Exception as e:
            logger.debug(f"Redis get_live_metrics failed: {e}")
            return None

    def get_leaderboard_data(self) -> Optional[Dict[str, Any]]:
        """Get agent state parsed for dashboard leaderboard."""
        state = self.load_state()
        if not state:
            return None
        return {
            "portfolio_usd": state.get("portfolio_usd", 0),
            "current_drawdown_pct": state.get("current_drawdown_pct", 0),
            "mev_attacks_blocked": state.get("mev_attacks_blocked", 0),
            "total_trades": state.get("total_trades", 0),
            "total_arb_trades": state.get("total_arb_trades", 0),
            "msaf1_risk_tier": state.get("msaf1_risk_tier", "NORMAL"),
            "last_tick_ts": state.get("last_tick_ts", 0),
            "gas_gwei_avg": state.get("gas_gwei_avg", 5),
        }
