"use client";

interface Props {
  thought: string;
  decision: string;
  confidence: number;
  gene: string;
  token: string;
}

const DECISION_COLORS: Record<string, string> = {
  BUY: "var(--success)",
  SELL: "var(--danger)",
  HOLD: "var(--warning)",
};

export function DarwinThought({ thought, decision, confidence, gene, token }: Props) {
  if (!thought) {
    return (
      <div className="card">
        <div className="card-title">DARWIN&apos;s Inner Monologue</div>
        <div style={{ fontStyle: "italic", color: "var(--text-muted)", fontSize: 14 }}>
          Silent. Observing. Waiting for signal...
        </div>
      </div>
    );
  }

  const decColor = DECISION_COLORS[decision] || "var(--text-muted)";

  return (
    <div className="card">
      <div className="card-title">DARWIN&apos;s Inner Monologue</div>
      <div className="thought-bubble">
        &ldquo;{thought}&rdquo;
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Decision:</span>
          <span className={`badge badge-${decision.toLowerCase()}`} style={{ borderColor: decColor }}>
            {decision}
          </span>
        </div>
        <div style={{ fontSize: 11 }}>
          <span style={{ color: "var(--text-muted)" }}>Gene: </span>
          <strong>{gene}</strong>
        </div>
        <div style={{ fontSize: 11 }}>
          <span style={{ color: "var(--text-muted)" }}>Token: </span>
          <strong>{token}</strong>
        </div>
        <div style={{ fontSize: 11 }}>
          <span style={{ color: "var(--text-muted)" }}>Confidence: </span>
          <strong style={{ color: confidence > 0.65 ? "var(--success)" : "var(--warning)" }}>
            {(confidence * 100).toFixed(0)}%
          </strong>
        </div>
      </div>
    </div>
  );
}
