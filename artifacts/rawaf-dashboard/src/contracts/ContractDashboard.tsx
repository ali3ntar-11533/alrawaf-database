import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { STAGES, ROLES } from "./types";
import type { Contract } from "./types";

// ── Design tokens ─────────────────────────────────────────────────────
const GOLD        = "#C5A059";
const GOLD2       = "#a88540";
const GOLD_END    = "#E2C275";
const GOLD_GLOW   = "rgba(197,160,89,0.45)";
const GOLD_BG     = "rgba(197,160,89,0.07)";
const GOLD_BOR    = "rgba(197,160,89,0.22)";
const CREAM       = "#FBF9F4";
const GREEN       = "#22c55e";
const GREEN_DARK  = "#15803d";
const RED         = "#ef4444";
const RED_DARK    = "#b91c1c";
const BLUE        = "#3b82f6";
const BLUE_DARK   = "#1d4ed8";

// Level accent colours
const LEVEL_COLORS = ["#3b82f6", "#8B6914", GOLD, "#7c3aed"];

// ── Workflow level definitions ────────────────────────────────────────
const WORKFLOW_LEVELS = [
  { label: "إدارة المشروع",          icon: "🏗️", stages: [1, 2, 3]     },
  { label: "التنفيذ الفني والتعاقدي", icon: "⚙️", stages: [4, 5, 6, 7] },
  { label: "الاعتمادات العليا",       icon: "🏛️", stages: [8, 9]        },
  { label: "مسؤول التوقيعات",         icon: "📜", stages: [10, 11]      },
];

// ── Helpers ──────────────────────────────────────────────────────────
function formatSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} مليون`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ألف`;
  return `${n}`;
}

// ── Props ────────────────────────────────────────────────────────────
interface Props {
  role: string;
  actorName: string;
  contracts: Contract[];
  pendingContracts: Contract[];
  onOpenContract: (id: number) => void;
}

type MetricTab = "all" | "active" | "completed" | "rejected";

export default function ContractDashboard({ role, actorName, contracts, pendingContracts, onOpenContract }: Props) {
  const [activeTab,     setActiveTab]     = useState<MetricTab>("all");
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  // ── Counts ───────────────────────────────────────────────────────
  const total     = contracts.length;
  const cActive   = contracts.filter(c => c.status === "active" && !c.rejectionReason).length;
  const cDone     = contracts.filter(c => c.status === "completed").length;
  const cRejected = contracts.filter(c => !!c.rejectionReason && c.status !== "completed").length;
  const totalSAR  = contracts.filter(c => c.status === "active").reduce((s, c) => s + (c.value || 0), 0);
  const completePct = total > 0 ? Math.round((cDone / total) * 100) : 0;

  // ── Filtered set ─────────────────────────────────────────────────
  const filtered = (() => {
    if (activeTab === "active")    return contracts.filter(c => c.status === "active" && !c.rejectionReason);
    if (activeTab === "completed") return contracts.filter(c => c.status === "completed");
    if (activeTab === "rejected")  return contracts.filter(c => !!c.rejectionReason && c.status !== "completed");
    return contracts;
  })();

  const stageCounts   = (s: number) => filtered.filter(c => c.currentStage === s && c.status !== "completed");
  const stageContracts = selectedStage !== null ? stageCounts(selectedStage) : [];

  const myRoleInfo   = ROLES.find(r => r.name === role);
  const isMyStage    = (s: number) => myRoleInfo?.stage.includes(s) ?? false;
  const canOpen      = (s: number) => !role || isMyStage(s);

  // ── Pie data ─────────────────────────────────────────────────────
  const pieData = [
    { name: "نشطة",   value: cActive,   color: GOLD  },
    { name: "مكتملة", value: cDone,     color: GREEN },
    { name: "مرفوضة", value: cRejected, color: RED   },
  ].filter(d => d.value > 0);

  // ── Metric tile definitions ───────────────────────────────────────
  const TILES: { key: MetricTab; label: string; sub: string; count: number; icon: string; grad: string; shadow: string }[] = [
    {
      key: "all",
      label: "إجمالي العقود",  sub: "جميع الحالات",
      count: total,
      icon: "📁",
      grad: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
      shadow: "0 6px 28px rgba(59,130,246,0.18)",
    },
    {
      key: "active",
      label: "الطلبات النشطة", sub: "قيد التنفيذ الآن",
      count: cActive,
      icon: "⚡",
      grad: `linear-gradient(135deg, rgba(197,160,89,0.12) 0%, rgba(226,194,117,0.08) 100%)`,
      shadow: `0 6px 28px ${GOLD_GLOW}`,
    },
    {
      key: "completed",
      label: "العقود المكتملة", sub: "أُنجزت بنجاح",
      count: cDone,
      icon: "✅",
      grad: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
      shadow: "0 6px 28px rgba(34,197,94,0.18)",
    },
    {
      key: "rejected",
      label: "العقود المرفوضة", sub: "أُعيدت أو رُفضت",
      count: cRejected,
      icon: "↩",
      grad: "linear-gradient(135deg, #FFF5F5 0%, #FEE2E2 100%)",
      shadow: "0 6px 28px rgba(239,68,68,0.18)",
    },
  ];

  const TILE_ACCENT: Record<MetricTab, string> = {
    all: BLUE, active: GOLD, completed: GREEN, rejected: RED,
  };
  const TILE_ACCENT_DARK: Record<MetricTab, string> = {
    all: BLUE_DARK, active: GOLD2, completed: GREEN_DARK, rejected: RED_DARK,
  };

  function toggleStage(s: number) {
    setSelectedStage(prev => (prev === s ? null : s));
  }

  return (
    <div dir="rtl" style={{
      background: "linear-gradient(160deg, #F9F8F6 0%, #F5F0E8 50%, #F9F8F6 100%)",
      minHeight: "100%",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
    }}>
      <style>{`
        @keyframes glow-gold {
          0%,100% { box-shadow: 0 0 0 0 ${GOLD_GLOW}, 0 2px 10px rgba(197,160,89,0.3); }
          50%      { box-shadow: 0 0 14px 4px ${GOLD_GLOW}, 0 4px 16px rgba(197,160,89,0.4); }
        }
        @keyframes accordion-open {
          from { opacity:0; transform:translateY(-10px) scaleY(0.96); }
          to   { opacity:1; transform:translateY(0)    scaleY(1);    }
        }
        @keyframes tile-pop {
          from { transform:scale(0.97); opacity:0.8; }
          to   { transform:scale(1);   opacity:1;   }
        }
        .metric-tile { transition: transform 0.18s ease, box-shadow 0.18s ease; cursor: pointer; }
        .metric-tile:hover  { transform: translateY(-4px) !important; }
        .stage-chip { transition: all 0.16s ease; cursor: pointer; }
        .stage-chip:hover { transform: translateY(-3px) scale(1.03); }
        .contract-row { transition: background 0.12s; cursor: pointer; }
        .contract-row:hover { background: rgba(197,160,89,0.07) !important; }
        .level-row-glass {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.72);
          border-radius: 20px;
          box-shadow: 0 2px 18px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
        }
      `}</style>

      {/* ── Cream Header ──────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(120deg, ${CREAM} 0%, #EEE4CC 60%, #F5EDD8 100%)`,
        borderBottom: `1.5px solid ${GOLD_BOR}`,
        padding: "20px 30px 18px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative orbs */}
        <div style={{ position:"absolute", top:-70, left:-70, width:220, height:220, borderRadius:"50%", background:"rgba(197,160,89,0.06)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-50, right:100, width:160, height:160, borderRadius:"50%", background:"rgba(197,160,89,0.04)", pointerEvents:"none" }} />

        <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:"0.55rem", fontWeight:800, letterSpacing:"0.14em", color:"rgba(197,160,89,0.8)", marginBottom:4 }}>
              AL-RAWAF CONTRACT MANAGEMENT SYSTEM
            </div>
            <h1 style={{ fontSize:"1.5rem", fontWeight:900, color:"#1A1108", margin:0, letterSpacing:"-0.02em" }}>
              لوحة القيادة التنفيذية
            </h1>
            <p style={{ fontSize:"0.74rem", color:"#6b5b3e", marginTop:5, marginBottom:0 }}>
              {role
                ? `مرحباً ${actorName || role} — ${pendingContracts.length} عقد بانتظار قرارك`
                : "اختر دورك من القائمة الجانبية للبدء"}
            </p>
          </div>

          {/* Completion donut */}
          <div style={{
            display:"flex", alignItems:"center", gap:12,
            background:"rgba(255,255,255,0.75)", backdropFilter:"blur(10px)",
            border:`1px solid rgba(197,160,89,0.25)`,
            borderRadius:16, padding:"12px 20px",
            boxShadow:"0 4px 20px rgba(0,0,0,0.07)",
          }}>
            <div style={{
              width:50, height:50, borderRadius:"50%",
              background:`conic-gradient(${GOLD} ${completePct*3.6}deg, #E8E0D0 0deg)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 0 0 3px rgba(197,160,89,0.15)`,
            }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:"0.62rem", fontWeight:900, color:GOLD }}>{completePct}%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize:"0.75rem", fontWeight:800, color:"#1A1A1A" }}>نسبة الإنجاز</div>
              <div style={{ fontSize:"0.62rem", color:"#9b8060" }}>{cDone} من {total} عقد مكتمل</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"22px 26px", display:"flex", flexDirection:"column", gap:20 }}>

        {/* ══ METRIC TILES ══════════════════════════════════════════════ */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
          {TILES.map(tile => {
            const isActive = activeTab === tile.key;
            const accent   = TILE_ACCENT[tile.key];
            const accentD  = TILE_ACCENT_DARK[tile.key];
            return (
              <div
                key={tile.key}
                className="metric-tile"
                onClick={() => { setActiveTab(tile.key); setSelectedStage(null); }}
                style={{
                  background: isActive ? tile.grad : "#fff",
                  borderRadius: 18,
                  padding: "20px 22px",
                  border: isActive ? `2px solid ${accent}40` : "1px solid #EBEBEB",
                  boxShadow: isActive ? tile.shadow : "0 1px 8px rgba(0,0,0,0.05)",
                  position: "relative", overflow: "hidden",
                  animation: isActive ? "tile-pop 0.2s ease" : "none",
                  transform: isActive ? "translateY(-3px)" : "none",
                }}
              >
                {/* Active top bar */}
                {isActive && (
                  <div style={{
                    position:"absolute", top:0, right:0, left:0, height:3,
                    background:`linear-gradient(90deg, ${accent}, ${accentD})`,
                    borderRadius:"18px 18px 0 0",
                  }}/>
                )}
                {/* Decorative circle bg */}
                <div style={{
                  position:"absolute", top:-20, left:-20, width:90, height:90, borderRadius:"50%",
                  background: isActive ? `${accent}08` : "transparent",
                  pointerEvents:"none",
                }}/>

                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{
                    width:42, height:42, borderRadius:12, flexShrink:0,
                    background: isActive ? `${accent}18` : "#F5F5F5",
                    border: isActive ? `1.5px solid ${accent}30` : "1px solid #EBEBEB",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"1.1rem",
                    boxShadow: isActive ? `0 3px 12px ${accent}25` : "none",
                  }}>{tile.icon}</div>
                  {isActive && (
                    <span style={{
                      fontSize:"0.52rem", fontWeight:800, color:accent,
                      background:`${accent}12`, borderRadius:20, padding:"3px 9px",
                      border:`1px solid ${accent}20`,
                    }}>مفعّل</span>
                  )}
                </div>

                <div style={{
                  fontSize:"2rem", fontWeight:900, lineHeight:1,
                  color: isActive ? accentD : "#1A1A1A",
                  letterSpacing:"-0.03em",
                }}>{tile.count}</div>

                <div style={{ fontSize:"0.72rem", fontWeight:700, color: isActive ? accentD : "#555", marginTop:5 }}>
                  {tile.label}
                </div>
                <div style={{ fontSize:"0.6rem", color: isActive ? `${accent}CC` : "#AAA", marginTop:2 }}>
                  {tile.sub}
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ WORKFLOW HUB — STACKED GLASS ROWS ════════════════════════ */}
        <div style={{
          background:"rgba(255,255,255,0.6)",
          backdropFilter:"blur(20px)",
          WebkitBackdropFilter:"blur(20px)",
          borderRadius:24,
          border:`1px solid rgba(255,255,255,0.8)`,
          boxShadow:"0 4px 32px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
          overflow:"hidden",
        }}>
          {/* Hub header */}
          <div style={{
            padding:"16px 24px",
            background:`linear-gradient(135deg, ${CREAM} 0%, rgba(245,237,216,0.9) 100%)`,
            borderBottom:`1.5px solid ${GOLD_BOR}`,
            display:"flex", alignItems:"center", gap:12,
          }}>
            <div style={{
              width:38, height:38, borderRadius:12,
              background:`linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1rem", boxShadow:`0 4px 14px ${GOLD_GLOW}`,
            }}>🗺️</div>
            <div>
              <div style={{ fontSize:"0.92rem", fontWeight:900, color:"#1A1108", letterSpacing:"-0.01em" }}>
                خريطة دورة حياة العقد
              </div>
              <div style={{ fontSize:"0.62rem", color:"#9b8060", marginTop:1 }}>
                اضغط على أي مرحلة لعرض عقودها · البيانات مُصفّاة وفق التبويب المحدد
              </div>
            </div>
            {myRoleInfo && (
              <div style={{
                marginRight:"auto",
                background:`linear-gradient(135deg, ${GOLD}18, ${GOLD_BG})`,
                border:`1px solid ${GOLD_BOR}`,
                borderRadius:12, padding:"6px 14px",
                fontSize:"0.66rem", fontWeight:800, color:"#7A5C10",
                display:"flex", alignItems:"center", gap:6,
              }}>
                {myRoleInfo.icon} مرحلتك: {myRoleInfo.stage.map(s => `م${s}`).join("، ")}
              </div>
            )}
          </div>

          {/* Stacked level rows */}
          <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
            {WORKFLOW_LEVELS.map((level, lvlIdx) => {
              const accent       = LEVEL_COLORS[lvlIdx];
              const totalInLevel = level.stages.reduce((sum, s) => sum + stageCounts(s).length, 0);
              const levelSelectedStage = level.stages.includes(selectedStage ?? -1) ? selectedStage : null;

              return (
                <div key={lvlIdx}>
                  {/* Glass row card */}
                  <div className="level-row-glass" style={{ padding:"0", overflow:"hidden" }}>
                    {/* Row header strip */}
                    <div style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"10px 18px",
                      background:`linear-gradient(90deg, ${accent}10 0%, transparent 100%)`,
                      borderBottom:`1px solid ${accent}18`,
                    }}>
                      {/* Left accent bar (RTL: right) */}
                      <div style={{
                        width:4, height:36, borderRadius:3, flexShrink:0,
                        background:`linear-gradient(180deg, ${accent}, ${accent}60)`,
                        boxShadow:`0 0 8px ${accent}40`,
                      }}/>
                      <div>
                        <div style={{ fontSize:"0.6rem", fontWeight:900, color:`${accent}`, letterSpacing:"0.06em" }}>
                          {level.icon} المستوى {lvlIdx + 1}
                        </div>
                        <div style={{ fontSize:"0.8rem", fontWeight:800, color:"#1A1A1A", letterSpacing:"-0.01em" }}>
                          {level.label}
                        </div>
                      </div>
                      {totalInLevel > 0 && (
                        <div style={{
                          marginRight:"auto",
                          background:`linear-gradient(135deg, ${accent}20, ${accent}10)`,
                          border:`1px solid ${accent}30`,
                          borderRadius:20, padding:"3px 12px",
                          fontSize:"0.62rem", fontWeight:800, color:accent,
                        }}>
                          {totalInLevel} عقد في هذا المستوى
                        </div>
                      )}
                    </div>

                    {/* Stage chips */}
                    <div style={{
                      display:"flex", gap:10, padding:"14px 18px",
                      flexWrap:"wrap",
                    }}>
                      {level.stages.map(stageNum => {
                        const stage      = STAGES[stageNum - 1];
                        const count      = stageCounts(stageNum).length;
                        const isSelected = selectedStage === stageNum;
                        const isMine     = isMyStage(stageNum);
                        const hasC       = count > 0;

                        return (
                          <div
                            key={stageNum}
                            className="stage-chip"
                            onClick={() => toggleStage(stageNum)}
                            style={{
                              position:"relative",
                              display:"flex", alignItems:"center", gap:10,
                              padding:"12px 18px",
                              borderRadius:16, flex:"1 1 140px", minWidth:140,
                              background: isSelected
                                ? `linear-gradient(135deg, ${GOLD}22, rgba(226,194,117,0.12))`
                                : isMine
                                  ? `linear-gradient(135deg, ${GOLD}12, rgba(197,160,89,0.05))`
                                  : hasC
                                    ? "rgba(255,255,255,0.9)"
                                    : "rgba(248,248,248,0.8)",
                              border: isSelected
                                ? `2px solid ${GOLD}`
                                : isMine
                                  ? `1.5px solid ${GOLD_BOR}`
                                  : hasC
                                    ? "1px solid rgba(0,0,0,0.08)"
                                    : "1px solid rgba(0,0,0,0.05)",
                              boxShadow: isSelected
                                ? `0 4px 20px ${GOLD_GLOW}, 0 0 0 1px ${GOLD}40`
                                : isMine
                                  ? `0 3px 14px rgba(197,160,89,0.2)`
                                  : hasC
                                    ? "0 2px 8px rgba(0,0,0,0.07)"
                                    : "none",
                              animation: isSelected
                                ? "glow-gold 2.5s ease-in-out infinite"
                                : isMine && hasC
                                  ? "glow-gold 3.5s ease-in-out infinite"
                                  : "none",
                            }}
                          >
                            {/* Stage icon */}
                            <div style={{
                              width:38, height:38, borderRadius:11, flexShrink:0,
                              background: isSelected
                                ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`
                                : isMine
                                  ? `linear-gradient(135deg, ${GOLD}CC, ${GOLD_END}99)`
                                  : hasC
                                    ? `${accent}18`
                                    : "#F0F0F0",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:"1.1rem",
                              boxShadow: isSelected ? `0 3px 12px ${GOLD_GLOW}` : "none",
                            }}>
                              {stage?.icon ?? "📄"}
                            </div>

                            {/* Labels */}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{
                                fontSize:"0.62rem", fontWeight:900,
                                color: isSelected ? "#8B6914" : isMine ? "#8B6914" : hasC ? "#2a2a2a" : "#AAAAAA",
                              }}>م{stageNum}</div>
                              <div style={{
                                fontSize:"0.6rem", lineHeight:1.35, marginTop:1,
                                color: isSelected ? "#6b5b3e" : hasC ? "#555" : "#C0C0C0",
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                              }}>{stage?.label}</div>
                              {isMine && (
                                <div style={{ fontSize:"0.5rem", color:GOLD2, fontWeight:900, marginTop:3 }}>
                                  ⭐ مرحلتك
                                </div>
                              )}
                            </div>

                            {/* Glowing count badge */}
                            {hasC && (
                              <div style={{
                                minWidth:28, height:28, borderRadius:"50%", flexShrink:0,
                                background: isSelected
                                  ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`
                                  : isMine
                                    ? `linear-gradient(135deg, ${GOLD}, ${GOLD2})`
                                    : `linear-gradient(135deg, ${accent}, ${accent}CC)`,
                                color:"#fff",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:"0.62rem", fontWeight:900,
                                boxShadow: isSelected
                                  ? `0 0 12px ${GOLD_GLOW}, 0 2px 8px rgba(197,160,89,0.5)`
                                  : `0 0 8px ${accent}60, 0 2px 6px ${accent}40`,
                              }}>{count}</div>
                            )}

                            {/* Selection indicator bottom bar */}
                            {isSelected && (
                              <div style={{
                                position:"absolute", bottom:0, right:"50%", transform:"translateX(50%)",
                                width:40, height:3, borderRadius:"2px 2px 0 0",
                                background:`linear-gradient(90deg, ${GOLD}, ${GOLD_END})`,
                              }}/>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accordion — contract list for selected stage in this level */}
                  {levelSelectedStage !== null && (
                    <div style={{
                      marginTop:8,
                      animation:"accordion-open 0.22s cubic-bezier(0.34,1.1,0.64,1)",
                      background:"rgba(255,255,255,0.92)",
                      backdropFilter:"blur(10px)",
                      borderRadius:18,
                      border:`2px solid ${GOLD_BOR}`,
                      overflow:"hidden",
                      boxShadow:`0 6px 30px ${GOLD_GLOW}, 0 2px 10px rgba(0,0,0,0.06)`,
                    }}>
                      {/* Accordion header */}
                      <div style={{
                        display:"flex", alignItems:"center", gap:10,
                        padding:"11px 18px",
                        background:`linear-gradient(90deg, rgba(197,160,89,0.1) 0%, rgba(226,194,117,0.04) 100%)`,
                        borderBottom:`1px solid ${GOLD_BOR}`,
                      }}>
                        <div style={{
                          width:30, height:30, borderRadius:9, flexShrink:0,
                          background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"0.85rem",
                          boxShadow:`0 2px 10px ${GOLD_GLOW}`,
                        }}>{STAGES[levelSelectedStage - 1]?.icon}</div>
                        <div>
                          <div style={{ fontSize:"0.8rem", fontWeight:900, color:"#6b4c10" }}>
                            م{levelSelectedStage}: {STAGES[levelSelectedStage - 1]?.label}
                          </div>
                          <div style={{ fontSize:"0.6rem", color:"#9b8060" }}>
                            {stageContracts.length} عقد في هذه المرحلة
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedStage(null)}
                          style={{
                            marginRight:"auto", border:"none",
                            background:"rgba(0,0,0,0.06)", borderRadius:8,
                            color:"#888", cursor:"pointer",
                            fontSize:"0.7rem", padding:"4px 10px",
                            transition:"background 0.15s",
                          }}
                        >✕ إغلاق</button>
                      </div>

                      {/* Contract list */}
                      {stageContracts.length === 0 ? (
                        <div style={{ padding:"28px", textAlign:"center", color:"#C0C0C0", fontSize:"0.8rem" }}>
                          لا عقود في هذه المرحلة ضمن التصفية الحالية
                        </div>
                      ) : (
                        <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:7 }}>
                          {stageContracts.map(c => {
                            const allowed = canOpen(levelSelectedStage);
                            return (
                              <div
                                key={c.id}
                                className="contract-row"
                                onClick={() => allowed && onOpenContract(c.id)}
                                style={{
                                  display:"flex", alignItems:"center", gap:12,
                                  padding:"11px 14px", borderRadius:13,
                                  background:"#fff",
                                  border:"1px solid rgba(197,160,89,0.15)",
                                  cursor: allowed ? "pointer" : "default",
                                  opacity: allowed ? 1 : 0.7,
                                  boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
                                }}
                              >
                                <div style={{
                                  width:38, height:38, borderRadius:11, flexShrink:0,
                                  background: allowed
                                    ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`
                                    : "#EBEBEB",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  fontSize:"0.95rem",
                                  boxShadow: allowed ? `0 2px 10px ${GOLD_GLOW}` : "none",
                                }}>
                                  {allowed ? STAGES[c.currentStage - 1]?.icon : "🔒"}
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{
                                    fontSize:"0.82rem", fontWeight:800, color:"#1A1A1A",
                                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                                  }}>{c.title}</div>
                                  <div style={{ fontSize:"0.62rem", color:"#9b8060", marginTop:2 }}>
                                    {c.contractNo}
                                    {c.vendorName && ` · ${c.vendorName}`}
                                    {c.value > 0 && ` · ${formatSAR(c.value)} ر.س`}
                                  </div>
                                </div>
                                {allowed ? (
                                  <div style={{
                                    width:28, height:28, borderRadius:"50%",
                                    background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`,
                                    display:"flex", alignItems:"center", justifyContent:"center",
                                    color:"#fff", fontWeight:900, fontSize:"0.85rem",
                                    boxShadow:`0 2px 8px ${GOLD_GLOW}`,
                                  }}>←</div>
                                ) : (
                                  <span style={{
                                    fontSize:"0.58rem", color:"#CCC",
                                    background:"#F5F5F5", borderRadius:8, padding:"3px 8px",
                                  }}>غير مخوّل</span>
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

        {/* ══ MINI CHARTS ═══════════════════════════════════════════════ */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

          {/* Donut */}
          <div style={{
            background:"rgba(255,255,255,0.85)",
            backdropFilter:"blur(12px)",
            borderRadius:20, border:"1px solid rgba(255,255,255,0.7)",
            boxShadow:"0 2px 16px rgba(0,0,0,0.06)", overflow:"hidden",
          }}>
            <div style={{
              padding:"13px 18px", borderBottom:`1px solid rgba(197,160,89,0.12)`,
              background:`linear-gradient(90deg, ${CREAM}, transparent)`,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <div style={{
                width:32, height:32, borderRadius:9,
                background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem",
                boxShadow:`0 2px 10px ${GOLD_GLOW}`,
              }}>🍩</div>
              <div>
                <div style={{ fontSize:"0.82rem", fontWeight:800, color:"#1A1A1A" }}>توزيع حالة العقود</div>
                <div style={{ fontSize:"0.58rem", color:"#9b8060" }}>نسب الحالات المختلفة</div>
              </div>
            </div>
            <div style={{ padding:"12px 18px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:120, height:120, flexShrink:0 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value">
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: unknown) => [`${v} عقد`, ""]}
                        contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.72rem", direction:"rtl", border:`1px solid ${GOLD_BOR}`, borderRadius:10 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#CCC", fontSize:"0.75rem" }}>لا بيانات</div>
                )}
              </div>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { label:"نشطة",   count:cActive,   color:GOLD,  pct: total ? Math.round(cActive/total*100) : 0 },
                  { label:"مكتملة", count:cDone,     color:GREEN, pct: total ? Math.round(cDone/total*100) : 0 },
                  { label:"مرفوضة", count:cRejected, color:RED,   pct: total ? Math.round(cRejected/total*100) : 0 },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:"0.65rem", fontWeight:700, color:"#555" }}>{item.label}</span>
                      <span style={{ fontSize:"0.65rem", fontWeight:900, color:item.color }}>{item.count}</span>
                    </div>
                    <div style={{ height:6, background:"#F0F0F0", borderRadius:4, overflow:"hidden" }}>
                      <div style={{
                        height:"100%", width:`${item.pct}%`, borderRadius:4,
                        background:`linear-gradient(90deg, ${item.color}, ${item.color}80)`,
                        transition:"width 0.7s ease",
                        boxShadow:`0 0 6px ${item.color}50`,
                      }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stage bar chart */}
          <div style={{
            background:"rgba(255,255,255,0.85)",
            backdropFilter:"blur(12px)",
            borderRadius:20, border:"1px solid rgba(255,255,255,0.7)",
            boxShadow:"0 2px 16px rgba(0,0,0,0.06)", overflow:"hidden",
          }}>
            <div style={{
              padding:"13px 18px", borderBottom:`1px solid rgba(197,160,89,0.12)`,
              background:`linear-gradient(90deg, ${CREAM}, transparent)`,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <div style={{
                width:32, height:32, borderRadius:9,
                background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem",
                boxShadow:`0 2px 10px ${GOLD_GLOW}`,
              }}>📊</div>
              <div>
                <div style={{ fontSize:"0.82rem", fontWeight:800, color:"#1A1A1A" }}>توزيع العقود على المراحل</div>
                <div style={{ fontSize:"0.58rem", color:"#9b8060" }}>العقود النشطة في كل مرحلة</div>
              </div>
            </div>
            <div style={{ padding:"12px 18px 14px", display:"flex", flexDirection:"column", gap:7 }}>
              {STAGES.map((stage, idx) => {
                const sNum  = idx + 1;
                const count = contracts.filter(c => c.currentStage === sNum && c.status === "active").length;
                const max   = Math.max(...STAGES.map((_, i) => contracts.filter(c => c.currentStage === i+1 && c.status === "active").length), 1);
                const pct   = Math.round((count / max) * 100);
                if (count === 0) return null;
                const mine  = isMyStage(sNum);
                return (
                  <div key={sNum} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:22, fontSize:"0.55rem", color:"#AAA", textAlign:"center", flexShrink:0 }}>م{sNum}</div>
                    <div style={{ flex:1, height:8, background:"#F0F0F0", borderRadius:4, overflow:"hidden" }}>
                      <div style={{
                        height:"100%", width:`${pct}%`, borderRadius:4, transition:"width 0.7s ease",
                        background: mine
                          ? `linear-gradient(90deg, ${GOLD}, ${GOLD_END})`
                          : `linear-gradient(90deg, ${GOLD}66, ${GOLD}33)`,
                        boxShadow: mine ? `0 0 8px ${GOLD_GLOW}` : "none",
                      }}/>
                    </div>
                    <div style={{
                      width:22, fontSize:"0.62rem", fontWeight:900,
                      color: mine ? GOLD : "#999", textAlign:"center", flexShrink:0,
                    }}>{count}</div>
                  </div>
                );
              })}
              {contracts.filter(c => c.status === "active").length === 0 && (
                <div style={{ textAlign:"center", padding:"20px 0", color:"#CCC", fontSize:"0.75rem" }}>لا عقود نشطة</div>
              )}
            </div>
          </div>
        </div>

        {/* ══ DARK VALUE STRIP ══════════════════════════════════════════ */}
        <div style={{
          background:"linear-gradient(135deg, #1C1810 0%, #2A2010 50%, #1C1810 100%)",
          borderRadius:18, padding:"18px 28px",
          display:"flex", alignItems:"center",
          border:`1px solid rgba(197,160,89,0.25)`,
          boxShadow:`0 8px 30px rgba(0,0,0,0.18), 0 0 0 1px rgba(197,160,89,0.1)`,
          position:"relative", overflow:"hidden",
        }}>
          {/* Subtle glow overlay */}
          <div style={{
            position:"absolute", top:-60, right:"50%", transform:"translateX(50%)",
            width:300, height:120, borderRadius:"50%",
            background:`radial-gradient(ellipse at center, rgba(197,160,89,0.08) 0%, transparent 70%)`,
            pointerEvents:"none",
          }}/>
          {[
            { label:"إجمالي قيمة العقود النشطة", value:`${formatSAR(totalSAR)} ر.س`, icon:"💰" },
            { label:"العقود النشطة في المسار",    value:`${cActive} عقد`,              icon:"⚡" },
            { label:"نسبة الإنجاز الكلية",        value:`${completePct}%`,             icon:"📈" },
          ].map((item, i, arr) => (
            <div key={i} style={{
              flex:1, textAlign:"center", position:"relative",
              borderLeft: i < arr.length - 1 ? "1px solid rgba(197,160,89,0.2)" : "none",
            }}>
              <div style={{ fontSize:"0.64rem", color:"rgba(226,194,117,0.65)", marginBottom:5, letterSpacing:"0.04em" }}>
                {item.icon} {item.label}
              </div>
              <div style={{
                fontSize:"1.2rem", fontWeight:900, letterSpacing:"-0.02em",
                background:`linear-gradient(135deg, ${GOLD_END}, ${GOLD})`,
                WebkitBackgroundClip:"text",
                WebkitTextFillColor:"transparent",
                backgroundClip:"text",
              }}>{item.value}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
