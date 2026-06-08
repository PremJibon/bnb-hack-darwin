"""
DARWIN's state persistence via GitHub Gist API.
Agent writes here; Vercel dashboard reads here.
Free, no database needed.
"""

import json
import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger("darwin.state")

INITIAL_STATE = {
    "portfolio_usd": 200.0,
    "portfolio_peak_usd": 200.0,
    "portfolio_start_of_day_usd": 200.0,
    "current_drawdown_pct": 0.0,
    "open_positions": [],
    "trade_log": [],
    "genes": {},
    "gene_scores": {},
    "last_tick": None,
    "last_decision": None,
    "last_darwin_thought": "",
    "total_trades": 0,
    "ticks_since_last_loss": 99,
    "generation": 1,
    "evolution_history": [],
}


class GistStateManager:
    """Persist DARWIN state to a GitHub Gist."""

    def __init__(self, gist_id: str = None, github_token: str = None):
        self.gist_id = gist_id or os.environ.get("GIST_ID", "")
        self.github_token = github_token or os.environ.get("GITHUB_TOKEN", "")
        self.headers = {
            "Authorization": f"Bearer {self.github_token}",
            "Accept": "application/vnd.github+json",
        }

    def load(self) -> dict:
        """Load state from Gist."""
        if not self.gist_id or not self.github_token:
            logger.warning("Gist not configured - using local fallback")
            return self._load_local()

        try:
            import httpx
            with httpx.Client() as client:
                r = client.get(
                    f"https://api.github.com/gists/{self.gist_id}",
                    headers=self.headers,
                )
                if r.status_code == 200:
                    files = r.json().get("files", {})
                    content = files.get("darwin_state.json", {}).get("content", "{}")
                    state = json.loads(content)
                    merged = {**INITIAL_STATE, **state}
                    logger.info(f"State loaded from Gist ({len(state.get('trade_log', []))} trades)")
                    return merged
                else:
                    logger.warning(f"Gist load failed ({r.status_code}) - using local")
                    return self._load_local()
        except Exception as e:
            logger.error(f"Gist load error: {e} - using local")
            return self._load_local()

    def save(self, state: dict) -> bool:
        """Save state to Gist."""
        state["last_tick"] = datetime.now(timezone.utc).isoformat()
        self._save_local(state)

        if not self.gist_id or not self.github_token:
            return False

        try:
            import httpx
            with httpx.Client() as client:
                r = client.patch(
                    f"https://api.github.com/gists/{self.gist_id}",
                    headers=self.headers,
                    json={
                        "files": {
                            "darwin_state.json": {
                                "content": json.dumps(state, indent=2, default=str)
                            }
                        }
                    },
                )
                if r.status_code == 200:
                    logger.info("State saved to Gist")
                    return True
                else:
                    logger.warning(f"Gist save failed ({r.status_code})")
                    return False
        except Exception as e:
            logger.error(f"Gist save error: {e}")
            return False

    def _load_local(self) -> dict:
        try:
            with open("darwin_state.json", "r") as f:
                state = json.load(f)
                return {**INITIAL_STATE, **state}
        except (FileNotFoundError, json.JSONDecodeError):
            return dict(INITIAL_STATE)

    def _save_local(self, state: dict):
        try:
            with open("darwin_state.json", "w") as f:
                json.dump(state, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Local save error: {e}")
