"use client";

interface Props {
  thought: string;
  decision: string;
  confidence: number;
  gene: string;
  token: string;
  reasoning?: string;
}

const DECISION_COLORS: Record<string, string> = {
  BUY: "var(--success)",
  SELL: "var(--danger)",
  HOLD: "var(--warning)",
};

export function DarwinThought({ thought, decision, confidence, gene, token, reasoning }: Props) {
  const decColor = DECISION_COLORS[decision] || "var(--text-muted)";
  const hasActivity = thought || reasoning;

  return (
    <div className="card">
      <div className="card-title">DARWIN&apos;s Inner Monologue</div>
      {hasActivity ? (
        <>
          <div className="thought-bubble">
            &ldquo;{thought || "Analyzing market conditions..."}&rdquo;
          </div>
          <div className="thought-meta">
            <div className="thought-badges">
              <span className={`badge badge-${decision.toLowerCase()}`} style={{ borderColor: decColor }}>
                {decision}
              </span>
              <span className="badge-gene" style={{ color: gene === "PULSE" ? "#f59e0b" : gene === "WAVE" ? "#3b82f6" : gene === "GRAVITY" ? "#10b981" : gene === "PHANTOM" ? "#8b5cf6" : "var(--text-muted)" }}>
                {gene}
              </span>
              <span className="badge-token">{token}</span>
            </div>
            <div className="thought-confidence">
              <span className="conf-label">Confidence</span>
              <div className="conf-bar">
                <div className="conf-fill" style={{
                  width: `${Math.min(confidence * 100, 100)}%`,
                  background: confidence >= 0.65 ? "var(--success)" : "var(--warning)",
                }} />
              </div>
              <span className="conf-value" style={{ color: confidence >= 0.65 ? "var(--success)" : "var(--warning)" }}>
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
            {reasoning && (
              <div className="thought-reasoning">{reasoning}</div>
            )}
          </div>
        </>
      ) : (
        <div className="thought-empty">
          <div className="thought-empty-icon">O</div>
          <div className="thought-empty-text">Silent. Observing. Waiting for signal...</div>
          <div className="thought-empty-sub">DARWIN is analyzing market data for the next trade opportunity.</div>
        </div>
      )}
    </div>
  );
}
