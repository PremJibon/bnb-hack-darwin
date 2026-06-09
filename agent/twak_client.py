"""
TWAK (Trust Wallet Agent Kit) execution wrapper.
Handles swap execution, limit orders, and competition registration via TWAK CLI.
"""

import json
import subprocess
import logging

logger = logging.getLogger("darwin.twak")

# BNB HACK 2026 competition contract for on-chain registration
COMPETITION_CONTRACT = "0x212c61b9b72c95d95bf29cf032f5e5635629aed5"


class TWAKExecutor:
    """Execute real trades via TWAK Agent Wallet Mode."""

    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.base_cmd = ["twak", "trade"]
        self.registered = False
        self._check_twak()

    def _check_twak(self):
        try:
            result = subprocess.run(["twak", "--version"],
                                    capture_output=True, text=True, timeout=5)
            logger.info(f"TWAK CLI: {result.stdout.strip() or 'installed'}")
        except (FileNotFoundError, subprocess.TimeoutExpired):
            logger.warning("TWAK CLI not found - trades will be logged only")

    def register_for_competition(self) -> dict:
        """
        Register agent on-chain for BNB HACK 2026 Track 1.
        Uses TWAK's 'compete register' command to submit agent wallet address
        to the competition smart contract.
        
        Competition contract: 0x212c61b9b72c95d95bf29cf032f5e5635629aed5
        CLI: twak compete register
        MCP: competition_register
        
        Must register BEFORE June 22, 2026 (trading window opens).
        """
        if self.registered:
            logger.info("Already registered for competition")
            return {"status": "already_registered"}

        if self.dry_run:
            logger.info(f"[DRY-RUN] twak compete register --contract {COMPETITION_CONTRACT}")
            self.registered = True
            return {"status": "dry_run", "contract": COMPETITION_CONTRACT}

        try:
            cmd = ["twak", "compete", "register",
                   "--contract", COMPETITION_CONTRACT,
                   "--output", "json"]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if proc.returncode == 0:
                result = json.loads(proc.stdout)
                self.registered = True
                logger.info(f"✅ Registered for BNB HACK 2026: {result}")
                return result
            else:
                logger.error(f"Registration failed: {proc.stderr[:200]}")
                return {"status": "error", "error": proc.stderr[:200]}
        except Exception as e:
            logger.error(f"Registration error: {e}")
            return {"status": "error", "error": str(e)}

    def get_competition_status(self) -> dict:
        """Check competition registration status."""
        try:
            cmd = ["twak", "compete", "status",
                   "--contract", COMPETITION_CONTRACT,
                   "--output", "json"]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if proc.returncode == 0:
                return json.loads(proc.stdout)
            return {"status": "unknown", "error": proc.stderr[:100]}
        except Exception as e:
            return {"status": "error", "error": str(e)}

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
