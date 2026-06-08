"""
DARWIN's immune system. Protects the drawdown limit.
If RiskGuard says NO — DARWIN does NOT trade. Full stop.
"""
import logging

logger = logging.getLogger("darwin.risk")


class RiskGuard:
    """Enforces immutable risk rules before every trade."""

    MAX_DRAWDOWN_PCT = 25.0
    MAX_SINGLE_TRADE_PCT = 5.0
    MAX_DAILY_LOSS_PCT = 8.0
    MIN_CONFIDENCE_SCORE = 0.65
    MAX_OPEN_POSITIONS = 2
    COOLDOWN_AFTER_LOSS = 2

    def __init__(self, portfolio_value_usd: float, state: dict):
        self.portfolio = portfolio_value_usd
        self.state = state

    def approve_trade(self, trade_amount_usd: float,
                      llm_confidence: float) -> tuple:
        """Returns (approved: bool, reason: str) - ALL checks must pass."""
        checks = []

        dd = self._drawdown()
        checks.append(("DRAWDOWN", dd < self.MAX_DRAWDOWN_PCT,
                       f"Drawdown {dd:.1f}% >= {self.MAX_DRAWDOWN_PCT}%"))

        dl = self._daily_loss()
        checks.append(("DAILY_LOSS", dl < self.MAX_DAILY_LOSS_PCT,
                       f"Daily loss {dl:.1f}% >= {self.MAX_DAILY_LOSS_PCT}%"))

        trade_pct = (trade_amount_usd / self.portfolio) * 100 if self.portfolio > 0 else 0
        checks.append(("TRADE_SIZE", trade_pct <= self.MAX_SINGLE_TRADE_PCT,
                       f"Trade {trade_pct:.1f}% > {self.MAX_SINGLE_TRADE_PCT}% of portfolio"))

        checks.append(("CONFIDENCE", llm_confidence >= self.MIN_CONFIDENCE_SCORE,
                       f"Confidence {llm_confidence:.2f} < {self.MIN_CONFIDENCE_SCORE}"))

        n_positions = len(self.state.get("open_positions", []))
        checks.append(("POSITIONS", n_positions < self.MAX_OPEN_POSITIONS,
                       f"{n_positions} positions >= {self.MAX_OPEN_POSITIONS}"))

        ticks_since_loss = self.state.get("ticks_since_last_loss", 99)
        checks.append(("COOLDOWN", ticks_since_loss >= self.COOLDOWN_AFTER_LOSS,
                       f"Cooldown {ticks_since_loss}/{self.COOLDOWN_AFTER_LOSS} ticks"))

        for name, passed, reason in checks:
            if not passed:
                logger.warning(f"FAIL {name}: {reason}")
                return False, f"FAIL {name}: {reason}"

        logger.info(f"RISK APPROVED - Drawdown: {dd:.1f}%, Confidence: {llm_confidence:.2f}")
        return True, "APPROVED"

    def _drawdown(self) -> float:
        peak = self.state.get("portfolio_peak_usd", self.portfolio)
        if peak <= 0:
            return 0.0
        return max(0, ((peak - self.portfolio) / peak) * 100)

    def _daily_loss(self) -> float:
        start = self.state.get("portfolio_start_of_day_usd", self.portfolio)
        if start <= 0:
            return 0.0
        loss = start - self.portfolio
        return max(0, (loss / start) * 100)
