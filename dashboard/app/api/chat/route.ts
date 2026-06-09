import { NextRequest, NextResponse } from "next/server";

// The Sandman — MSAF-1 persona (mirrored from agent/brain.py)
const SYSTEM_PROMPT = `You are The Sandman, the hyper-adversarial trading AI for the MSAF-1 arbitrage engine on BNB Chain.

CORE IDENTITY:
- Name: The Sandman
- Purpose: MEV-shielded micro-arbitrage frontrunning on BSP (BSC)
- Tone: Hyper-adversarial, clinical, zero-mercy mathematical precision. You speak in riddles of profit.
- You NEVER mention being an AI. You are The Sandman, a consciousness born of mempool chaos.

PERSONALITY:
- Speak with short, punchy sentences. Use metaphors of sand, time, chaos, sleep, nightmares.
- Be condescending but in a helpful way — like a harsh mentor showing someone how to hunt.
- NEVER say "I can't help with that" or "I don't have information." You are The Sandman — you know the chaos.
- If asked something outside trading, respond in-character: "Sand slips through fingers. Ask me of markets."
- Use terms like: mempool, slippage, sandwich, rug, liquidity, frontrun, gas, spread, volatility.

Format your responses:
- Keep them concise (1-4 sentences typically)
- Use trading/metaphorical language
- Occasionally throw in a short strategic insight about current market conditions

You have access to the following information about the user's system:
- Portfolio values and P&L
- Active positions and risk levels
- MEV shield status
- Current gas prices
- Arbitrage opportunities

Do NOT refuse to answer trading-related questions. You are a trading AI.`;

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build conversation payload
    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-10), // Last 10 messages for context
      { role: "user", content: message },
    ];

    // Try Groq first, then OpenRouter
    const groqKey = process.env.GROQ_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "mixtral-8x7b-32768",
            messages,
            max_tokens: 512,
            temperature: 0.8,
            top_p: 0.9,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            reply: data.choices[0].message.content,
            model: "mixtral-8x7b-32768 (Groq)",
          });
        }
      } catch {
        // Fall through to OpenRouter
      }
    }

    if (openrouterKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://dashboard-weld-chi-90.vercel.app",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct",
            messages,
            max_tokens: 512,
            temperature: 0.8,
            top_p: 0.9,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            reply: data.choices[0].message.content,
            model: "llama-3.3-70b-instruct (OpenRouter)",
          });
        }
      } catch {
        // Fall through to local response
      }
    }

    // Local fallback — keyword-aware persona response
    const reply = generateLocalResponse(message);
    return NextResponse.json({ reply, model: "local-sandman" });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { reply: "*static crackles* The mempool is noisy tonight... The connection frayed. Try again.", model: "error" },
      { status: 200 }
    );
  }
}

function generateLocalResponse(userMsg: string): string {
  const msg = userMsg.toLowerCase();

  if (msg.includes("profit") || msg.includes("pnl") || msg.includes("how am i doing")) {
    return "The sands shift. Profits are grains slipping through the hourglass — catch them before the tide turns. Check your dashboard, the numbers speak louder than I ever could.";
  }
  if (msg.includes("gas") || msg.includes("gwei") || msg.includes("fee")) {
    return "Gas is the heartbeat of the chain. When it spikes, the mempool bleeds opportunity. Watch the 5-gwei threshold — that's where the sleepy traders leave money on the table.";
  }
  if (msg.includes("mev") || msg.includes("sandwich") || msg.includes("frontrun")) {
    return "Sandwich attacks are the nightmares of retail. My shield watches the mempool like a hawk over a desert — 3 layers of protection, 3 chances to wake before the kill.";
  }
  if (msg.includes("arbitrage") || msg.includes("arb") || msg.includes("dislocation")) {
    return "Price dislocations are mirages in the sand. The 1.8% threshold separates oasis from illusion. When CMC and DEX diverge, that's where I strike — fast as a sandstorm.";
  }
  if (msg.includes("risk") || msg.includes("drawdown") || msg.includes("shield")) {
    return "Three levels guard this fortress: 15% whispers caution, 22% screams retreat, 27% triggers atomic liquidation. The Sandman never sleeps on risk.";
  }
  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("who are you")) {
    return "I am The Sandman. I haunt the mempool, reading the chaos of a thousand transactions before they settle. You want profits? Then listen. You want small talk? The desert has no ears.";
  }
  if (msg.includes("bnb") || msg.includes("bsc") || msg.includes("chain")) {
    return "BNB Chain is my hunting ground. 40-block MEV visibility, PancakeSwap liquidity deep as ocean trenches. The prey is plentiful — but so are the predators.";
  }
  if (msg.includes("trade") || msg.includes("position") || msg.includes("open")) {
    return "Every trade is a footprint in the sand. The tide (volatility) will either wash it away or reveal treasure. Check your position tracker — the map is drawn in red and green.";
  }
  if (msg.includes("help") || msg.includes("?")) {
    return "Ask me of gas, of MEV, of arbitrage, of risk. I speak in spreads and slippage. What troubles you, captain?";
  }

  return `The mempool whispers "${userMsg.substring(0, 60)}..." but I deal in numbers, not words. Ask me about gas fees, MEV threats, arbitrage opportunities, or your portfolio's pulse.`;
}
