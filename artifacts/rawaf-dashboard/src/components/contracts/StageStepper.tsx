import type { Contract } from "./contractTypes";
import { STAGE_LABELS } from "./contractTypes";

const STAGE_ICONS: Record<number, string> = { 1: "🏗️", 2: "💼", 3: "👑", 4: "🖊️" };
const STATUS_COLOR: Record<string, string> = {
  approved: "#27ae60",
  pending:  "#c5a059",
  rejected: "#e74c3c",
  sealed:   "#27ae60",
  signed:   "#27ae60",
};

export default function StageStepper({ contract }: { contract: Contract }) {
  const stages = [1, 2, 3, 4];

  function stageStatus(s: number) {
    const key = `stage${s}Status` as keyof Contract;
    const status = (contract[key] as string) ?? "pending";
    if (s < contract.currentStage) return "done";
    if (s === contract.currentStage) return "active";
    return "future";
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "24px" }}>
      {stages.map((s, i) => {
        const state = stageStatus(s);
        const isDone   = state === "done";
        const isActive = state === "active";

        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
              flex: 1,
            }}>
              {/* Circle */}
              <div style={{
                width: "42px", height: "42px", borderRadius: "50%",
                background: isDone
                  ? "linear-gradient(135deg, #27ae60, #1e8449)"
                  : isActive
                  ? "linear-gradient(135deg, #c5a059, #a88540)"
                  : "rgba(255,255,255,0.08)",
                border: isActive ? "2px solid rgba(197,160,89,0.8)" : "2px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.1rem",
                boxShadow: isActive ? "0 0 16px rgba(197,160,89,0.35)" : "none",
                transition: "all 0.3s",
              }}>
                {isDone ? "✓" : STAGE_ICONS[s]}
              </div>

              {/* Label */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: "0.62rem", fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#c5a059" : isDone ? "#27ae60" : "rgba(255,255,255,0.35)",
                  fontFamily: "Tajawal, sans-serif", whiteSpace: "nowrap",
                }}>
                  {STAGE_LABELS[s]}
                </div>
              </div>
            </div>

            {/* Connector */}
            {i < stages.length - 1 && (
              <div style={{
                height: "2px", flex: "0 0 24px",
                background: isDone
                  ? "linear-gradient(90deg, #27ae60, #c5a059)"
                  : "rgba(255,255,255,0.08)",
                marginBottom: "20px",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
