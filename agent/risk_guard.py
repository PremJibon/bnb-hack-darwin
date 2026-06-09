#!/usr/bin/env python3
"""
MSAF-1: Risk Guard — The 30% Max Drawdown Shield.
3-level defensive protocol from the MSAF-1 specification.
Level 1 (15%): 50% trade size reduction
Level 2 (22%): 80% trade size reduction, top 10 only
Level 3 (27%+): Atomic Liquidation Sequence (bypasses LLM)
"""

import logging
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger("msaf1.risk")

# BNB HACK 2026: Top liquidity tokens from the 149 eligible list
# Used during LEVEL_2 drawdown — restrict to highest-liquidity
HACKATHON_SAFE_TOKENS = {
    "ETH", "USDT", "USDC", "XRP", "DOGE", "ADA", "LINK", "DOT", "TRX", "SHIB"
}


class RiskGuard:
    """
    The Sandman's immune system.
    Enforces immutable risk rules before every trade.
    3-level drawdown shield + 6 standard checks.
    """

    # Drawdown thresholds (aligned with BNB HACK 2026 30% DQ cap)
    LEVEL_1_DRAWDOWN = 15.0   # 15% → 50% size reduction
    LEVEL_2_DRAWDOWN = 22.0   # 22% → 80% size reduction, top 10 only
    LEVEL_3_DRAWDOWN = 25.0   # 25% → Atomic Liquidation (5% buffer before 30% DQ)
    HACKATHON_DQ_DRAWDOWN = 30.0  # Hard disqualification cap

    # Standard checks
    MAX_SINGLE_TRADE_PCT = 5.0
    MAX_DAILY_LOSS_PCT = 8.0
    MIN_CONFIDENCE_SCORE = 0.6
    MAX_OPEN_POSITIONS = 2
    COOLDOWN_AFTER_LOSS = 2

    def __init__(self, portfolio_value_usd: float, state: Dict[str, Any]):
        self.portfolio = portfolio_value_usd
        self.portfolio_peak = state.get("portfolio_peak_usd", portfolio_value_usd)
        self.start_of_day = state.get("portfolio_start_of_day_usd", portfolio_value_usd)
        self.state = state

    def calculate_drawdown(self) -> float:
        """Current drawdown as percentage from peak."""
        if self.portfolio_peak <= 0:
            return 0.0
        return max(0.0, ((self.portfolio_peak - self.portfolio) / self.portfolio_peak) * 100)

    def determine_risk_tier(self) -> Tuple[str, str]:
        """
        Determine risk tier and label based on drawdown.
        Returns (tier_name, label).
        """
        dd = self.calculate_drawdown()
        if dd >= self.LEVEL_3_DRAWDOWN:
            return "CRITICAL_SHIELD", "Atomic Liquidation"
        if dd >= self.LEVEL_2_DRAWDOWN:
            return "LEVEL_2", "High Alert"
        if dd >= self.LEVEL_1_DRAWDOWN:
            return "LEVEL_1", "Enhanced Scrutiny"
        return "NORMAL", "Normal Operations"

    def get_trade_size_multiplier(self) -> float:
        """
        Get trade size multiplier based on current drawdown level.
        Level 1: 0.5 (50% reduction)
        Level 2: 0.2 (80% reduction)
        Level 3: 0.0 (no trading, emergency exit)
        """
        dd = self.calculate_drawdown()
        if dd >= self.LEVEL_3_DRAWDOWN:
            return 0.0
        if dd >= self.LEVEL_2_DRAWDOWN:
            return 0.2
        if dd >= self.LEVEL_1_DRAWDOWN:
            return 0.5
        return 1.0

    def get_allowed_assets(self) -> Optional[set]:
        """
        Get set of allowed assets based on risk tier.
        Level 2+ restricts to top 10 BEP-20 tokens only.
        Returns None if all assets allowed.
        """
        dd = self.calculate_drawdown()
        if dd >= self.LEVEL_2_DRAWDOWN:
            return HACKATHON_SAFE_TOKENS
        return None

    def is_emergency_exit_required(self) -> bool:
        """Check if emergency liquidation is required (Level 3)."""
        return self.calculate_drawdown() >= self.LEVEL_3_DRAWDOWN

    def enforce_daily_minimum_trades(self) -> bool:
        """
        BNB HACK 2026: Must execute at least 1 trade per day (7 over trading week).
        Returns True if minimum has been met for today.
        """
        daily_trades = self.state.get("daily_trade_count", 0)
        return daily_trades >= 1

    def approve_trade(self, trade_amount_usd: float,
                      llm_confidence: float,
                      token_symbol: str = "") -> Tuple[bool, str]:
        """
        Complete risk check. All checks must pass.
        Returns (approved: bool, reason: str).
        """
        dd = self.calculate_drawdown()
        tier, label = self.determine_risk_tier()

        # ─── CRITICAL SHIELD: bypass all checks, force emergency ─────
        if self.is_emergency_exit_required():
            return False, f"CRITICAL_SHIELD: Drawdown {dd:.1f}% >= 25%. Atomic Liquidation required."

        # HACKATHON HARD STOP: 30% drawdown = immediate disqualification
        if dd >= self.HACKATHON_DQ_DRAWDOWN:
            return False, f"DQ_SAFE: Drawdown {dd:.1f}% >= 30% (hackathon DQ threshold). All trading halted."

        # ─── STANDARD CHECKS ─────────────────────────────────────────
        checks = []

        # 1. Drawdown check
        checks.append(("DRAWDOWN", dd < self.LEVEL_3_DRAWDOWN,
                       f"Drawdown {dd:.1f}% >= {self.LEVEL_3_DRAWDOWN}%"))

        # 2. Minimum trade count check (hackathon: 1 trade/day minimum)
        ticks_since_last_trade = self.state.get("ticks_since_last_trade", 0)
        if ticks_since_last_trade > 24:
            logger.warning(f"  WARN: No trades in {ticks_since_last_trade} ticks — need min 1/day for hackathon")

        # 3. Daily loss check
        daily_loss = self._daily_loss()
        checks.append(("DAILY_LOSS", daily_loss < self.MAX_DAILY_LOSS_PCT,
                       f"Daily loss {daily_loss:.1f}% >= {self.MAX_DAILY_LOSS_PCT}%"))

        # 3. Trade size check (with drawdown multiplier)
        trade_pct = (trade_amount_usd / self.portfolio) * 100 if self.portfolio > 0 else 0
        max_trade = self.MAX_SINGLE_TRADE_PCT * self.get_trade_size_multiplier()
        checks.append(("TRADE_SIZE", trade_pct <= max_trade,
                       f"Trade {trade_pct:.1f}% > {max_trade:.1f}% of portfolio (tier: {tier})"))

        # 4. Confidence check
        min_conf = self.MIN_CONFIDENCE_SCORE * (1.0 if dd < self.LEVEL_1_DRAWDOWN else 1.2)
        checks.append(("CONFIDENCE", llm_confidence >= min_conf,
                       f"Confidence {llm_confidence:.2f} < {min_conf:.2f} (adjusted for tier: {tier})"))

        # 5. Open positions check
        n_positions = len(self.state.get("open_positions", []))
        max_pos = self.MAX_OPEN_POSITIONS if dd < self.LEVEL_2_DRAWDOWN else 1
        checks.append(("POSITIONS", n_positions < max_pos,
                       f"{n_positions} positions >= {max_pos} (tier: {tier})"))

        # 6. Asset whitelist check (Level 2+)
        if token_symbol:
            allowed = self.get_allowed_assets()
            if allowed:
                checks.append(("ASSET", token_symbol.upper() in allowed,
                               f"{token_symbol} not in top-10 whitelist (tier: {tier})"))

        # 7. Cooldown check
        ticks_since_loss = self.state.get("ticks_since_last_loss", 99)
        cooldown = self.COOLDOWN_AFTER_LOSS * (2 if dd >= self.LEVEL_1_DRAWDOWN else 1)
        checks.append(("COOLDOWN", ticks_since_loss >= cooldown,
                       f"Cooldown {ticks_since_loss}/{cooldown} ticks"))

        for name, passed, reason in checks:
            if not passed:
                logger.warning(f"  FAIL {name}: {reason}")
                return False, f"FAIL {name}: {reason}"

        logger.info(f"  RISK APPROVED - Tier: {tier}, Drawdown: {dd:.1f}%, Confidence: {llm_confidence:.2f}")
        return True, f"APPROVED ({tier})"

    def get_shield_summary(self) -> Dict[str, Any]:
        """Return shield status for dashboard."""
        dd = self.calculate_drawdown()
        tier, label = self.determine_risk_tier()
        return {
            "drawdown_pct": round(dd, 2),
            "risk_tier": tier,
            "tier_label": label,
            "trade_size_mult": self.get_trade_size_multiplier(),
            "emergency_exit": self.is_emergency_exit_required(),
            "allowed_assets": list(self.get_allowed_assets() or ["all"]),
            "max_positions": 1 if dd >= self.LEVEL_2_DRAWDOWN else self.MAX_OPEN_POSITIONS,
            "max_trade_pct": round(self.MAX_SINGLE_TRADE_PCT * self.get_trade_size_multiplier(), 1),
            "daily_loss_pct": round(self._daily_loss(), 2),
        }

    def _daily_loss(self) -> float:
        """Calculate today's loss percentage."""
        if self.start_of_day <= 0:
            return 0.0
        loss = self.start_of_day - self.portfolio
        return max(0.0, (loss / self.start_of_day) * 100)
