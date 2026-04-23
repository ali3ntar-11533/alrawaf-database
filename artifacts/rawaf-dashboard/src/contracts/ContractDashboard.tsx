import { useEffect, useState } from "react";
import { GOLD, GOLD_BG, GOLD_BORDER, STAGES } from "./types";
import type { Contract, ContractStats } from "./types";
import { getContractStats, listContracts } from "./api";

interface Props {
  roleName: string;
  pendingContracts: Contract[];
  onOpenContract: (id: number) => void;
}

export default function ContractDashboard({ roleName, pendingContracts, onOpenContract }: Props) {
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [recent, setRecent] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getContractStats(), listContracts()])
      .then(([s, all]) => {
        setStats(s);
        setRecent(all.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: "جديد",         value: stats?.draft      ?? 0, icon: "🆕", color: "#3498db" },
    { label: "قيد الإجراء",  value: stats?.inProgress ?? 0, icon: "⚙️", color: "#f39c12" },
    { label: "معتمد",        value: stats?.approved   ?? 0, icon: "✅", color: "#27ae60" },
    { label: "موقّع ومكتمل", value: stats?.completed  ?? 0, icon: "📜", color: GOLD      },
  ];

  return (
    <div dir="rtl" style={{ padding: "24px 28px", fontFamily: "'Cairo', 'Tajawal', sans-serif", maxWidth: 960 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#1a1206", marginBottom: 4 }}>
          🏠 لوحة التحكم
        </h2>
        <p style={{ color: "#9b8060", fontSize: "0.82rem" }}>
          أهلاً، {roleName} — مراقبة المؤشرات اللحظية لمنصة العقود
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#bbb" }}>جاري التحميل...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
            {kpis.map((k, i) => (
              <div key={i} style={{
                background: "#fff",
                border: `1px solid ${i === 3 ? GOLD_BORDER : "rgba(0,0,0,0.07)"}`,
                borderRadius: 14,
                padding: "20px 18px",
                boxShadow: i === 3 ? `0 0 0 2px rgba(197,160,89,0.12)` : "0 2px 8px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>{k.icon}</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: k.color, lineHeight: 1 }}>
                  {k.value}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#6b5c3e", marginTop: 4, fontWeight: 600 }}>
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          {pendingContracts.length > 0 && (
            <div style={{
              background: "rgba(197,160,89,0.07)",
              border: `1.5px solid ${GOLD_BORDER}`,
              borderRadius: 14, padding: "18px 20px", marginBottom: 28,
            }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#8B6914", marginBottom: 12 }}>
                ⚡ تنتظر إجراءك ({pendingContracts.length} عقد)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pendingContracts.slice(0, 3).map(c => (
                  <div
                    key={c.id}
                    onClick={() => onOpenContract(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: "#fff", borderRadius: 10, padding: "10px 14px",
                      cursor: "pointer", border: "1px solid rgba(197,160,89,0.2)",
                      transition: "box-shadow 0.18s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(197,160,89,0.2)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: GOLD_BG, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1rem", flexShrink: 0,
                    }}>{STAGES[c.currentStage - 1]?.icon ?? "📄"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1a1206", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#9b8060" }}>
                        {c.contractNo} · المرحلة {c.currentStage}: {STAGES[c.currentStage - 1]?.label}
                      </div>
                    </div>
                    <span style={{ color: GOLD, fontSize: "1rem" }}>←</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#4a3520", marginBottom: 12 }}>
              📋 آخر العقود
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recent.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: "#bbb", fontSize: "0.85rem" }}>
                  لا يوجد عقود بعد — ابدأ بإنشاء عقد جديد من قسم طلبات العقود
                </div>
              ) : recent.map(c => {
                const pct = Math.round((c.currentStage / 11) * 100);
                const statusColor = c.status === "completed" ? "#27ae60" : c.rejectionReason ? "#e74c3c" : "#f39c12";
                return (
                  <div
                    key={c.id}
                    onClick={() => onOpenContract(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      background: "#fff", borderRadius: 12, padding: "12px 16px",
                      cursor: "pointer", border: "1px solid rgba(0,0,0,0.07)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "box-shadow 0.18s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a1206", marginBottom: 3 }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#9b8060" }}>
                        {c.contractNo} · {c.vendorName}
                      </div>
                      <div style={{
                        height: 4, borderRadius: 3,
                        background: "rgba(0,0,0,0.07)", marginTop: 6,
                      }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          width: `${pct}%`,
                          background: c.status === "completed"
                            ? "#27ae60"
                            : `linear-gradient(90deg, ${GOLD}, #a88540)`,
                          transition: "width 0.5s",
                        }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 900, color: statusColor }}>{pct}%</div>
                      <div style={{ fontSize: "0.6rem", color: "#bbb" }}>إنجاز</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
