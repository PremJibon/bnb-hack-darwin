"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface GeneScoreEntry {
  timestamp: string;
  scores: Record<string, number>;
}

interface Props {
  history: GeneScoreEntry[];
}

const GENE_COLORS: Record<string, string> = {
  PULSE: "#f59e0b",
  WAVE: "#3b82f6",
  GRAVITY: "#10b981",
  PHANTOM: "#8b5cf6",
};

export function GeneEvolutionChart({ history }: Props) {
  if (!history || history.length < 2) {
    return (
      <div className="card">
        <div className="card-title">Gene Evolution</div>
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
          Gene evolution data will appear after multiple ticks.
        </div>
      </div>
    );
  }

  // Group by time windows
  const data = history.map((entry) => {
    const time = new Date(entry.timestamp);
    const label = `${time.getMonth() + 1}/${time.getDate()} ${time.getHours()}:00`;
    return {
      name: label,
      PULSE: entry.scores?.PULSE || 0,
      WAVE: entry.scores?.WAVE || 0,
      GRAVITY: entry.scores?.GRAVITY || 0,
      PHANTOM: entry.scores?.PHANTOM || 0,
    };
  });

  return (
    <div className="card" style={{ gridColumn: "span 2" }}>
      <div className="card-title">Gene Fitness Over Time</div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {Object.entries(GENE_COLORS).map(([gene, color]) => (
              <Line key={gene} type="monotone" dataKey={gene} stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
