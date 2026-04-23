import { useEffect, useState } from "react";
import { GOLD, GOLD_BG, GOLD_BORDER, STAGES } from "./types";
import type { Contract, StageLog } from "./types";
import { listContracts, getContractAudit } from "./api";

interface Props {
  role: string;
  onOpenContract: (id: number) => void;
}

export default function ContractTracking({ role, onOpenContract }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [logs, setLogs] = useState<Record<number, StageLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    listContracts({ status: "active" })
      .then(async cs => {
        setContracts(cs);
        const logMap: Record<number, StageLog[]> = {};
        await Promise.all(cs.map(async c => {
          logMap[c.id] = await getContractAudit(c.id);
        }));
        setLogs(logMap);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: "center", padding: 60, color: "#bbb", fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
      جاري التحميل...
    </div>
  );

  return (
    <div dir="rtl" style={{ padding: "24px 28px", fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#1a1206", marginBottom: 4 }}>
          🛡️ نظام متابعة العقود
        </h2>
        <p style={{ color: "#9b8060", fontSize: "0.82rem" }}>
          تتبع نسب الإنجاز والمراحل الحالية لجميع العقود النشطة
        </p>
      </div>

      {contracts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#bbb", fontSize: "0.9rem" }}>
          لا يوجد عقود نشطة حالياً
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {contracts.map(c => {
            const pct = Math.round(((c.currentStage - 1) / 11) * 100);
            const stage = STAGES[c.currentStage - 1];
            const contractLogs = logs[c.id] ?? [];
            const isExpanded = expanded === c.id;

            return (
              <div key={c.id} style={{
                background: "#fff", borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.07)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                overflow: "hidden",
              }}>
                <div
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                  style={{ padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                    background: GOLD_BG, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "1.3rem",
                    border: `1.5px solid ${GOLD_BORDER}`,
                  }}>{stage?.icon ?? "📄"}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#1a1206" }}>{c.title}</span>
                      <span style={{
                        fontSize: "0.62rem", padding: "2px 8px", borderRadius: 20,
                        background: GOLD_BG, color: GOLD, fontWeight: 700,
                        border: `1px solid ${GOLD_BORDER}`,
                      }}>
                        م{c.currentStage}: {stage?.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#9b8060", marginTop: 2 }}>
                      {c.contractNo} · {c.vendorName}
                    </div>

                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: `linear-gradient(90deg, ${GOLD}, #a88540)`,
                          borderRadius: 3, transition: "width 0.6s",
                          boxShadow: `0 0 6px rgba(197,160,89,0.4)`,
                        }} />
                      </div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 900, color: GOLD, flexShrink: 0 }}>{pct}%</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                    <button
                      onClick={e => { e.stopPropagation(); onOpenContract(c.id); }}
                      style={{
                        padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${GOLD_BORDER}`,
                        background: GOLD_BG, color: "#8B6914", cursor: "pointer",
                        fontSize: "0.72rem", fontWeight: 700, fontFamily: "'Cairo', 'Tajawal', sans-serif",
                      }}
                    >فتح</button>
                    <span style={{ color: "#bbb", fontSize: "0.9rem", transform: `rotate(${isExpanded ? "90deg" : "0"})`, transition: "transform 0.2s" }}>▶</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{
                    borderTop: `1px solid ${GOLD_BORDER}`,
                    padding: "16px 20px",
                    background: "rgba(197,160,89,0.03)",
                  }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#4a3520", marginBottom: 12 }}>
                      📅 تسلسل المراحل
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                      {STAGES.map((s, idx) => {
                        const sNum = idx + 1;
                        const isDone = sNum < c.currentStage;
                        const isCur = sNum === c.currentStage;
                        const logEntry = contractLogs.find(l => l.stage === sNum && l.action === "advance");
                        return (
                          <div key={sNum} style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            padding: "6px 8px", borderRadius: 8,
                            background: isDone ? "rgba(39,174,96,0.08)" : isCur ? GOLD_BG : "rgba(0,0,0,0.03)",
                            border: `1px solid ${isDone ? "rgba(39,174,96,0.2)" : isCur ? GOLD_BORDER : "rgba(0,0,0,0.07)"}`,
                            minWidth: 60,
                          }}>
                            <div style={{
                              fontSize: "0.65rem", fontWeight: 800,
                              color: isDone ? "#27ae60" : isCur ? GOLD : "#bbb",
                            }}>
                              {isDone ? "✓" : isCur ? "▶" : sNum}
                            </div>
                            <div style={{ fontSize: "0.52rem", color: isDone ? "#6b8060" : isCur ? "#8B6914" : "#bbb", textAlign: "center", lineHeight: 1.3, maxWidth: 58 }}>
                              {s.label}
                            </div>
                            {logEntry && (
                              <div style={{ fontSize: "0.48rem", color: "#bbb", marginTop: 2, textAlign: "center" }}>
                                {logEntry.actorName.slice(0, 8)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#4a3520", marginBottom: 10 }}>
                      📋 سجل الأحداث
                    </div>
                    {contractLogs.length === 0 ? (
                      <div style={{ fontSize: "0.75rem", color: "#bbb" }}>لا يوجد سجلات</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {contractLogs.slice(-5).map(entry => (
                          <div key={entry.id} style={{
                            display: "flex", alignItems: "flex-start", gap: 8,
                            fontSize: "0.72rem", padding: "6px 10px", borderRadius: 8,
                            background: entry.action === "reject" ? "rgba(231,76,60,0.05)" : "rgba(39,174,96,0.05)",
                            border: `1px solid ${entry.action === "reject" ? "rgba(231,76,60,0.15)" : "rgba(39,174,96,0.15)"}`,
                          }}>
                            <span>{entry.action === "reject" ? "✕" : "✓"}</span>
                            <div style={{ flex: 1 }}>
                              <strong>{entry.actorName}</strong> ({entry.actorRole})
                              <span style={{ color: "#bbb", marginRight: 6 }}>
                                {new Date(entry.createdAt).toLocaleDateString("ar-SA")}
                              </span>
                              {entry.notes && entry.notes !== `اعتماد المرحلة ${entry.stage}` && (
                                <div style={{ color: "#6b5c3e", marginTop: 2 }}>{entry.notes}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
