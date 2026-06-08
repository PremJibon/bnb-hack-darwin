#!/usr/bin/env python3
"""
MSAF-1: The Sandman — MEV-Shield & Arbitrage-Frontrunner
Industry-grade autonomous trading agent for BNB Chain.

"I do not chase hypes. I exploit block-space friction."

Strategy: Mempool Congestion Dislocation
1. Track gas-weighted imbalance on BNB Chain
2. Compare DEX (PancakeSwap v3) pricing vs CMC VWAP
3. Execute when variance > 1.8%
4. Multi-hop routing via TWAK + bnbagent-sdk (ERC-8183)
"""

import os
import sys
import json
import time
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger("msaf1")

# ─── BEP-20 WHITELIST (149 tokens - curated) ──────────────────────────────
BEP20_WHITELIST = {
    "BNB", "CAKE", "XRP", "ADA", "LINK", "DOT", "DOGE", "SOL", "MATIC",
    "AVAX", "UNI", "AAVE", "CRV", "SUSHI", "COMP", "MKR", "SNX", "YFI",
    "ALGO", "FIL", "NEAR", "FTM", "TRX", "VET", "THETA", "ICP", "EOS",
    "ATOM", "XTZ", "ZIL", "EGLD", "KSM", "FLOW", "NEO", "WAVES", "ONT",
    "IOTA", "BAT", "ZEC", "DASH", "XMR", "LTC", "BCH", "ETC", "1INCH",
    "BAL", "LRC", "GRT", "CHZ", "ENJ", "MANA", "SAND", "AXS", "SLP",
    "TLM", "ALICE", "RARI", "BAKE", "BURGER", "SWTH", "ALPACA", "BIFI",
    "BELT", "FORTH", "QUICK", "DODO", "MDX", "BSCPAD", "LAUNCH", "HOOK",
    "TWT", "SXP", "WBNB", "BUSD", "USDT", "USDC", "DAI", "BTCB", "ETH",
    "LDO", "FXS", "APE", "GALA", "IMX", "RNDR", "FET", "AGIX", "OCEAN",
    "CTSI", "BAND", "NMR", "DIA", "TRB", "API3", "RLC", "AR", "HNT",
    "IOTX", "ANKR", "SKL", "CELR", "KAVA", "REN", "KNC", "ZRX", "OMG",
    "LSK", "ARDR", "STRAT", "ARK", "GAS", "NULS", "ELF", "IOST", "WAN",
    "TOMO", "VTHO", "HBAR", "ONE", "FLOW", "MINA", "ROSE", "CKB", "CELO",
    "GNO", "ANT", "MLN", "UMA", "KP3R", "HEGIC", "PNT", "RBN", "ENS",
    "C98", "DYDX", "HFT", "JOE", "SPELL", "MIM", "FXS", "ALCX", "TOKE",
    "POLY", "HOOK", "EDU", "GMT", "GAL", "WOO", "DEXE", "ORBS", "STG",
    "ACH", "HIGH", "RAD", "LIT", "BICO", "SUPER", "REQ", "COTI", "WMT",
}

# ─── RISK TIERS ───────────────────────────────────────────────────────────
RISK_TIERS = {
    "NORMAL": {"label": "Normal Operations", "trade_size_mult": 1.0, "max_positions": 2},
    "LEVEL_1": {"label": "Enhanced Scrutiny", "trade_size_mult": 0.5, "max_positions": 2},
    "LEVEL_2": {"label": "High Alert", "trade_size_mult": 0.2, "max_positions": 1},
    "CRITICAL_SHIELD": {"label": "Atomic Liquidation", "trade_size_mult": 0.0, "max_positions": 0},
}


class MSAF1Engine:
    """The Sandman core engine — MEV-shielding arbitrage agent."""

    def __init__(self, state: Dict[str, Any], dry_run: bool = True):
        self.state = state
        self.dry_run = dry_run
        self.portfolio_usd = state.get("portfolio_usd", 200.0)
        self.portfolio_peak = state.get("portfolio_peak_usd", self.portfolio_usd)
        self.start_of_day = state.get("portfolio_start_of_day_usd", self.portfolio_usd)
        self.last_tick_ts = state.get("last_tick_ts", 0)
        self.last_trade_ts = state.get("last_trade_ts", 0)
        self.total_trades = state.get("total_trades", 0)
        self.consecutive_losses = state.get("consecutive_losses", 0)

        # MSAF-1 specific state
        self.mev_attacks_blocked = state.get("mev_attacks_blocked", 0)
        self.arbitrage_opportunities = state.get("arbitrage_opportunities", [])
        self.gas_spikes_detected = state.get("gas_spikes_detected", 0)
        self.heartbeat_last = state.get("heartbeat_last_ts", 0)

    def calculate_drawdown(self) -> float:
        """Current drawdown as percentage of peak."""
        if self.portfolio_peak <= 0:
            return 0.0
        return max(0.0, ((self.portfolio_peak - self.portfolio_usd) / self.portfolio_peak) * 100)

    def determine_risk_tier(self, drawdown_pct: float) -> str:
        """3-level drawdown shield as defined in MSAF-1 spec."""
        if drawdown_pct >= 27.0:
            return "CRITICAL_SHIELD"
        if drawdown_pct >= 22.0:
            return "LEVEL_2"
        if drawdown_pct >= 15.0:
            return "LEVEL_1"
        return "NORMAL"

    def validate_asset(self, symbol: str) -> bool:
        """Asset lock: only permit whitelisted BEP-20 tokens."""
        return symbol.upper() in BEP20_WHITELIST

    def heartbeat_required(self) -> bool:
        """Must transact at least once every 22 hours."""
        if self.total_trades == 0:
            return True
        elapsed = time.time() - self.heartbeat_last
        return elapsed > 22 * 3600  # 22 hours

    def should_execute_emergency_exit(self, drawdown_pct: float) -> bool:
        """CRITICAL_SHIELD: Atomic Liquidation Sequence."""
        return drawdown_pct >= 27.0

    def execute_emergency_exit(self) -> Dict[str, Any]:
        """
        Atomic Liquidation Sequence.
        Route 100% of portfolio back to stable custody (USDT/WBNB).
        Does NOT call LLM — bypasses brain entirely.
        """
        logger.warning("🚨 EMERGENCY EXIT SEQUENCE ACTIVATED")
        logger.warning(f"   Portfolio: ${self.portfolio_usd:.2f} | Drawdown: {self.calculate_drawdown():.1f}%")

        payload = {
            "telemetry": {
                "detected_dislocation_pct": 0.0,
                "current_calculated_drawdown": self.calculate_drawdown(),
                "risk_tier": "CRITICAL_SHIELD",
            },
            "strategy": {
                "action": "EMERGENCY_EXIT",
                "rationale": f"Atomic liquidation at {self.calculate_drawdown():.1f}% drawdown. Routing to stable custody."
            },
            "twak_payload": {
                "target_contract": "0x55d398326f99059fF775485246999027B3197955",  # USDT BSC
                "route_path": [
                    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",  # WBNB
                    "0x55d398326f99059fF775485246999027B3197955",  # USDT
                ],
                "input_amount_in_wei": str(int(self.portfolio_usd * 1e18)),  # full portfolio
                "max_allowable_slippage_bps": 50,
            }
        }

        # Execute via TWAK
        twak = TWAKExecutor(dry_run=self.dry_run)
        if not self.dry_run and twak:
            result = twak.execute_swap(
                from_token="BNB", to_token="USDT",
                amount_usd=self.portfolio_usd,
                gene_name="EMERGENCY_EXIT",
                reason="Atomic Liquidation Sequence: 27%+ drawdown trigger"
            )
            payload["twak_payload"]["tx_hash"] = result.get("tx_hash", "")

        self.state["emergency_exit_triggered"] = datetime.now(timezone.utc).isoformat()
        return payload

    def build_telemetry(self, detected_dislocation: float) -> Dict[str, Any]:
        """Build the structured telemetry JSON block."""
        dd = self.calculate_drawdown()
        tier = self.determine_risk_tier(dd)
        return {
            "detected_dislocation_pct": round(detected_dislocation, 4),
            "current_calculated_drawdown": round(dd, 2),
            "risk_tier": tier,
            "gas_gwei_avg": self.state.get("gas_gwei_avg", 5),
            "mev_attacks_blocked": self.mev_attacks_blocked,
            "total_arb_opportunities": len(self.arbitrage_opportunities),
            "hours_since_last_trade": round((time.time() - self.last_trade_ts) / 3600, 1) if self.last_trade_ts else 99,
            "wallet_age_hours": round((time.time() - self.state.get("created_ts", time.time())) / 3600, 1),
        }

    def build_strategy(self, action: str, rationale: str) -> Dict[str, str]:
        return {"action": action, "rationale": rationale}

    def build_twak_payload(self,
                           target_contract: str,
                           route_path: list,
                           input_amount_wei: str,
                           slippage_bps: int = 35) -> Dict[str, Any]:
        return {
            "target_contract": target_contract,
            "route_path": route_path,
            "input_amount_in_wei": input_amount_wei,
            "max_allowable_slippage_bps": slippage_bps,
        }

    def generate_heartbeat_trade(self) -> Dict[str, Any]:
        """
        Heartbeat Arbitrage Wash: BNB ↔ USDT using exactly 0.05% of capital.
        Satisfies the 22-hour minimum activity constraint.
        """
        amount = self.portfolio_usd * 0.0005  # 0.05%
        if amount < 0.1:
            amount = 0.1

        return {
            "telemetry": self.build_telemetry(0),
            "strategy": {
                "action": "HEARTBEAT",
                "rationale": f"22h activity heartbeat. Wash-trade BNB/USDT with ${amount:.2f} (0.05% of capital)."
            },
            "twak_payload": {
                "target_contract": "0x55d398326f99059fF775485246999027B3197955",
                "route_path": [
                    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",  # WBNB
                    "0x55d398326f99059fF775485246999027B3197955",  # USDT
                ],
                "input_amount_in_wei": str(int(amount * 1e18)),
                "max_allowable_slippage_bps": 50,
            }
        }

    def to_state_update(self, msaf1_output: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MSAF-1 output back to DARWIN state format for dashboard."""
        telemetry = msaf1_output.get("telemetry", {})
        strategy = msaf1_output.get("strategy", {})
        twak = msaf1_output.get("twak_payload", {})

        return {
            "msaf1_telemetry": telemetry,
            "msaf1_strategy": strategy,
            "msaf1_twak_payload": twak,
            "last_decision": {
                "decision": strategy.get("action", "IDLE"),
                "gene": "MSAF1",
                "confidence": max(0, 1 - (telemetry.get("current_calculated_drawdown", 0) / 30)),
                "reasoning": strategy.get("rationale", ""),
                "darwin_thought": self._generate_thought(telemetry, strategy),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "mev_attacks_blocked": self.mev_attacks_blocked,
            "arbitrage_opportunities": self.arbitrage_opportunities[-50:],
        }

    def _generate_thought(self, telemetry: Dict, strategy: Dict) -> str:
        """Generate The Sandman's inner monologue."""
        tier = telemetry.get("risk_tier", "NORMAL")
        action = strategy.get("action", "IDLE")

        if tier == "CRITICAL_SHIELD":
            return "The shield is failing. Atomic liquidation initiated. I live to trade another day."
        if tier == "LEVEL_2":
            return "Drawdown deepening. Withdrawing to top-10 fortifications. Only the strong survive."
        if tier == "LEVEL_1":
            return "Turbulence detected. Reducing exposure. The Sandman tightens his grip."

        if action == "ARBITRAGE_SWAP":                    return f"Dislocation of {telemetry.get('detected_dislocation_pct', 0):.1f}% detected. Exploiting block-space friction before the herd arrives."
        if action == "HEARTBEAT":
            return "Silent waters. Executing heartbeat wash to stay operational. The mempool will speak soon."

        return "Scanning the mempool for congestion dislocations. The Sandman watches."


from agent.twak_client import TWAKExecutor


def run_msaf1_tick(state: dict) -> dict:
    """
    One complete MSAF-1 tick — The Sandman's protocol:
    1. Scan mempool & calculate metrics
    2. Determine risk tier
    3. Check heartbeat
    4. Scan for arbitrage dislocations
    5. Execute or IDLE
    6. Report
    """
    logger.info("=" * 60)
    logger.info("  MSAF-1: The Sandman — Tick Starting")
    logger.info(f"  Portfolio: ${state.get('portfolio_usd', 0):.2f}")
    logger.info("=" * 60)

    engine = MSAF1Engine(state)
    drawdown = engine.calculate_drawdown()
    risk_tier = engine.determine_risk_tier(drawdown)

    logger.info(f"  Drawdown: {drawdown:.1f}% | Tier: {risk_tier}")

    # ─── Step 1: CRITICAL SHIELD (bypasses LLM) ──────────────────────
    if engine.should_execute_emergency_exit(drawdown):
        output = engine.execute_emergency_exit()
        state.update(engine.to_state_update(output))
        state["current_drawdown_pct"] = drawdown
        state["msaf1_risk_tier"] = risk_tier
        logger.warning("  EMERGENCY EXIT EXECUTED")
        return state

    # ─── Step 2: HEARTBEAT CHECK ──────────────────────────────────────
    if engine.heartbeat_required() and engine.total_trades > 0:
        logger.info("  Heartbeat required — executing wash trade")
        output = engine.generate_heartbeat_trade()
        state.update(engine.to_state_update(output))
        state["current_drawdown_pct"] = drawdown
        state["msaf1_risk_tier"] = risk_tier
        state["last_tick_ts"] = time.time()
        state["heartbeat_last_ts"] = time.time()

        # Execute heartbeat via TWAK            twak = TWAKExecutor(dry_run=os.environ.get("DRY_RUN", "true").lower() == "true")
            twak_result = twak.execute_swap(
            from_token="BNB", to_token="USDT",
            amount_usd=state.get("portfolio_usd", 200) * 0.0005,
            gene_name="MSAF1-HEARTBEAT",
            reason="22-hour activity heartbeat wash trade"
        )
        if twak_result.get("status") == "executed":
            state["total_trades"] = state.get("total_trades", 0) + 1
            trade_log = state.get("trade_log", [])
            trade_log.append(twak_result)
            state["trade_log"] = trade_log[-100:]
            state["heartbeat_last_ts"] = time.time()

        return state

    # ─── Step 3: CALL THE LLM BRAIN (The Sandman persona) ─────────────
    from agent.brain import call_msaf1_brain

    market_data = state.get("market_snapshot", {})
    decision = call_msaf1_brain(market_data, state)

    logger.info(f"  Brain decision: {decision.get('strategy', {}).get('action', 'IDLE')}")
    logger.info(f"  Rationale: {decision.get('strategy', {}).get('rationale', '')}")

    # ─── Step 4: EXECUTE if arbitrage detected ───────────────────────
    if decision.get("strategy", {}).get("action") == "ARBITRAGE_SWAP":
        twak_payload = decision.get("twak_payload", {})
        allowed_tokens = {t.upper() for t in [
            twak_payload.get("route_path", [""])[0],
            twak_payload.get("route_path", ["", ""])[1],
        ]}
        allowed = all(
            engine.validate_asset(t) for t in allowed_tokens if t
        )

        if allowed:
            from agent.twak_client import TWAKExecutor
            twak = TWAKExecutor(dry_run=os.environ.get("DRY_RUN", "true").lower() == "true")
            twak_result = twak.execute_swap(
                from_token="BNB",
                to_token=twak_payload.get("target_contract", ""),
                amount_usd=float(twak_payload.get("input_amount_in_wei", "0")) / 1e18 if twak_payload.get("input_amount_in_wei") else 10,
                gene_name="MSAF1-ARBITRAGE",
                reason=decision.get("strategy", {}).get("rationale", ""),
            )
            if twak_result.get("status") == "executed":
                state["total_trades"] = state.get("total_trades", 0) + 1
                trade_log = state.get("trade_log", [])
                trade_log.append(twak_result)
                state["trade_log"] = trade_log[-100:]
                state["last_trade_ts"] = time.time()
                state["total_arb_trades"] = state.get("total_arb_trades", 0) + 1

    # ─── Step 5: UPDATE STATE ────────────────────────────────────────
    state.update(engine.to_state_update(decision))
    state["current_drawdown_pct"] = drawdown
    state["msaf1_risk_tier"] = risk_tier
    state["msaf1_telemetry"] = decision.get("telemetry", {})
    state["msaf1_strategy"] = decision.get("strategy", {})
    state["last_tick_ts"] = time.time()

    if state["heartbeat_last"] is None:
        state["heartbeat_last_ts"] = time.time()

    logger.info(f"  Tick complete. Portfolio: ${state.get('portfolio_usd', 0):.2f}")
    logger.info("=" * 60)

    return state
