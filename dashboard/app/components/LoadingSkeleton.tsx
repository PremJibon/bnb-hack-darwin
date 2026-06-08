"use client";

export function LoadingSkeleton() {
  return (
    <div className="container" style={{ paddingTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div className="skeleton" style={{ width: 200, height: 24, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 300, height: 14 }} />
        </div>
        <div className="skeleton" style={{ width: 80, height: 32, borderRadius: 8 }} />
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card">
            <div className="skeleton" style={{ width: 60, height: 10, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 80, height: 28, marginBottom: 4 }} />
            <div className="skeleton" style={{ width: 100, height: 10 }} />
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        {[1, 2].map((i) => (
          <div key={i} className="card">
            <div className="skeleton" style={{ width: 120, height: 10, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: "100%", height: 180 }} />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="skeleton" style={{ width: 100, height: 10, marginBottom: 16 }} />
        <div className="grid grid-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="skeleton" style={{ width: 60, height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 80, height: 24, marginBottom: 4 }} />
              <div className="skeleton" style={{ width: "100%", height: 4, marginBottom: 4 }} />
              <div className="skeleton" style={{ width: "70%", height: 10 }} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .skeleton {
          background: var(--bg-hover);
          border-radius: 4px;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
