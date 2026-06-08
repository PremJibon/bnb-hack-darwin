"""
bnbagent-sdk integration for DARWIN.
Alternative execution path using BNB Chain's official Agent SDK (ERC-8004/ERC-8183).
"""

import os
import json
import logging
from typing import Optional

logger = logging.getLogger("darwin.bnb")


class BNBAgentExecutor:
    """
    BNB Agent SDK executor - alternative to TWAK.
    Uses ERC-8004 (agent identity) + ERC-8183 (agentic commerce) for on-chain trades.
    """

    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.agent_id = None
        self.client = None
        self._init_sdk()

    def _init_sdk(self):
        """Initialize bnbagent-sdk client."""
        try:
            from bnbagent import ERC8183Client
            from bnbagent.wallets import EVMWalletProvider
            from bnbagent.storage import LocalStorageProvider

            private_key = os.environ.get("AGENT_WALLET_KEY", "")
            if private_key:
                wallet = EVMWalletProvider(private_key=private_key, chain_id=97)  # BSC Testnet
                storage = LocalStorageProvider(base_path="./agent_data")
                self.client = ERC8183Client(
                    wallet_provider=wallet,
                    storage_provider=storage,
                )
                logger.info("bnbagent-sdk initialized successfully")
            else:
                logger.warning("No AGENT_WALLET_KEY - bnbagent-sdk in mock mode")
        except ImportError:
            logger.warning("bnbagent-sdk not installed - install with: pip install bnbagent")
        except Exception as e:
            logger.error(f"bnbagent-sdk init error: {e}")

    def register_agent(self, name: str = "DARWIN", metadata: dict = None) -> Optional[str]:
        """Register DARWIN as an on-chain agent via ERC-8004."""
        if self.dry_run or not self.client:
            logger.info(f"[DRY-RUN] Register agent: {name}")
            return "0xmock_agent_id"

        try:
            metadata = metadata or {
                "description": "DARWIN Evolutionary Trading Agent",
                "genes": ["PULSE", "WAVE", "GRAVITY", "PHANTOM"],
                "version": "1.0.0",
                "protocol": "bnb-hack-2026",
            }
            result = self.client.register_agent(
                name=name,
                metadata=metadata,
            )
            self.agent_id = result.get("agentId")
            logger.info(f"Agent registered: {self.agent_id}")
            return self.agent_id
        except Exception as e:
            logger.error(f"Agent registration failed: {e}")
            return None

    def create_trade_job(self, token_in: str, token_out: str, amount_usd: float,
                         gene_name: str) -> Optional[dict]:
        """
        Create a trade job via ERC-8183 commerce protocol.
        Uses on-chain escrow for trustless execution.
        """
        if self.dry_run or not self.client:
            logger.info(f"[DRY-RUN] Job: {token_in} -> {token_out} ${amount_usd} via {gene_name}")
            return {"jobId": "mock_job", "status": "OPEN"}

        try:
            job = self.client.create_job(
                required_capability="SWAP",
                input={"token": token_in, "amount": amount_usd},
                output={"token": token_out, "min_amount": amount_usd * 0.995},
                budget=amount_usd * 0.01,  # 1% fee budget
                metadata={"gene": gene_name, "agent": "DARWIN"},
            )
            logger.info(f"Trade job created: {job.get('jobId')}")
            return job
        except Exception as e:
            logger.error(f"Trade job failed: {e}")
            return None

    def settle_job(self, job_id: str, approved: bool = True) -> bool:
        """Settle a trade job - approve or dispute."""
        if self.dry_run or not self.client:
            logger.info(f"[DRY-RUN] Settle job {job_id}: {'APPROVED' if approved else 'DISPUTED'}")
            return True
        try:
            self.client.settle(job_id=job_id, approved=approved)
            return True
        except Exception as e:
            logger.error(f"Settlement failed: {e}")
            return False

    def close(self):
        if self.client:
            try:
                self.client.close()
            except:
                pass
