"use client";

import { useEffect, useState } from "react";

interface GasEntry {
  gwei: number;
  ts: number;
}

interface Props {
  currentGas: number;
  gasHistory?: GasEntry[];
  gasSpike: boolean;
  gasCritical: boolean;
}

export function GasMonitor({ currentGas, gasHistory, gasSpike, gasCritical }: Props) {
  const [animatedGas, setAnimatedGas] = useState(currentGas);

  useEffect(() => {
    // Animate gas value change
    const duration = 500;
    const start = animatedGas;
    const diff = currentGas - start;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedGas(start + diff * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [currentGas]);

  const gasColor = gasCritical
    ? "var(--danger)"
    : gasSpike
    ? "var(--warning)"
    : "var(--success)";

  // Generate mini sparkline data
  const history = gasHistory || [];
  const sparkData = history.slice(-20);
  const maxGas = Math.max(...sparkData.map(h => h.gwei), 10);
  const minGas = Math.min(...sparkData.map(h => h.gwei), 0);

  return (
    <div className="card">
      <div className="card-title">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="20" y2="22" />
          </svg>
          Gas Monitor
        </span>
        <span className="badge" style={{
          marginLeft: "auto",
          background: `${gasColor}15`,
          color: gasColor,
          border: `1px solid ${gasColor}30`,
        }}>
          {currentGas.toFixed(1)} gwei
        </span>
      </div>

      {/* Gas gauge */}
      <div className="gas-gauge-container">
        <div className="gas-gauge">
          <div className="gas-gauge-track">
            <div className="gas-gauge-fill" style={{
              width: `${Math.min((animatedGas / 40) * 100, 100)}%`,
              background: gasColor,
              transition: "background 0.3s ease",
            }} />
          </div>
          <div className="gas-gauge-zones">
            <div className="gas-zone" style={{ left: "0%", width: "37.5%", background: "rgba(52,211,153,0.08)" }}>
              <span className="gas-zone-label">Safe</span>
            </div>
            <div className="gas-zone" style={{ left: "37.5%", width: "37.5%", background: "rgba(251,191,36,0.08)" }}>
              <span className="gas-zone-label">Spike</span>
            </div>
            <div className="gas-zone" style={{ left: "75%", width: "25%", background: "rgba(248,113,113,0.08)" }}>
              <span className="gas-zone-label">Critical</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini sparkline */}
      {sparkData.length > 1 && (
        <div className="gas-sparkline">
          <div className="gas-sparkline-bars">
            {sparkData.map((entry, i) => {
              const height = ((entry.gwei - minGas) / (maxGas - minGas || 1)) * 100;
              return (
                <div key={i} className="gas-spark-bar" style={{
                  height: `${Math.max(height, 5)}%`,
                  background: entry.gwei > 30
                    ? "var(--danger)"
                    : entry.gwei > 15
                    ? "var(--warning)"
                    : "var(--success)",
                  opacity: 0.6 + (i / sparkData.length) * 0.4,
                }} />
              );
            })}
          </div>
          <div className="gas-sparkline-labels">
            <span>Gas History (last {sparkData.length} ticks)</span>
            <span style={{ fontFamily: "var(--font-mono)", color: gasColor }}>
              {minGas.toFixed(0)} — {maxGas.toFixed(0)} gwei
            </span>
          </div>
        </div>
      )}

      {/* Status message */}
      <div className="gas-status" style={{
        marginTop: 10,
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 11,
        background: `${gasColor}10`,
        color: gasColor,
        border: `1px solid ${gasColor}20`,
      }}>
        {gasCritical
          ? "Gas prices too high for trading. Waiting for conditions to normalize."
          : gasSpike
          ? "Gas spike detected. Reducing trade sizes and monitoring sandwich risk."
          : "Gas prices normal. The Sandman operates at full capacity."}
      </div>
    </div>
  );
}
