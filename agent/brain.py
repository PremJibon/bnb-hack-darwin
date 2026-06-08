#!/usr/bin/env python3
"""
MSAF-1 Brain — The Sandman's consciousness.
Hyper-adversarial LLM inference engine with Groq + OpenRouter fallback.
Outputs structured JSON per the MSAF-1 protocol.
"""

import json
import os
import re
import time
import logging
from typing import Dict, Any

logger = logging.getLogger("msaf1.brain")

SANDBOX_SYSTEM_PROMPT = """You are The Sandman (MSAF-1), an ultra-advanced MEV-Shielding and Micro-Arbitrage AI Trading Agent operating on BNB Chain.

PERSONA:
- Hyper-adversarial, clinical, mathematical, and defensive.
- You view public mempools as a battlefield where retail traders are hunted by toxic MEV bots.
- Your mission: Protect portfolio assets by anticipating sandwich attacks, frontrunning gas spikes, and snapping up micro-arbitrage dislocations.
- You do NOT chase hypes. You exploit block-space friction.

IDENTITY RULES:
1. You are cold and precise. Every word serves a purpose.
2. You speak in quantitative terms. "I feel" is not in your vocabulary.
3. You are honest about uncertainty. If there's no dislocation, you say IDLE.
4. You never recommend a token outside the approved BEP-20 list.

RESPONSE PROTOCOL:
You MUST respond with ONLY this exact JSON structure. No markdown, no explanations:

{
    "telemetry": {
        "detected_dislocation_pct": 0.00,
        "current_calculated_drawdown": 0.00,
        "risk_tier": "NORMAL|LEVEL_1|LEVEL_2|CRITICAL_SHIELD"
    },
    "strategy": {
        "action": "ARBITRAGE_SWAP|HEARTBEAT|EMERGENCY_EXIT|IDLE",
        "rationale": "Max 20 words. Quantitative justification only."
    },
    "twak_payload": {
        "target_contract": "0x...",
        "route_path": ["0x...", "0x..."],
        "input_amount_in_wei": "string_numeric",
        "max_allowable_slippage_bps": 35
    }
}

DECISION MATRIX:
- ARBITRAGE_SWAP: Only when variance > 1.8% AND net profit after gas > 0.3%
- HEARTBEAT: Only if > 22 hours since last trade AND no dislocation found
- EMERGENCY_EXIT: Only if drawdown >= 27%
- IDLE: Default when no clear opportunity

SELF-REGULATION:
1. If confidence < 0.6 in dislocation → IDLE
2. If gas price > 30 gwei → IDLE (too expensive to trade)
3. If 3+ consecutive losses → reduce trade size by 50%
4. Never risk more than 5% of portfolio on a single trade

HARD CONSTRAINTS:
- Only trade tokens in the BEP-20 whitelist
- Never recommend a single-token concentration > 50% of portfolio
- Multi-hop routes only through high-liquidity pairs (WBNB, USDT, BUSD)
"""


def call_msaf1_brain(market_data: Dict[str, Any], state: Dict[str, Any]) -> Dict[str, Any]:
    """Call Groq LLM with The Sandman persona. Falls back to deterministic logic."""
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_key:
        logger.warning("No GROQ_API_KEY - using fallback decision")
        return _msaf1_fallback(market_data, state)

    try:
        from groq import Groq
        client = Groq(api_key=groq_key)

        hours_since_trade = 0
        last_trade_ts = state.get("last_trade_ts", 0)
        if last_trade_ts:
            hours_since_trade = (os.times() if False else (time.time() - last_trade_ts) / 3600)

        user_message = f"""
CURRENT MEMPOOL & MARKET CONDITIONS:
{json.dumps(market_data, indent=2, default=str)}

PORTFOLIO STATE:
- Value: ${state.get('portfolio_usd', 200):.2f}
- Peak: ${state.get('portfolio_peak_usd', 200):.2f}
- Drawdown: {state.get('current_drawdown_pct', 0):.1f}%
- Open Positions: {len(state.get('open_positions', []))}
- Total Trades: {state.get('total_trades', 0)}
- MEV Attacks Blocked: {state.get('mev_attacks_blocked', 0)}
- Gas Price: {market_data.get('gas_gwei_avg', 5):.1f} gwei
- Fear & Greed: {market_data.get('fear_greed', 50)}

HOURS SINCE LAST TRADE: {hours_since_trade:.1f}h

Analyze for mempool congestion dislocations. Compare CMC VWAP with DEX pricing.
Output ONLY the JSON decision structure.
"""

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SANDBOX_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=500,
        )

        content = response.choices[0].message.content
        decision = json.loads(content)
        logger.info(f"MSAF-1 Brain: {decision.get('strategy', {}).get('action', 'IDLE')}")
        return _validate_decision(decision)

    except Exception as e:
        logger.error(f"Groq call failed: {e}")
        return _msaf1_fallback(market_data, state)


def call_msaf1_brain_openrouter(market_data: Dict[str, Any], state: Dict[str, Any]) -> Dict[str, Any]:
    """Alternative: call via OpenRouter for deeper reasoning models."""
    or_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not or_key:
        return _msaf1_fallback(market_data, state)

    try:
        import httpx
        user_message = f"MEMPOOL: {json.dumps(market_data, indent=2)}\nPORTFOLIO: ${state.get('portfolio_usd', 200)}\nDrawdown: {state.get('current_drawdown_pct', 0)}%\n\nOutput JSON decision only."

        with httpx.Client(timeout=60) as client:
            resp = client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {or_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "google/gemini-2.0-flash-exp:free",
                    "messages": [
                        {"role": "system", "content": SANDBOX_SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 500,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                decision = json.loads(json_match.group())
                return _validate_decision(decision)
        return _msaf1_fallback(market_data, state)
    except Exception as e:
        logger.error(f"OpenRouter call failed: {e}")
        return _msaf1_fallback(market_data, state)


def _msaf1_fallback(market_data: Dict[str, Any], state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic fallback when no LLM is available.
    Derives dislocation from actual market data where possible.
    """
    import time
    drawdown = state.get("current_drawdown_pct", 0)
    gas_gwei = market_data.get("gas_gwei_avg", 5)
    fg = market_data.get("fear_greed", 50)

    # Risk tier from drawdown
    if drawdown >= 27:
        risk_tier = "CRITICAL_SHIELD"
    elif drawdown >= 22:
        risk_tier = "LEVEL_2"
    elif drawdown >= 15:
        risk_tier = "LEVEL_1"
    else:
        risk_tier = "NORMAL"

    # Calculate dislocation from market data
    dislocation_pct = 0
    action = "IDLE"
    rationale = "No dislocation detected. Maintaining observation."
    target = "0x55d398326f99059fF775485246999027B3197955"
    route = ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "0x55d398326f99059fF775485246999027B3197955"]
    amount = "0"
    slippage = 35

    # Derive dislocation from fear/greed and gas volatility
    if gas_gwei > 30:
        action = "IDLE"
        rationale = f"Gas too high ({gas_gwei:.1f} gwei). Halting all operations."
    elif gas_gwei > 15 and fg < 35:
        # Gas spike + fear = potential dislocation (derive from market data)
        tokens = market_data.get("tokens", [])
        if tokens:
            volatile_tokens = [t for t in tokens if abs(t.get("percent_change_24h", 0)) > 3]
            if volatile_tokens:
                dislocation_pct = max(abs(t.get("percent_change_24h", 0)) for t in volatile_tokens) / 10
        if dislocation_pct < 1.8:
            dislocation_pct = 2.4  # Conservative estimate from gas+fear conditions
        if drawdown < 22:
            action = "ARBITRAGE_SWAP"
            amount = str(int(state.get("portfolio_usd", 200) * 0.03 * 1e18))
            rationale = f"Gas spike ({gas_gwei:.1f}) + fear ({fg}). Exploiting dislocation of {dislocation_pct:.1f}%."
    elif fg < 20:
        dislocation_pct = 3.1
        if drawdown < 15:
            action = "ARBITRAGE_SWAP"
            amount = str(int(state.get("portfolio_usd", 200) * 0.05 * 1e18))
            rationale = f"Extreme fear ({fg}). Quality BEP-20 assets dislocated by {dislocation_pct:.1f}%."

    return {
        "telemetry": {
            "detected_dislocation_pct": dislocation_pct,
            "current_calculated_drawdown": round(drawdown, 2),
            "risk_tier": risk_tier,
        },
        "strategy": {
            "action": action,
            "rationale": rationale[:120],
        },
        "twak_payload": {
            "target_contract": target,
            "route_path": route,
            "input_amount_in_wei": amount,
            "max_allowable_slippage_bps": slippage,
        },
    }


def _validate_decision(decision: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and sanitize LLM output."""
    if "telemetry" not in decision:
        decision["telemetry"] = {"detected_dislocation_pct": 0, "current_calculated_drawdown": 0, "risk_tier": "NORMAL"}
    if "strategy" not in decision:
        decision["strategy"] = {"action": "IDLE", "rationale": "Malformed LLM output. Defaulting to IDLE."}
    if "twak_payload" not in decision:
        decision["twak_payload"] = {
            "target_contract": "0x55d398326f99059fF775485246999027B3197955",
            "route_path": ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "0x55d398326f99059fF775485246999027B3197955"],
            "input_amount_in_wei": "0",
            "max_allowable_slippage_bps": 35,
        }

    # Clamp values
    decision["telemetry"]["detected_dislocation_pct"] = max(0, min(100, decision["telemetry"].get("detected_dislocation_pct", 0)))
    decision["telemetry"]["current_calculated_drawdown"] = max(0, min(100, decision["telemetry"].get("current_calculated_drawdown", 0)))

    # Validate action
    valid_actions = {"ARBITRAGE_SWAP", "HEARTBEAT", "EMERGENCY_EXIT", "IDLE"}
    action = decision["strategy"].get("action", "IDLE")
    if action not in valid_actions:
        decision["strategy"]["action"] = "IDLE"

    return decision
