"""
TWAK (Trust Wallet Agent Kit) execution wrapper.
Handles swap execution and limit orders via TWAK CLI.
"""

import json
import subprocess
import logging

logger = logging.getLogger("darwin.twak")


class TWAKExecutor:
    """Execute real trades via TWAK Agent Wallet Mode."""

    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.base_cmd = ["twak", "trade"]
        self._check_twak()

    def _check_twak(self):
        try:
            result = subprocess.run(["twak", "--version"],
                                    capture_output=True, text=True, timeout=5)
            logger.info(f"TWAK CLI: {result.stdout.strip() or 'installed'}")
        except (FileNotFoundError, subprocess.TimeoutExpired):
            logger.warning("TWAK CLI not found - trades will be logged only")

    def execute_swap(self, from_token: str, to_token: str, amount_usd: float,
                     gene_name: str, reason: str) -> dict:
        """Execute a swap via TWAK or log it in dry-run mode."""
        result = {
            "tx_hash": "", "status": "dry_run", "executed_price": 0,
            "gene": gene_name, "reason": reason, "timestamp": "",
            "amount_usd": amount_usd, "from_token": from_token, "to_token": to_token,
        }

        if self.dry_run:
            logger.info(f"[DRY-RUN] {gene_name}: {from_token} -> {to_token} ${amount_usd}")
            return result

        try:
            cmd = self.base_cmd + [
                "--from", from_token, "--to", to_token,
                "--amount-usd", str(amount_usd), "--slippage", "0.5",
                "--venue", "pancakeswap",
                "--reason", f"DARWIN-{gene_name}: {reason}",
                "--output", "json",
            ]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if proc.returncode == 0:
                trade_data = json.loads(proc.stdout)
                result.update({
                    "tx_hash": trade_data.get("txHash", ""),
                    "status": trade_data.get("status", "executed"),
                    "executed_price": trade_data.get("executedPrice", 0),
                    "timestamp": trade_data.get("timestamp", ""),
                })
                logger.info(f"SWAP EXECUTED: {trade_data.get('txHash', '')[:20]}...")
            else:
                result["status"] = f"error: {proc.stderr[:200]}"
                logger.error(f"TWAK swap failed: {proc.stderr[:200]}")
        except Exception as e:
            result["status"] = f"error: {e}"
            logger.error(f"TWAK swap error: {e}")

        return result

    def set_limit_order(self, token: str, target_price: float,
                        amount_usd: float, direction: str = "buy") -> dict:
        result = {"status": "dry_run", "token": token,
                  "target_price": target_price, "amount_usd": amount_usd, "direction": direction}
        if self.dry_run:
            logger.info(f"[DRY-RUN] LIMIT {direction.upper()}: {token} @ ${target_price}")
            return result
        try:
            cmd = self.base_cmd + [
                "--type", "limit", "--token", token,
                "--target-price", str(target_price),
                "--amount-usd", str(amount_usd),
                "--direction", direction, "--expiry", "8h", "--output", "json",
            ]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if proc.returncode == 0:
                result.update(json.loads(proc.stdout))
                result["status"] = "active"
        except Exception as e:
            result["status"] = f"error: {e}"
        return result
