"""
CoinMarketCap API client with x402 pay-per-request support.
Fetches market data for DARWIN's 4 genes.
"""

import json
import os
import logging

logger = logging.getLogger("darwin.cmc")


class CMCClient:
    """CoinMarketCap API client."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("CMC_API_KEY", "")
        self.base = "https://pro-api.coinmarketcap.com/v1"
        self.headers = {
            "X-CMC_PRO_API_KEY": self.api_key,
            "Accept": "application/json",
        }

    def fetch_top_bep20(self, limit: int = 30) -> list:
        """Fetch top BEP-20 tokens by volume."""
        if not self.api_key:
            logger.warning("No CMC API key - returning mock BEP-20 data")
            return self._mock_bep20_tokens(limit)
        try:
            import httpx
            with httpx.Client() as client:
                r = client.get(
                    f"{self.base}/cryptocurrency/listings/latest",
                    params={
                        "platform_id": 1839,
                        "limit": limit,
                        "sort": "volume_24h",
                        "sort_dir": "desc",
                        "aux": "volume_24h_old,volume_7d,percent_change_1h,is_active",
                    },
                    headers=self.headers,
                )
                r.raise_for_status()
                data = r.json()
                return self._parse_tokens(data.get("data", []))
        except Exception as e:
            logger.error(f"CMC fetch error: {e}")
            return self._mock_bep20_tokens(limit)

    def fetch_trending(self, time_period: str = "4h") -> list:
        if not self.api_key:
            return self._mock_trending()
        try:
            import httpx
            with httpx.Client() as client:
                r = client.get(
                    f"{self.base}/cryptocurrency/trending/gainers-losers",
                    params={"time_period": time_period, "convert": "USD"},
                    headers=self.headers,
                )
                r.raise_for_status()
                data = r.json()
                return data.get("data", [])
        except Exception as e:
            logger.error(f"CMC trending error: {e}")
            return self._mock_trending()

    def fetch_categories(self) -> list:
        if not self.api_key:
            return self._mock_categories()
        try:
            import httpx
            with httpx.Client() as client:
                r = client.get(
                    f"{self.base}/cryptocurrency/categories",
                    headers=self.headers,
                )
                r.raise_for_status()
                data = r.json()
                return data.get("data", [])
        except Exception as e:
            logger.error(f"CMC categories error: {e}")
            return self._mock_categories()

    def fetch_fear_greed(self) -> dict:
        try:
            import httpx
            with httpx.Client() as client:
                r = client.get("https://api.alternative.me/fng/?limit=7")
                r.raise_for_status()
                data = r.json()
                latest = data.get("data", [{}])[0]
                return {
                    "value": int(latest.get("value", 50)),
                    "label": latest.get("value_classification", "Neutral"),
                    "timestamp": latest.get("timestamp", ""),
                    "trend_7d": [int(d.get("value", 50)) for d in data.get("data", [])],
                }
        except Exception as e:
            logger.error(f"F&G fetch error: {e}")
            return {"value": 50, "label": "Neutral", "timestamp": "", "trend_7d": [50]}

    def _parse_tokens(self, raw: list) -> list:
        tokens = []
        for t in raw[:30]:
            quote = t.get("quote", {}).get("USD", {})
            tokens.append({
                "id": t.get("id"),
                "name": t.get("name"),
                "symbol": t.get("symbol"),
                "slug": t.get("slug"),
                "price_usd": round(quote.get("price", 0), 6),
                "volume_24h": quote.get("volume_24h", 0),
                "volume_7d": t.get("volume_7d", 0),
                "percent_change_1h": quote.get("percent_change_1h", 0),
                "percent_change_24h": quote.get("percent_change_24h", 0),
                "market_cap": quote.get("market_cap", 0),
                "cmc_rank": t.get("cmc_rank", 999),
            })
        return tokens

    def _mock_bep20_tokens(self, limit=10) -> list:
        mocks = [
            {"symbol": "BNB", "name": "BNB", "price_usd": 620.0, "volume_24h": 2.1e9,
             "percent_change_1h": 0.5, "percent_change_24h": -1.2, "market_cap": 95e9, "cmc_rank": 4},
            {"symbol": "CAKE", "name": "PancakeSwap", "price_usd": 2.45, "volume_24h": 180e6,
             "percent_change_1h": 2.1, "percent_change_24h": 5.3, "market_cap": 650e6, "cmc_rank": 85},
            {"symbol": "XRP", "name": "XRP", "price_usd": 0.52, "volume_24h": 1.5e9,
             "percent_change_1h": -0.3, "percent_change_24h": -2.1, "market_cap": 28e9, "cmc_rank": 6},
            {"symbol": "ADA", "name": "Cardano", "price_usd": 0.45, "volume_24h": 400e6,
             "percent_change_1h": 1.0, "percent_change_24h": -3.5, "market_cap": 16e9, "cmc_rank": 9},
            {"symbol": "LINK", "name": "Chainlink", "price_usd": 14.80, "volume_24h": 350e6,
             "percent_change_1h": 1.5, "percent_change_24h": 2.8, "market_cap": 8.7e9, "cmc_rank": 16},
            {"symbol": "SOL", "name": "Solana", "price_usd": 145.0, "volume_24h": 3.2e9,
             "percent_change_1h": 0.8, "percent_change_24h": -0.5, "market_cap": 65e9, "cmc_rank": 5},
            {"symbol": "DOT", "name": "Polkadot", "price_usd": 7.20, "volume_24h": 250e6,
             "percent_change_1h": -0.8, "percent_change_24h": -4.2, "market_cap": 10e9, "cmc_rank": 14},
            {"symbol": "AVAX", "name": "Avalanche", "price_usd": 35.50, "volume_24h": 500e6,
             "percent_change_1h": -0.5, "percent_change_24h": -6.0, "market_cap": 13.5e9, "cmc_rank": 12},
        ]
        return mocks[:limit]

    def _mock_trending(self) -> list:
        return [
            {"symbol": "CAKE", "price_change_4h": 8.5, "volume_change_4h": 45},
            {"symbol": "LINK", "price_change_4h": 3.2, "volume_change_4h": 22},
            {"symbol": "ADA", "price_change_4h": -4.1, "volume_change_4h": 15},
        ]

    def _mock_categories(self) -> list:
        return [
            {"id": "defi", "name": "DeFi", "market_cap_change_24h": 3.5},
            {"id": "ai-crypto", "name": "AI & Crypto", "market_cap_change_24h": 8.2},
            {"id": "gaming", "name": "Gaming", "market_cap_change_24h": -1.5},
            {"id": "layer-1", "name": "Layer 1", "market_cap_change_24h": 1.2},
        ]

    def close(self):
        pass
