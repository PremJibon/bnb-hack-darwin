#!/usr/bin/env python3
"""
MSAF-1: Arbitrage Scanner — Mempool Congestion Dislocation Detector.
Scans for temporary price decoupling between PancakeSwap v3 pools and CMC VWAP.
Executes when variance > 1.8%.
"""

import os
import time
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger("msaf1.arb")

# PancakeSwap v3 contract addresses (BSC Mainnet)
PCS_V3_FACTORY = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865"
PCS_V3_ROUTER = "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4"

# Key token addresses (BSC)
TOKEN_ADDRESSES = {
    "WBNB": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    "USDT": "0x55d398326f99059fF775485246999027B3197955",
    "BUSD": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    "USDC": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    "CAKE": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    "ETH": "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    "BTCB": "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    "XRP": "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE",
    "ADA": "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47",
    "DOT": "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402",
    "LINK": "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD",
    "SOL": "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",
}


class ArbitrageScanner:
    """
    The Sandman's eyes.
    Crawls CMC x402 pricing vs local DEX pricing to find dislocations.
    """

    MIN_DISLOCATION_PCT = 1.8  # Minimum variance to trigger (from MSAF-1 spec)
    MAX_POSITIONS = 2

    def __init__(self, state: Dict[str, Any]):
        self.state = state
        self.discoveries: List[Dict] = []

    def scan_all(self) -> List[Dict[str, Any]]:
        """
        Full arbitrage scan:
        1. Fetch CMC prices for all whitelisted tokens
        2. Compare with DEX pricing
        3. Return opportunities where variance > 1.8%
        """
        cmc_prices = self._fetch_cmc_prices()
        dex_prices = self._fetch_dex_prices()

        opportunities = []
        for symbol, cmc_data in cmc_prices.items():
            if symbol not in dex_prices:
                continue

            cmc_price = cmc_data.get("price_usd", 0)
            dex_price = dex_prices.get(symbol, 0)

            if cmc_price <= 0 or dex_price <= 0:
                continue

            # Calculate dislocation percentage
            variance = abs(dex_price - cmc_price) / cmc_price * 100
            direction = "BUY_DEX" if dex_price < cmc_price else "SELL_DEX"

            if variance >= self.MIN_DISLOCATION_PCT:
                # Account for gas costs and slippage
                net_profit = variance - 0.5  # Subtract 0.5% for gas + slippage

                if net_profit > 0:
                    opp = {
                        "symbol": symbol,
                        "cmc_price": round(cmc_price, 6),
                        "dex_price": round(dex_price, 6),
                        "variance_pct": round(variance, 2),
                        "net_profit_pct": round(net_profit, 2),
                        "direction": direction,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "confidence": min(net_profit / 3.0, 0.95),  # Normalize to 0-1
                    }
                    opportunities.append(opp)
                    logger.info(f"  📊 ARB: {symbol} — {variance:.1f}% variance ({direction})")

        # Sort by best opportunity
        opportunities.sort(key=lambda x: x["net_profit_pct"], reverse=True)
        self.discoveries = opportunities[:10]

        logger.info(f"  Scan complete: {len(opportunities)} opportunities found")
        return opportunities

    def select_best_trade(self, opportunities: List[Dict]) -> Optional[Dict]:
        """
        Select the best arbitrage opportunity to execute.
        Considers: net profit, liquidity, confidence.
        """
        if not opportunities:
            return None

        # Filter: only high-confidence opportunities
        viable = [o for o in opportunities if o["confidence"] >= 0.6]
        if not viable:
            return None

        # Pick the highest net profit
        best = max(viable, key=lambda x: x["net_profit_pct"])
        return best

    def build_route_path(self, symbol: str, direction: str) -> tuple:
        """
        Build multi-hop route path.
        Returns (route_path: list, target_contract: str).
        """
        addr = TOKEN_ADDRESSES.get(symbol, TOKEN_ADDRESSES["USDT"])

        if direction == "BUY_DEX":
            # Buy on DEX at lower price: USDT → Token
            route = [TOKEN_ADDRESSES["USDT"], addr]
            target = addr
        else:
            # Sell on DEX at higher price: Token → USDT
            route = [addr, TOKEN_ADDRESSES["USDT"]]
            target = TOKEN_ADDRESSES["USDT"]

        return route, target

    def _fetch_cmc_prices(self) -> Dict[str, Any]:
        """Fetch prices from CMC x402 endpoint."""
        from agent.cmc_client import CMCClient
        cmc = CMCClient()

        try:
            tokens = cmc.fetch_top_bep20(limit=50)
            prices = {}
            for t in tokens:
                prices[t["symbol"]] = {
                    "price_usd": t.get("price_usd", 0),
                    "volume_24h": t.get("volume_24h", 0),
                    "percent_change_24h": t.get("percent_change_24h", 0),
                }
            return prices
        except Exception as e:
            logger.error(f"CMC price fetch failed: {e}")
            return self._mock_prices()

    def _fetch_dex_prices(self) -> Dict[str, float]:
        """Fetch prices from PancakeSwap v3 DEX."""
        try:
            import httpx
            prices = {}

            # For hackathon demo, simulate DEX prices with slight variance from CMC
            cmc_data = self._fetch_cmc_prices()
            import random
            for symbol, data in cmc_data.items():
                # Simulate DEX having slight dislocation from CMC
                cmc_price = data["price_usd"]
                variation = random.uniform(-0.03, 0.03)
                dex_price = cmc_price * (1 + variation)
                prices[symbol] = round(dex_price, 6)

            return prices
        except Exception as e:
            logger.error(f"DEX price fetch failed: {e}")
            return {}

    def _mock_prices(self) -> Dict[str, Any]:
        """Mock CMC prices for demo."""
        import random
        base = {
            "BNB": 620.0, "CAKE": 2.45, "XRP": 0.52, "ADA": 0.45,
            "LINK": 14.80, "DOT": 7.20, "SOL": 145.0, "MATIC": 0.75,
            "AVAX": 35.50, "UNI": 9.20, "AAVE": 120.0, "CRV": 1.20,
            "DOGE": 0.15, "TRX": 0.11, "ETH": 3400.0, "BTCB": 68000.0,
        }
        return {
            sym: {"price_usd": p * (1 + random.uniform(-0.05, 0.05)), "volume_24h": random.uniform(1e6, 2e9), "percent_change_24h": random.uniform(-5, 5)}
            for sym, p in base.items()
        }
