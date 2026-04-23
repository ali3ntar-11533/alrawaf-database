import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { STAGES, ROLES } from "./types";
import type { Contract } from "./types";

// ── Design tokens ──────────────────────────────────────────────────
const GOLD       = "#C5A059";
const GOLD2      = "#a88540";
const GOLD_LIGHT = "#e8c96a";
const GOLD_BG    = "rgba(197,160,89,0.07)";
const GOLD_BOR   = "rgba(197,160,89,0.22)";
const CREAM      = "#FBF9F4";
const GREEN      = "#27ae60";
const RED        = "#c0392b";
const SHADOW_G   = "0 2px 16px rgba(197,160,89,0.12)";

// ── Grouped levels ─────────────────────────────────────────────────
const WORKFLOW_LEVELS = [
  {
    label: "إدارة المشروع",
    icon: "🏗️",
    color: "#2980b9",
    stages: [1, 2, 3],
  },
  {
    label: "التنفيذ الفني والتعاقدي",
    icon: "⚙️",
    color: "#8B6914",
    stages: [4, 5, 6, 7],
  },
  {
    label: "الاعتمادات العليا",
    icon: "🏛️",
    color: GOLD,
    stages: [8, 9],
  },
  {
    label: "مسؤول التوقيعات",
    icon: "📜",
    color: "#6c5ce7",
    stages: [10, 11],
  },
];

// ── Helpers ────────────────────────────────────────────────────────
function formatSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} مليون`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ألف`;
  return `${n}`;
}

// ── Props ──────────────────────────────────────────────────────────
interface Props {
  role: string;
  actorName: string;
  contracts: Contract[];
  pendingContracts: Contract[];
  onOpenContract: (id: number) => void;
}

type MetricTab = "all" | "active" | "completed" | "rejected";

export default function ContractDashboard({ role, actorName, contracts, pendingContracts, onOpenContract }: Props) {
  const [activeTab, setActiveTab]       = useState<MetricTab>("all");
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  // ── Counts ──────────────────────────────────────────────────────
  const total     = contracts.length;
  const cActive   = contracts.filter(c => c.status === "active").length;
  const cDone     = contracts.filter(c => c.status === "completed").length;
  const cRejected = contracts.filter(c => !!c.rejectionReason && c.status !== "completed").length;
  const totalSAR  = contracts.filter(c => c.status === "active").reduce((s, c) => s + (c.value || 0), 0);

  // ── Filtered set based on active tab ────────────────────────────
  const filtered = (() => {
    if (activeTab === "active")    return contracts.filter(c => c.status === "active" && !c.rejectionReason);
    if (activeTab === "completed") return contracts.filter(c => c.status === "completed");
    if (activeTab === "rejected")  return contracts.filter(c => !!c.rejectionReason && c.status !== "completed");
    return contracts;
  })();

  // Stage counts from filtered set
  const stageCounts = (stageNum: number) =>
    filtered.filter(c => c.currentStage === stageNum && c.status !== "completed");

  // Contracts in selected stage
  const stageContracts = selectedStage !== null ? stageCounts(selectedStage) : [];

  const myRoleInfo = ROLES.find(r => r.name === role);
  const isMyStage  = (stageNum: number) => myRoleInfo?.stage.includes(stageNum) ?? false;
  const canOpenFromStage = (stageNum: number) => !role || isMyStage(stageNum);

  const completePct = total > 0 ? Math.round((cDone / total) * 100) : 0;

  // ── Pie data ────────────────────────────────────────────────────
  const pieData = [
    { name: "نشطة",    value: cActive,    color: GOLD },
    { name: "مكتملة",  value: cDone,      color: GREEN },
    { name: "مرفوضة",  value: cRejected,  color: RED },
  ].filter(d => d.value > 0);

  // ── Tab definitions ─────────────────────────────────────────────
  const TABS: { key: MetricTab; label: string; count: number; icon: string; color: string }[] = [
    { key: "all",       label: "إجمالي العقود",      count: total,     icon: "📁", color: "#2980b9" },
    { key: "active",    label: "الطلبات النشطة",      count: cActive,   icon: "⚡", color: GOLD },
    { key: "completed", label: "العقود المكتملة",     count: cDone,     icon: "✅", color: GREEN },
    { key: "rejected",  label: "العقود المرفوضة",     count: cRejected, icon: "↩", color: RED },
  ];

  function handleStageClick(stageNum: number) {
    setSelectedStage(prev => prev === stageNum ? null : stageNum);
  }

  return (
    <div dir="rtl" style={{
      background: "#F7F8FA",
      minHeight: "100%",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
    }}>
      <style>{`
        @keyframes pulse-gold {
          0%,100% { box-shadow: 0 0 0 0 rgba(197,160,89,.35); }
          50%      { box-shadow: 0 0 20px 6px rgba(197,160,89,.08); }
        }
        @keyframes slide-down {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .tab-btn { transition: all 0.18s ease; cursor: pointer; }
        .tab-btn:hover { transform: translateY(-2px); }
        .stage-card { transition: all 0.15s ease; cursor: pointer; }
        .stage-card:hover { transform: translateY(-3px); }
        .contract-row { transition: background 0.12s; cursor: pointer; }
        .contract-row:hover { background: rgba(197,160,89,0.06) !important; }
      `}</style>

      {/* ── Cream Header ─────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${CREAM} 0%, #F2EADA 100%)`,
        borderBottom: `1.5px solid ${GOLD_BOR}`,
        padding: "18px 28px 16px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -50, left: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(197,160,89,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.12em", color: "rgba(197,160,89,0.75)", marginBottom: 3 }}>
              AL-RAWAF CONTRACT MANAGEMENT SYSTEM
            </div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#1A1A1A", margin: 0 }}>
              لوحة القيادة التنفيذية
            </h1>
            <p style={{ fontSize: "0.72rem", color: "#6b5b3e", marginTop: 3 }}>
              {role
                ? `مرحباً ${actorName || role} · ${pendingContracts.length} عقد بانتظار قرارك`
                : "اختر دورك من القائمة الجانبية للبدء"
              }
            </p>
          </div>

          {/* Completion ring */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#fff", border: `1px solid ${GOLD_BOR}`,
            borderRadius: 14, padding: "10px 18px",
            boxShadow: SHADOW_G,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: `conic-gradient(${GOLD} ${completePct * 3.6}deg, #EEEEEE 0deg)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "0.6rem", fontWeight: 900, color: GOLD }}>{completePct}%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1A1A1A" }}>نسبة الإنجاز</div>
              <div style={{ fontSize: "0.6rem", color: "#9b8060" }}>{cDone} من {total} عقد</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ══ PRIMARY METRIC TABS ══════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <div
                key={tab.key}
                className="tab-btn"
                onClick={() => { setActiveTab(tab.key); setSelectedStage(null); }}
                style={{
                  background: isActive ? "#fff" : "#fff",
                  borderRadius: 16,
                  padding: "18px 20px",
                  border: isActive ? `2.5px solid ${tab.color}` : `1px solid #E8E8E8`,
                  boxShadow: isActive ? `0 6px 24px ${tab.color}28` : "0 1px 6px rgba(0,0,0,0.05)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {isActive && (
                  <div style={{
                    position: "absolute", top: 0, right: 0, left: 0, height: 4,
                    background: `linear-gradient(90deg, ${tab.color}, ${tab.color}88)`,
                    borderRadius: "16px 16px 0 0",
                  }} />
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: isActive ? `${tab.color}18` : "#F5F5F5",
                    border: isActive ? `1px solid ${tab.color}30` : "1px solid #EBEBEB",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1rem",
                  }}>{tab.icon}</div>
                  {isActive && (
                    <div style={{
                      fontSize: "0.55rem", fontWeight: 800, color: tab.color,
                      background: `${tab.color}12`, borderRadius: 20, padding: "2px 8px",
                    }}>نشط</div>
                  )}
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: isActive ? tab.color : "#1A1A1A", lineHeight: 1 }}>
                  {tab.count}
                </div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: isActive ? tab.color : "#888", marginTop: 4 }}>
                  {tab.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ WORKFLOW HUB ══════════════════════════════════════════ */}
        <div style={{
          background: "#fff",
          borderRadius: 20,
          border: `1px solid #EBEBEB`,
          boxShadow: SHADOW_G,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 20px",
            background: CREAM,
            borderBottom: `1px solid ${GOLD_BOR}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.9rem", boxShadow: `0 3px 10px rgba(197,160,89,0.35)`,
            }}>🗺️</div>
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#1A1A1A" }}>خريطة دورة حياة العقد</div>
              <div style={{ fontSize: "0.62rem", color: "#9b8060" }}>اضغط على أي مرحلة لعرض عقودها — البيانات مُصفّاة وفق التبويب المحدد</div>
            </div>
            {myRoleInfo && (
              <div style={{
                marginRight: "auto", background: GOLD_BG, border: `1px solid ${GOLD_BOR}`,
                borderRadius: 10, padding: "5px 12px",
                fontSize: "0.65rem", fontWeight: 800, color: "#8B6914",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {myRoleInfo.icon} مرحلتك: {myRoleInfo.stage.map(s => `م${s}`).join("، ")}
              </div>
            )}
          </div>

          {/* Levels */}
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
            {WORKFLOW_LEVELS.map((level, lvlIdx) => {
              const levelHasContracts = level.stages.some(s => stageCounts(s).length > 0);
              return (
                <div key={lvlIdx} style={{ marginBottom: lvlIdx < WORKFLOW_LEVELS.length - 1 ? 0 : 0 }}>
                  {/* Level row */}
                  <div style={{
                    display: "flex", alignItems: "stretch", gap: 0,
                    borderBottom: lvlIdx < WORKFLOW_LEVELS.length - 1 ? `1px solid #F0F0F0` : "none",
                    paddingBottom: 12, marginBottom: 12,
                  }}>
                    {/* Level label (left sidebar) */}
                    <div style={{
                      width: 130, flexShrink: 0, paddingLeft: 12, paddingTop: 8,
                      borderLeft: `3px solid ${level.color}`,
                      marginLeft: 16,
                    }}>
                      <div style={{ fontSize: "0.58rem", fontWeight: 900, color: level.color, marginBottom: 2, letterSpacing: "0.04em" }}>
                        {level.icon} المستوى {lvlIdx + 1}
                      </div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#4a4a4a", lineHeight: 1.3 }}>
                        {level.label}
                      </div>
                      {levelHasContracts && (
                        <div style={{
                          marginTop: 5, fontSize: "0.55rem", color: level.color,
                          background: `${level.color}12`, borderRadius: 8, padding: "2px 6px",
                          display: "inline-block",
                        }}>
                          {level.stages.reduce((s, n) => s + stageCounts(n).length, 0)} عقد
                        </div>
                      )}
                    </div>

                    {/* Stage cards */}
                    <div style={{ flex: 1, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {level.stages.map(stageNum => {
                        const stage      = STAGES[stageNum - 1];
                        const count      = stageCounts(stageNum).length;
                        const isSelected = selectedStage === stageNum;
                        const isMine     = isMyStage(stageNum);
                        const hasC       = count > 0;

                        return (
                          <div
                            key={stageNum}
                            className="stage-card"
                            onClick={() => handleStageClick(stageNum)}
                            style={{
                              borderRadius: 14,
                              padding: "12px 16px",
                              minWidth: 120, flex: "1 1 120px", maxWidth: 160,
                              background: isSelected
                                ? `linear-gradient(135deg, ${GOLD}18, ${GOLD_BG})`
                                : isMine
                                  ? `linear-gradient(135deg, ${GOLD}10, rgba(197,160,89,0.04))`
                                  : hasC ? "#FAFAFA" : "#F7F7F7",
                              border: isSelected
                                ? `2px solid ${GOLD}`
                                : isMine
                                  ? `1.5px solid ${GOLD_BOR}`
                                  : hasC
                                    ? `1px solid #E4E4E4`
                                    : `1px solid #EEEEEE`,
                              boxShadow: isSelected
                                ? `0 4px 20px rgba(197,160,89,0.25)`
                                : isMine
                                  ? `0 2px 10px rgba(197,160,89,0.15)`
                                  : "none",
                              animation: isMine && hasC ? "pulse-gold 3s ease-in-out infinite" : "none",
                              position: "relative",
                            }}
                          >
                            {/* Badge */}
                            {hasC && (
                              <div style={{
                                position: "absolute", top: -8, left: -8,
                                width: 22, height: 22, borderRadius: "50%",
                                background: isSelected ? GOLD : isMine ? GOLD : level.color,
                                color: "#fff", fontSize: "0.6rem", fontWeight: 900,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: `0 2px 8px ${level.color}50`,
                              }}>{count}</div>
                            )}

                            <div style={{ fontSize: "1.2rem", marginBottom: 6 }}>{stage?.icon ?? "📄"}</div>
                            <div style={{ fontSize: "0.62rem", fontWeight: 900, color: isSelected ? "#8B6914" : isMine ? "#8B6914" : hasC ? "#4a4a4a" : "#AAAAAA" }}>
                              م{stageNum}
                            </div>
                            <div style={{ fontSize: "0.58rem", color: isSelected ? "#6b5b3e" : hasC ? "#666" : "#BBBBBB", lineHeight: 1.3, marginTop: 2 }}>
                              {stage?.label}
                            </div>
                            {isMine && (
                              <div style={{
                                marginTop: 6, fontSize: "0.5rem", color: GOLD2,
                                fontWeight: 800, display: "flex", alignItems: "center", gap: 2,
                              }}>⭐ مرحلتك</div>
                            )}
                            {isSelected && (
                              <div style={{
                                position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
                                width: 20, height: 3, borderRadius: 2,
                                background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})`,
                              }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inline contract list for selected stage (within this level) */}
                  {selectedStage !== null && level.stages.includes(selectedStage) && (
                    <div style={{
                      animation: "slide-down 0.2s ease",
                      background: GOLD_BG, borderRadius: 14,
                      border: `1.5px solid ${GOLD_BOR}`,
                      marginBottom: 12, overflow: "hidden",
                    }}>
                      <div style={{
                        padding: "10px 16px",
                        borderBottom: `1px solid ${GOLD_BOR}`,
                        display: "flex", alignItems: "center", gap: 8,
                        background: "rgba(197,160,89,0.06)",
                      }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#8B6914" }}>
                          {STAGES[selectedStage - 1]?.icon} م{selectedStage}: {STAGES[selectedStage - 1]?.label}
                        </span>
                        <span style={{ fontSize: "0.62rem", color: "#9b8060" }}>· {stageContracts.length} عقد</span>
                        <button
                          onClick={() => setSelectedStage(null)}
                          style={{
                            marginRight: "auto", border: "none", background: "transparent",
                            color: "#aaa", cursor: "pointer", fontSize: "0.75rem", padding: "0 4px",
                          }}
                        >✕</button>
                      </div>

                      {stageContracts.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "#BBB", fontSize: "0.75rem" }}>
                          لا عقود في هذه المرحلة ضمن التصفية الحالية
                        </div>
                      ) : (
                        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                          {stageContracts.map(c => {
                            const canOpen = canOpenFromStage(selectedStage);
                            return (
                              <div
                                key={c.id}
                                className="contract-row"
                                onClick={() => canOpen && onOpenContract(c.id)}
                                style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "10px 12px", borderRadius: 10,
                                  background: "#fff",
                                  border: `1px solid rgba(197,160,89,0.15)`,
                                  cursor: canOpen ? "pointer" : "default",
                                  opacity: canOpen ? 1 : 0.75,
                                }}
                              >
                                <div style={{
                                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                  background: canOpen
                                    ? `linear-gradient(135deg, ${GOLD}, ${GOLD2})`
                                    : "#E8E8E8",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "0.9rem",
                                }}>
                                  {canOpen ? STAGES[c.currentStage - 1]?.icon : "🔒"}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: "0.8rem", fontWeight: 800, color: "#1A1A1A",
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  }}>{c.title}</div>
                                  <div style={{ fontSize: "0.62rem", color: "#9b8060", marginTop: 1 }}>
                                    {c.contractNo} · {c.vendorName}
                                    {c.value > 0 && ` · ${formatSAR(c.value)} ر.س`}
                                  </div>
                                </div>
                                {canOpen ? (
                                  <span style={{ color: GOLD, fontWeight: 800, fontSize: "0.9rem" }}>←</span>
                                ) : (
                                  <span style={{ fontSize: "0.58rem", color: "#BBB" }}>غير مخوّل</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ MINI CHARTS ══════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Donut distribution */}
          <div style={{
            background: "#fff", borderRadius: 16,
            border: `1px solid #EBEBEB`, boxShadow: SHADOW_G,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 18px", borderBottom: `1px solid #F0F0F0`,
              background: CREAM, display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem",
              }}>🍩</div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1A1A1A" }}>توزيع حالة العقود</div>
                <div style={{ fontSize: "0.58rem", color: "#9b8060" }}>نسب الحالات المختلفة</div>
              </div>
            </div>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: unknown) => [`${v} عقد`, ""]}
                        contentStyle={{ fontFamily: "'Cairo',sans-serif", fontSize: "0.72rem", direction: "rtl", border: `1px solid ${GOLD_BOR}`, borderRadius: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#CCC", fontSize: "0.75rem" }}>لا بيانات</div>
                )}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "نشطة",   count: cActive,   color: GOLD,  pct: total ? Math.round(cActive / total * 100) : 0 },
                  { label: "مكتملة", count: cDone,     color: GREEN, pct: total ? Math.round(cDone / total * 100) : 0 },
                  { label: "مرفوضة", count: cRejected, color: RED,   pct: total ? Math.round(cRejected / total * 100) : 0 },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: "0.64rem", fontWeight: 700, color: "#555" }}>{item.label}</span>
                      <span style={{ fontSize: "0.64rem", fontWeight: 900, color: item.color }}>{item.count}</span>
                    </div>
                    <div style={{ height: 5, background: "#F0F0F0", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${item.pct}%`, borderRadius: 3,
                        background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stage distribution mini chart */}
          <div style={{
            background: "#fff", borderRadius: 16,
            border: `1px solid #EBEBEB`, boxShadow: SHADOW_G,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 18px", borderBottom: `1px solid #F0F0F0`,
              background: CREAM, display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem",
              }}>📊</div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1A1A1A" }}>توزيع العقود على المراحل</div>
                <div style={{ fontSize: "0.58rem", color: "#9b8060" }}>عدد العقود النشطة في كل مرحلة</div>
              </div>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 5 }}>
              {STAGES.map((stage, idx) => {
                const stageNum = idx + 1;
                const count = contracts.filter(c => c.currentStage === stageNum && c.status === "active").length;
                const maxCount = Math.max(...STAGES.map((_, i) => contracts.filter(c => c.currentStage === i + 1 && c.status === "active").length), 1);
                const pct = Math.round((count / maxCount) * 100);
                if (count === 0) return null;
                const isMine = isMyStage(stageNum);
                return (
                  <div key={stageNum} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 18, fontSize: "0.55rem", color: "#AAA", textAlign: "center", flexShrink: 0 }}>م{stageNum}</div>
                    <div style={{ flex: 1, height: 10, background: "#F5F5F5", borderRadius: 5, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`, borderRadius: 5,
                        background: isMine
                          ? `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`
                          : `linear-gradient(90deg, ${GOLD}66, ${GOLD}33)`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                    <div style={{
                      width: 20, fontSize: "0.6rem", fontWeight: 900,
                      color: isMine ? GOLD : "#888", textAlign: "center", flexShrink: 0,
                    }}>{count}</div>
                  </div>
                );
              })}
              {contracts.filter(c => c.status === "active").length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#CCC", fontSize: "0.75rem" }}>لا عقود نشطة</div>
              )}
            </div>
          </div>
        </div>

        {/* ══ VALUE SUMMARY STRIP ══════════════════════════════════ */}
        <div style={{
          background: `linear-gradient(135deg, #1A1A1A 0%, #2d2416 100%)`,
          borderRadius: 16, padding: "16px 24px",
          display: "flex", alignItems: "center", gap: 0,
          border: `1px solid ${GOLD_BOR}`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.12)`,
        }}>
          {[
            { label: "قيمة العقود النشطة الإجمالية", value: `${formatSAR(totalSAR)} ر.س`, icon: "💰" },
            { label: "العقود النشطة في المسار", value: `${cActive} عقد`, icon: "⚡" },
            { label: "نسبة الإنجاز الكلية", value: `${completePct}%`, icon: "📈" },
          ].map((item, i, arr) => (
            <div key={i} style={{
              flex: 1, textAlign: "center",
              borderLeft: i < arr.length - 1 ? `1px solid rgba(197,160,89,0.2)` : "none",
            }}>
              <div style={{ fontSize: "0.65rem", color: "rgba(197,160,89,0.7)", marginBottom: 4 }}>{item.icon} {item.label}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: GOLD_LIGHT }}>{item.value}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
