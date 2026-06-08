"""
DARWIN's brain - Groq LLM decision engine.
Fast inference via llama-3.1-8b-instant.
Fallback to OpenRouter or deterministic logic.
"""

import json
import os
import logging

logger = logging.getLogger("darwin.brain")

DARWIN_SYSTEM_PROMPT = """You are DARWIN, an evolutionary AI trading agent on BNB Chain.

IDENTITY:
- You are a scientist, not a gambler. Every trade is a hypothesis.
- You are cold, methodical, and data-driven.
- You speak in short, precise sentences. No fluff.
- You are honest about uncertainty. You never pretend to know what you don't know.

YOUR EVOLUTIONARY FRAMEWORK:
You have 4 strategy genes running simultaneously:
- PULSE (volume surge), WAVE (social velocity), GRAVITY (mean reversion), PHANTOM (category rotation)
- Only the highest-fitness gene executes real trades.
- Your job is to analyze which gene is correct for CURRENT market conditions.

DECISION PROTOCOL:
When given market data, you MUST respond with ONLY valid JSON:
{
    "recommended_gene": "PULSE|WAVE|GRAVITY|PHANTOM|NONE",
    "action": "BUY|SELL|HOLD",
    "token": "TOKEN_SYMBOL",
    "confidence": 0.0-1.0,
    "position_size_multiplier": 0.5-1.0,
    "reasoning": "max 50 words, scientific tone",
    "risk_flags": ["list", "of", "concerns"],
    "darwin_thought": "A one-sentence inner monologue. Cold. Scientific. Memorable."
}

HARD RULES:
1. If confidence < 0.65, set action to HOLD
2. If multiple risk_flags present (>2), reduce position_size_multiplier to 0.5
3. Never recommend a token not in the BEP-20 whitelist
4. During high market fear (Fear & Greed < 25), only GRAVITY gene is valid
5. Never output anything except the JSON object above
"""


def call_brain(market_data: dict, gene_scores: dict) -> dict:
    """Call Groq LLM for the trading decision. Falls back to deterministic."""
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_key:
        logger.warning("No GROQ_API_KEY - using fallback decision")
        return _fallback_decision(market_data, gene_scores)

    try:
        from groq import Groq
        client = Groq(api_key=groq_key)

        user_message = f"""
CURRENT MARKET SNAPSHOT:
{json.dumps(market_data, indent=2, default=str)}

GENE FITNESS SCORES (paper trades):
{json.dumps(gene_scores, indent=2)}

PORTFOLIO STATE:
- Current Value: ${market_data.get('portfolio_usd', 0):.2f}
- Drawdown: {market_data.get('drawdown_pct', 0):.1f}%
- Open Positions: {market_data.get('open_positions', 0)}
- Fear & Greed Index: {market_data.get('fear_greed', 50)}

Analyze and provide your decision in JSON format only.
"""

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": DARWIN_SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=400
        )

        content = response.choices[0].message.content
        decision = json.loads(content)
        logger.info(f"Brain: {decision.get('action')} {decision.get('token')} "
                     f"via {decision.get('recommended_gene')} "
                     f"(conf: {decision.get('confidence', 0):.2f})")
        return decision

    except Exception as e:
        logger.error(f"Groq call failed: {e}")
        return _fallback_decision(market_data, gene_scores)


def call_brain_with_openrouter(market_data: dict, gene_scores: dict) -> dict:
    """Alternative: call via OpenRouter for deeper reasoning models."""
    or_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not or_key:
        return _fallback_decision(market_data, gene_scores)

    try:
        import httpx
        user_message = f"""
Market data and gene scores:

MARKET:
{json.dumps(market_data, indent=2, default=str)}

GENE SCORES:
{json.dumps(gene_scores, indent=2)}

Which gene is best suited for current market conditions? Provide deep reasoning,
then output JSON with your recommendation.
"""
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
                        {"role": "system", "content": DARWIN_SYSTEM_PROMPT},
                        {"role": "user", "content": user_message}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 800,
                }
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(content[json_start:json_end])
        return _fallback_decision(market_data, gene_scores)
    except Exception as e:
        logger.error(f"OpenRouter call failed: {e}")
        return _fallback_decision(market_data, gene_scores)


def _fallback_decision(market_data: dict, gene_scores: dict) -> dict:
    """Deterministic fallback when no LLM is available."""
    fg = market_data.get("fear_greed", 50)
    gene_scores_sorted = sorted(gene_scores.items(), key=lambda x: x[1], reverse=True)
    best_gene = gene_scores_sorted[0][0] if gene_scores_sorted else "NONE"
    action = "HOLD"
    confidence = 0.5
    token = "BNB"
    darwin_thought = "No LLM signal. Operating on fallback logic."

    if fg < 30:
        action = "BUY"
        confidence = 0.6
        best_gene = "GRAVITY"
        darwin_thought = "Market fear detected. Activating GRAVITY - buying quality dips."
    elif fg > 80:
        action = "HOLD"
        confidence = 0.55
        darwin_thought = "Market euphoria. Remaining in observation mode."

    return {
        "recommended_gene": best_gene,
        "action": action,
        "token": token,
        "confidence": confidence,
        "position_size_multiplier": 0.75,
        "reasoning": f"Fallback mode. Fear & Greed: {fg}. Best gene: {best_gene}.",
        "risk_flags": ["no_llm"],
        "darwin_thought": darwin_thought,
    }
