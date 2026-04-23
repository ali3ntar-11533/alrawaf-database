import { STAGES, GOLD } from "./types";

interface Props {
  currentStage: number;
}

export default function WorkflowWaterfall({ currentStage }: Props) {
  return (
    <div style={{
      background: "#fff",
      borderBottom: "1px solid rgba(197,160,89,0.2)",
      padding: "12px 20px",
      overflowX: "auto",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        minWidth: "max-content", direction: "rtl",
      }}>
        {STAGES.map((stage, idx) => {
          const stageNum = idx + 1;
          const isDone    = stageNum < currentStage;
          const isCurrent = stageNum === currentStage;
          const isPending = stageNum > currentStage;

          return (
            <div key={stageNum} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "4px 10px", borderRadius: 10, position: "relative",
                background: isCurrent ? "rgba(197,160,89,0.12)" : "transparent",
                border: isCurrent ? `1.5px solid ${GOLD}` : "1.5px solid transparent",
                animation: isCurrent ? "waterfall-pulse 2s ease-in-out infinite" : "none",
                minWidth: 72,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isDone ? "0.85rem" : "0.72rem",
                  background: isDone ? GOLD : isCurrent ? "rgba(197,160,89,0.18)" : "rgba(0,0,0,0.06)",
                  color: isDone ? "#fff" : isCurrent ? GOLD : "#bbb",
                  fontWeight: 900,
                  boxShadow: isCurrent ? `0 0 0 3px rgba(197,160,89,0.22)` : "none",
                  transition: "all 0.3s",
                }}>
                  {isDone ? "✓" : stageNum}
                </div>
                <div style={{
                  fontSize: "0.52rem", marginTop: 4, textAlign: "center",
                  color: isDone ? "#8B6914" : isCurrent ? "#C5A059" : "#bbb",
                  fontWeight: isCurrent ? 800 : 500,
                  maxWidth: 70, lineHeight: 1.3,
                }}>
                  {stage.label}
                </div>
              </div>

              {idx < STAGES.length - 1 && (
                <div style={{
                  width: 20, height: 2,
                  background: stageNum < currentStage
                    ? `linear-gradient(90deg, ${GOLD}, ${GOLD})`
                    : "rgba(0,0,0,0.1)",
                  flexShrink: 0,
                  transition: "background 0.4s",
                }} />
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes waterfall-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(197,160,89,0.35); }
          50%       { box-shadow: 0 0 0 6px rgba(197,160,89,0); }
        }
      `}</style>
    </div>
  );
}
