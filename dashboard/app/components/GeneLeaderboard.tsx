"use client";

interface Props {
  genes: Record<string, any>;
  scores: Record<string, number>;
}

const GENE_COLORS: Record<string, string> = {
  PULSE: "#f59e0b",
  WAVE: "#3b82f6",
  GRAVITY: "#10b981",
  PHANTOM: "#8b5cf6",
};

export function GeneLeaderboard({ genes, scores }: Props) {
  const geneList = Object.entries(genes || {}).map(([name, data]) => ({
    name,
    ...data,
    fitness_score: scores?.[name] || data?.fitness_score || 0,
  }));

  geneList.sort((a, b) => b.fitness_score - a.fitness_score);
  const winner = geneList[0];

  return (
    <div className="grid grid-4">
      {geneList.map((gene) => {
        const isWinner = gene.name === winner?.name;
        const color = GENE_COLORS[gene.name] || "#9ca3af";
        const scorePct = Math.min(Math.abs(gene.fitness_score || 0) * 20, 100);

        return (
          <div
            key={gene.name}
            className={`gene-card ${isWinner ? "winner" : ""}`}
            style={{ borderLeftColor: color, borderLeftWidth: 3 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="gene-name" style={{ color }}>{gene.name}</div>
              {isWinner && (
                <span style={{
                  fontSize: 10, background: "rgba(52,211,153,0.15)",
                  color: "var(--success)", padding: "2px 8px",
                  borderRadius: 4, fontWeight: 600,
                }}>WINNER</span>
              )}
            </div>
            <div className="gene-score" style={{ color, marginTop: 8 }}>
              {gene.fitness_score.toFixed(4)}
            </div>
            <div style={{
              height: 4, background: "var(--bg)",
              borderRadius: 2, marginTop: 8, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${scorePct}%`,
                background: color, borderRadius: 2,
                transition: "width 0.5s ease",
              }} />
            </div>
            <div className="gene-desc">{gene.description}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8 }}>
              Gen {gene.generation} · Hold: {gene.hold_time_hours}h · TP: +{gene.take_profit_pct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
