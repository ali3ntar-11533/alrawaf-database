import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { STAGES, ROLES } from "./types";
import type { Contract } from "./types";
import StageSlideOver from "./StageSlideOver";
import logoImg from "@assets/logo_1776506524686.jpg";

// ── Design tokens ─────────────────────────────────────────────────────
const GOLD      = "#C5A059";
const GOLD2     = "#a88540";
const GOLD_END  = "#E2C275";
const GOLD_GLOW = "rgba(197,160,89,0.45)";
const GOLD_BG   = "rgba(197,160,89,0.07)";
const GOLD_BOR  = "rgba(197,160,89,0.22)";
const CREAM     = "#FBF9F4";
const GREEN     = "#22c55e";
const GREEN_D   = "#15803d";
const RED       = "#ef4444";
const RED_D     = "#b91c1c";
const AMBER     = "#f59e0b";
const BLUE      = "#3b82f6";
const BLUE_D    = "#1d4ed8";

const LEVEL_COLORS = [BLUE, "#8B6914", GOLD, "#7c3aed"];

const WORKFLOW_LEVELS = [
  { label: "إدارة المشروع",           icon: "🏗️", stages: [1, 2, 3]     },
  { label: "التنفيذ الفني والتعاقدي",  icon: "⚙️", stages: [4, 5, 6, 7] },
  { label: "الاعتمادات العليا",        icon: "🏛️", stages: [8, 9]        },
  { label: "مسؤول التوقيعات",          icon: "📜", stages: [10, 11]      },
];

// ── Helpers ──────────────────────────────────────────────────────────
function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function formatSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م`;
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
  const [activeTab,    setActiveTab]    = useState<MetricTab>("all");
  const [slideOverStage, setSlideOverStage] = useState<number | null>(null);

  // ── Aggregates ──────────────────────────────────────────────────
  const total     = contracts.length;
  const cActive   = contracts.filter(c => c.status === "active" && !c.rejectionReason).length;
  const cDone     = contracts.filter(c => c.status === "completed").length;
  const cRejected = contracts.filter(c => !!c.rejectionReason && c.status !== "completed").length;
  const totalSAR  = contracts.filter(c => c.status === "active").reduce((s, c) => s + (c.value || 0), 0);
  const completePct = total > 0 ? Math.round((cDone / total) * 100) : 0;

  // ── Filtered set ────────────────────────────────────────────────
  const filtered = (() => {
    if (activeTab === "active")    return contracts.filter(c => c.status === "active" && !c.rejectionReason);
    if (activeTab === "completed") return contracts.filter(c => c.status === "completed");
    if (activeTab === "rejected")  return contracts.filter(c => !!c.rejectionReason && c.status !== "completed");
    return contracts;
  })();

  const stageCounts  = (s: number) => filtered.filter(c => c.currentStage === s && c.status !== "completed");
  const myRoleInfo   = ROLES.find(r => r.name === role);
  const isMyStage    = (s: number) => myRoleInfo?.stage.includes(s) ?? false;

  // ── Slide-over contracts (all active, not filtered) ──────────
  const slideOverContracts = slideOverStage !== null
    ? contracts.filter(c => c.currentStage === slideOverStage && c.status !== "completed")
    : [];

  // ── Analytics data ───────────────────────────────────────────
  // Bottleneck: active contracts per stage
  const bottleneckData = STAGES.map((stage, i) => ({
    name: stage.label.length > 8 ? stage.label.slice(0, 8) + "…" : stage.label,
    fullName: stage.label,
    stageNum: i + 1,
    icon: stage.icon,
    count: contracts.filter(c => c.currentStage === i + 1 && c.status === "active").length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

  const maxBottleneck = Math.max(...bottleneckData.map(d => d.count), 1);

  // Weekly completion: contracts completed within last 7 days (using updatedAt as proxy)
  const completedThisWeek = contracts.filter(c =>
    c.status === "completed" && daysSince(c.updatedAt) <= 7
  ).length;
  const completedLastWeek = contracts.filter(c =>
    c.status === "completed" && daysSince(c.updatedAt) > 7 && daysSince(c.updatedAt) <= 14
  ).length;

  // Urgency distribution
  const urgentContracts = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warnContracts   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;
  const safeContracts   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) < 3).length;

  // Pie data
  const pieData = [
    { name: "نشطة",   value: cActive,   color: GOLD  },
    { name: "مكتملة", value: cDone,     color: GREEN },
    { name: "مرفوضة", value: cRejected, color: RED   },
  ].filter(d => d.value > 0);

  // Radial bar for completion %
  const radialData = [{ value: completePct, fill: GOLD }];

  // ── Metric tiles ────────────────────────────────────────────
  const TILES = [
    { key: "all" as MetricTab,       label: "إجمالي العقود",   sub: "جميع الحالات",      count: total,     icon: "📁", accent: BLUE,  accentD: BLUE_D },
    { key: "active" as MetricTab,    label: "الطلبات النشطة",   sub: "قيد التنفيذ الآن",  count: cActive,   icon: "⚡", accent: GOLD,  accentD: GOLD2  },
    { key: "completed" as MetricTab, label: "العقود المكتملة",  sub: "أُنجزت بنجاح",     count: cDone,     icon: "✅", accent: GREEN, accentD: GREEN_D },
    { key: "rejected" as MetricTab,  label: "العقود المرفوضة",  sub: "أُعيدت أو رُفضت",  count: cRejected, icon: "↩", accent: RED,   accentD: RED_D   },
  ];

  return (
    <div dir="rtl" style={{
      background: "linear-gradient(160deg, #F9F7F4 0%, #F3EDE0 40%, #F9F7F4 100%)",
      minHeight: "100%",
      fontFamily: "'Cairo','Tajawal',sans-serif",
    }}>
      <style>{`
        @keyframes glow-gold {
          0%,100% { box-shadow: 0 0 0 0 ${GOLD_GLOW}, 0 2px 8px rgba(197,160,89,0.25); }
          50%      { box-shadow: 0 0 16px 5px ${GOLD_GLOW}, 0 4px 14px rgba(197,160,89,0.35); }
        }
        @keyframes fade-up {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .tile-btn { transition: transform 0.18s ease, box-shadow 0.18s ease; cursor: pointer; }
        .tile-btn:hover { transform: translateY(-4px) !important; }
        .chip-btn { transition: all 0.16s ease; cursor: pointer; }
        .chip-btn:hover { transform: translateY(-3px) scale(1.02); }
        .glass-row {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 20px;
          box-shadow: 0 2px 20px rgba(0,0,0,0.055), 0 1px 4px rgba(0,0,0,0.04);
        }
        .glass-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 20px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.055);
          overflow: hidden;
        }
      `}</style>

      {/* ═══ SOVEREIGN HEADER ══════════════════════════════════════════ */}
      <div style={{
        background: `linear-gradient(120deg, #1C1810 0%, #2E2112 50%, #1C1810 100%)`,
        borderBottom: `2px solid rgba(197,160,89,0.35)`,
        padding: "18px 30px 16px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Ambient glow orbs */}
        <div style={{ position:"absolute", top:-80, left:-80, width:260, height:260, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(197,160,89,0.09) 0%, transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-60, right:60, width:200, height:200, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(226,194,117,0.06) 0%, transparent 70%)", pointerEvents:"none" }}/>

        <div style={{ position:"relative", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          {/* Logo + Branding */}
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{
              width:54, height:54, borderRadius:16, overflow:"hidden", flexShrink:0,
              boxShadow:`0 0 0 2px rgba(197,160,89,0.5), 0 6px 24px rgba(0,0,0,0.4)`,
              animation:"glow-gold 3.5s ease-in-out infinite",
            }}>
              <img
                src={logoImg}
                alt="شركة الرواف"
                style={{ width:"100%", height:"100%", objectFit:"cover" }}
              />
            </div>
            <div>
              <div style={{ fontSize:"0.52rem", fontWeight:800, letterSpacing:"0.14em", color:"rgba(197,160,89,0.7)", marginBottom:2 }}>
                ALRAWAF CONTRACTING COMPANY
              </div>
              <div style={{
                fontSize:"1.35rem", fontWeight:900, letterSpacing:"-0.02em",
                background:`linear-gradient(135deg, ${GOLD_END} 0%, ${GOLD} 50%, ${GOLD2} 100%)`,
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                backgroundClip:"text",
              }}>
                لوحة القيادة التنفيذية
              </div>
              <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.5)", marginTop:2 }}>
                {role
                  ? `${actorName || role} · ${pendingContracts.length} عقد بانتظار قرارك`
                  : "نظام إدارة العقود — اختر دورك من القائمة"}
              </div>
            </div>
          </div>

          {/* Completion ring — right */}
          <div style={{ marginRight:"auto", display:"flex", alignItems:"center", gap:12 }}>
            {/* Urgency pill */}
            {urgentContracts > 0 && (
              <div style={{
                background:"rgba(239,68,68,0.18)", border:"1px solid rgba(239,68,68,0.3)",
                borderRadius:20, padding:"6px 14px",
                fontSize:"0.65rem", fontWeight:800, color:"#FCA5A5",
                display:"flex", alignItems:"center", gap:5,
                animation:"fade-up 0.5s ease",
              }}>
                ⚠️ {urgentContracts} عقد عاجل
              </div>
            )}

            {/* Donut completion */}
            <div style={{
              display:"flex", alignItems:"center", gap:10,
              background:"rgba(255,255,255,0.07)", border:"1px solid rgba(197,160,89,0.2)",
              borderRadius:14, padding:"10px 18px",
              backdropFilter:"blur(10px)",
            }}>
              <div style={{ width:42, height:42, flexShrink:0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="60%" outerRadius="100%"
                    startAngle={90} endAngle={90 - 360 * completePct / 100}
                    data={radialData}
                  >
                    <RadialBar dataKey="value" cornerRadius={5} fill={GOLD} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div style={{ fontSize:"0.68rem", fontWeight:800, color:"rgba(255,255,255,0.9)" }}>نسبة الإنجاز</div>
                <div style={{ fontSize:"1rem", fontWeight:900, color:GOLD_END }}>{completePct}%</div>
                <div style={{ fontSize:"0.55rem", color:"rgba(255,255,255,0.4)" }}>{cDone} من {total} عقد</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 26px", display:"flex", flexDirection:"column", gap:18 }}>

        {/* ═══ METRIC TILES ══════════════════════════════════════════ */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:13 }}>
          {TILES.map(tile => {
            const on = activeTab === tile.key;
            return (
              <div
                key={tile.key}
                className="tile-btn"
                onClick={() => setActiveTab(tile.key)}
                style={{
                  borderRadius:18, padding:"20px 22px",
                  background: on
                    ? `linear-gradient(135deg, ${tile.accent}15 0%, ${tile.accent}08 100%)`
                    : "#fff",
                  border: on ? `2px solid ${tile.accent}35` : "1px solid #EBEBEB",
                  boxShadow: on ? `0 6px 28px ${tile.accent}28` : "0 1px 8px rgba(0,0,0,0.04)",
                  position:"relative", overflow:"hidden",
                  transform: on ? "translateY(-3px)" : "none",
                }}
              >
                {on && <div style={{ position:"absolute", top:0, right:0, left:0, height:3, background:`linear-gradient(90deg, ${tile.accent}, ${tile.accentD})`, borderRadius:"18px 18px 0 0" }}/>}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div style={{
                    width:42, height:42, borderRadius:12,
                    background: on ? `${tile.accent}18` : "#F5F5F5",
                    border: on ? `1.5px solid ${tile.accent}30` : "1px solid #EBEBEB",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"1.1rem",
                    boxShadow: on ? `0 3px 12px ${tile.accent}25` : "none",
                  }}>{tile.icon}</div>
                  {on && <span style={{ fontSize:"0.52rem", fontWeight:800, color:tile.accent, background:`${tile.accent}12`, border:`1px solid ${tile.accent}20`, borderRadius:20, padding:"3px 9px" }}>مفعّل</span>}
                </div>
                <div style={{ fontSize:"2.1rem", fontWeight:900, lineHeight:1, color: on ? tile.accentD : "#1A1A1A", letterSpacing:"-0.03em" }}>
                  {tile.count}
                </div>
                <div style={{ fontSize:"0.72rem", fontWeight:700, color: on ? tile.accentD : "#555", marginTop:5 }}>{tile.label}</div>
                <div style={{ fontSize:"0.6rem", color: on ? `${tile.accent}CC` : "#BBB", marginTop:2 }}>{tile.sub}</div>
              </div>
            );
          })}
        </div>

        {/* ═══ WORKFLOW HUB ══════════════════════════════════════════ */}
        <div style={{
          background:"rgba(255,255,255,0.65)",
          backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
          borderRadius:24, border:"1px solid rgba(255,255,255,0.82)",
          boxShadow:"0 4px 30px rgba(0,0,0,0.065), 0 1px 4px rgba(0,0,0,0.04)",
          overflow:"hidden",
        }}>
          {/* Hub header */}
          <div style={{
            padding:"16px 24px",
            background:`linear-gradient(120deg, ${CREAM} 0%, #EEE2CA 100%)`,
            borderBottom:`2px solid ${GOLD_BOR}`,
            display:"flex", alignItems:"center", gap:12,
          }}>
            <div style={{
              width:38, height:38, borderRadius:12, flexShrink:0,
              background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem",
              boxShadow:`0 4px 14px ${GOLD_GLOW}`,
            }}>🗺️</div>
            <div>
              <div style={{ fontSize:"0.9rem", fontWeight:900, color:"#1A1108", letterSpacing:"-0.01em" }}>خريطة دورة حياة العقد</div>
              <div style={{ fontSize:"0.62rem", color:"#9b8060", marginTop:1 }}>اضغط على أي مرحلة لفتح لوحة عقودها المنبثقة</div>
            </div>
            {myRoleInfo && (
              <div style={{
                marginRight:"auto", background:`${GOLD_BG}`, border:`1px solid ${GOLD_BOR}`,
                borderRadius:12, padding:"6px 14px",
                fontSize:"0.66rem", fontWeight:800, color:"#7A5C10",
                display:"flex", alignItems:"center", gap:6,
              }}>
                {myRoleInfo.icon} مرحلتك: {myRoleInfo.stage.map(s => `م${s}`).join("، ")}
              </div>
            )}
          </div>

          {/* Level rows */}
          <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
            {WORKFLOW_LEVELS.map((level, lvlIdx) => {
              const accent   = LEVEL_COLORS[lvlIdx];
              const levelTotal = level.stages.reduce((sum, s) => sum + stageCounts(s).length, 0);
              // Find bottleneck stage in this level
              const levelBottleneck = level.stages.reduce((max, s) =>
                stageCounts(s).length > stageCounts(max).length ? s : max
              , level.stages[0]);
              const isLevelBottleneck = levelTotal > 0 && stageCounts(levelBottleneck).length === maxBottleneck && maxBottleneck > 1;

              return (
                <div key={lvlIdx} className="glass-row" style={{ overflow:"visible" }}>
                  {/* Row header */}
                  <div style={{
                    display:"flex", alignItems:"center", gap:10, padding:"11px 18px 10px",
                    background:`linear-gradient(90deg, ${accent}10 0%, transparent 100%)`,
                    borderBottom:`1px solid ${accent}15`,
                  }}>
                    <div style={{ width:4, height:36, borderRadius:3, flexShrink:0, background:`linear-gradient(180deg, ${accent}, ${accent}55)`, boxShadow:`0 0 8px ${accent}40` }}/>
                    <div>
                      <div style={{ fontSize:"0.58rem", fontWeight:900, color:accent, letterSpacing:"0.06em" }}>{level.icon} المستوى {lvlIdx + 1}</div>
                      <div style={{ fontSize:"0.8rem", fontWeight:800, color:"#1A1A1A", letterSpacing:"-0.01em" }}>{level.label}</div>
                    </div>
                    <div style={{ marginRight:"auto", display:"flex", gap:7, alignItems:"center" }}>
                      {levelTotal > 0 && (
                        <div style={{
                          background:`${accent}18`, border:`1px solid ${accent}28`,
                          borderRadius:20, padding:"3px 12px",
                          fontSize:"0.62rem", fontWeight:800, color:accent,
                        }}>{levelTotal} عقد</div>
                      )}
                      {isLevelBottleneck && (
                        <div style={{
                          background:`${RED}12`, border:`1px solid ${RED}22`,
                          borderRadius:20, padding:"3px 12px",
                          fontSize:"0.6rem", fontWeight:800, color:RED,
                        }}>🔴 عنق زجاجة</div>
                      )}
                    </div>
                  </div>

                  {/* Stage chips */}
                  <div style={{ display:"flex", gap:10, padding:"12px 18px 14px", flexWrap:"wrap" }}>
                    {level.stages.map(stageNum => {
                      const stage      = STAGES[stageNum - 1];
                      const count      = stageCounts(stageNum).length;
                      const isMine     = isMyStage(stageNum);
                      const hasC       = count > 0;
                      const isBottle   = bottleneckData[0]?.stageNum === stageNum && count > 1;
                      // Urgency: any waiting > 7 days?
                      const hasUrgent  = contracts.some(c => c.currentStage === stageNum && c.status === "active" && daysSince(c.updatedAt) >= 7);
                      const hasWarn    = !hasUrgent && contracts.some(c => c.currentStage === stageNum && c.status === "active" && daysSince(c.updatedAt) >= 3);

                      return (
                        <div
                          key={stageNum}
                          className="chip-btn"
                          onClick={() => setSlideOverStage(stageNum)}
                          style={{
                            position:"relative", flex:"1 1 130px", minWidth:130,
                            display:"flex", alignItems:"center", gap:10,
                            padding:"12px 16px", borderRadius:16,
                            background: isMine
                              ? `linear-gradient(135deg, ${GOLD}18, rgba(226,194,117,0.08))`
                              : hasC ? "rgba(255,255,255,0.9)" : "rgba(248,248,248,0.75)",
                            border: isMine
                              ? `1.5px solid ${GOLD_BOR}`
                              : hasC ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(0,0,0,0.05)",
                            boxShadow: isMine
                              ? `0 3px 14px rgba(197,160,89,0.2)`
                              : hasC ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                            animation: isMine && hasC ? "glow-gold 3.5s ease-in-out infinite" : "none",
                          }}
                        >
                          {/* Stage icon */}
                          <div style={{
                            width:40, height:40, borderRadius:12, flexShrink:0,
                            background: isMine
                              ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`
                              : hasC ? `${accent}18` : "#F0F0F0",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:"1.05rem",
                            boxShadow: isMine ? `0 3px 10px ${GOLD_GLOW}` : "none",
                          }}>{stage?.icon ?? "📄"}</div>

                          {/* Labels */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:"0.6rem", fontWeight:900, color: isMine ? "#8B6914" : hasC ? "#2a2a2a" : "#AAAAAA" }}>م{stageNum}</div>
                            <div style={{ fontSize:"0.58rem", color: hasC ? "#555" : "#C0C0C0", lineHeight:1.35, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {stage?.label}
                            </div>
                            {isMine && <div style={{ fontSize:"0.48rem", color:GOLD2, fontWeight:900, marginTop:3 }}>⭐ مرحلتك</div>}
                          </div>

                          {/* Glowing badge */}
                          {hasC && (
                            <div style={{
                              position:"absolute", top:-9, left:-9,
                              minWidth:26, height:26, borderRadius:"50%",
                              background: hasUrgent
                                ? `linear-gradient(135deg, ${RED}, #dc2626)`
                                : hasWarn
                                  ? `linear-gradient(135deg, ${AMBER}, #d97706)`
                                  : isMine
                                    ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`
                                    : `linear-gradient(135deg, ${accent}, ${accent}CC)`,
                              color:"#fff",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:"0.62rem", fontWeight:900,
                              boxShadow: hasUrgent
                                ? `0 0 12px rgba(239,68,68,0.6), 0 2px 6px rgba(239,68,68,0.4)`
                                : `0 0 10px ${isMine ? GOLD_GLOW : `${accent}55`}`,
                            }}>{count}</div>
                          )}

                          {/* Open hint */}
                          <div style={{
                            position:"absolute", bottom:5, left:"50%", transform:"translateX(50%)",
                            fontSize:"0.45rem", color: isMine ? GOLD2 : "#CCC",
                            fontWeight:800, letterSpacing:"0.04em",
                          }}>اضغط للفتح</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ ADVANCED ANALYTICS ════════════════════════════════════ */}
        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr", gap:14 }}>

          {/* Bottleneck bar chart */}
          <div className="glass-card">
            <div style={{ padding:"13px 18px 12px", borderBottom:`1px solid rgba(197,160,89,0.12)`, background:`linear-gradient(90deg, ${CREAM}, transparent)`, display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", boxShadow:`0 2px 10px ${GOLD_GLOW}` }}>🚥</div>
              <div>
                <div style={{ fontSize:"0.82rem", fontWeight:800, color:"#1A1A1A" }}>نقاط الاختناق</div>
                <div style={{ fontSize:"0.58rem", color:"#9b8060" }}>المراحل الأكثر ضغطاً حالياً</div>
              </div>
            </div>
            <div style={{ padding:"12px 16px" }}>
              {bottleneckData.length === 0 ? (
                <div style={{ textAlign:"center", padding:"24px 0", color:"#CCC", fontSize:"0.75rem" }}>لا عقود نشطة</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {bottleneckData.slice(0, 6).map((d, i) => {
                    const pct = Math.round((d.count / maxBottleneck) * 100);
                    const isTop = i === 0;
                    const barColor = isTop ? RED : i === 1 ? AMBER : GOLD;
                    return (
                      <div
                        key={d.stageNum}
                        style={{ cursor:"pointer" }}
                        onClick={() => setSlideOverStage(d.stageNum)}
                      >
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:"0.62rem", fontWeight:700, color: isTop ? RED : "#555" }}>
                            {d.icon} {d.fullName}
                          </span>
                          <span style={{ fontSize:"0.62rem", fontWeight:900, color:barColor }}>{d.count}</span>
                        </div>
                        <div style={{ height:7, background:"#F0F0F0", borderRadius:4, overflow:"hidden" }}>
                          <div style={{
                            height:"100%", width:`${pct}%`, borderRadius:4,
                            background:`linear-gradient(90deg, ${barColor}, ${barColor}80)`,
                            boxShadow: isTop ? `0 0 8px ${barColor}60` : "none",
                            transition:"width 0.8s ease",
                          }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Status donut */}
          <div className="glass-card">
            <div style={{ padding:"13px 18px 12px", borderBottom:`1px solid rgba(197,160,89,0.12)`, background:`linear-gradient(90deg, ${CREAM}, transparent)`, display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", boxShadow:`0 2px 10px ${GOLD_GLOW}` }}>🍩</div>
              <div style={{ fontSize:"0.82rem", fontWeight:800, color:"#1A1A1A" }}>توزيع الحالات</div>
            </div>
            <div style={{ padding:"10px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:100, height:100, flexShrink:0 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={46} paddingAngle={4} dataKey="value">
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none"/>)}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => [`${v} عقد`, ""]} contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.72rem", direction:"rtl", border:`1px solid ${GOLD_BOR}`, borderRadius:10 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#CCC", fontSize:"0.75rem" }}>لا بيانات</div>}
              </div>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { label:"نشطة",   count:cActive,   color:GOLD,  pct: total ? Math.round(cActive/total*100) : 0 },
                  { label:"مكتملة", count:cDone,     color:GREEN, pct: total ? Math.round(cDone/total*100) : 0 },
                  { label:"مرفوضة", count:cRejected, color:RED,   pct: total ? Math.round(cRejected/total*100) : 0 },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ fontSize:"0.6rem", fontWeight:700, color:"#555" }}>{item.label}</span>
                      <span style={{ fontSize:"0.6rem", fontWeight:900, color:item.color }}>{item.count}</span>
                    </div>
                    <div style={{ height:5, background:"#F0F0F0", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${item.pct}%`, borderRadius:3, background:`linear-gradient(90deg, ${item.color}, ${item.color}80)`, transition:"width 0.7s ease" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly rate + urgency */}
          <div className="glass-card">
            <div style={{ padding:"13px 18px 12px", borderBottom:`1px solid rgba(197,160,89,0.12)`, background:`linear-gradient(90deg, ${CREAM}, transparent)`, display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", boxShadow:`0 2px 10px ${GOLD_GLOW}` }}>📈</div>
              <div style={{ fontSize:"0.82rem", fontWeight:800, color:"#1A1A1A" }}>الأداء الأسبوعي</div>
            </div>
            <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:12 }}>
              {/* Weekly bar */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:"0.65rem", fontWeight:700, color:"#555" }}>الأسبوع الحالي</span>
                  <span style={{ fontSize:"0.72rem", fontWeight:900, color:GREEN }}>{completedThisWeek}</span>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height={50}>
                    <BarChart data={[
                      { name:"أسبوع سابق", value: completedLastWeek, fill: `${GOLD}50` },
                      { name:"هذا الأسبوع", value: completedThisWeek, fill: GOLD },
                    ]} margin={{ top:2, right:2, left:-20, bottom:0 }}>
                      <defs>
                        <linearGradient id="wkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={GOLD_END}/>
                          <stop offset="100%" stopColor={GOLD2}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize:8, fill:"#AAA", fontFamily:"'Cairo',sans-serif" }} axisLine={false} tickLine={false}/>
                      <Bar dataKey="value" radius={[4,4,0,0]} fill="url(#wkGrad)" maxBarSize={36}/>
                      <Tooltip formatter={(v: unknown) => [`${v} عقد`, ""]} contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.72rem", direction:"rtl", border:`1px solid ${GOLD_BOR}`, borderRadius:8 }}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Urgency summary */}
              <div style={{ borderTop:`1px solid #F0F0F0`, paddingTop:10, display:"flex", flexDirection:"column", gap:5 }}>
                <div style={{ fontSize:"0.6rem", fontWeight:800, color:"#888", marginBottom:2 }}>🚦 توزيع الأولوية</div>
                {[
                  { label:`عاجل (≥٧ أيام)`,   count:urgentContracts, color:RED   },
                  { label:`تحذير (٣-٧ أيام)`,  count:warnContracts,   color:AMBER },
                  { label:`طبيعي (< ٣ أيام)`,  count:safeContracts,   color:GREEN },
                ].map((item, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"0.58rem", color:"#666" }}>{item.label}</span>
                    <span style={{
                      minWidth:22, height:20, borderRadius:10,
                      background:`${item.color}18`, color:item.color,
                      fontSize:"0.6rem", fontWeight:900,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      padding:"0 7px",
                    }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ VALUE STRIP ═══════════════════════════════════════════ */}
        <div style={{
          background:"linear-gradient(135deg, #1C1810 0%, #2A2010 50%, #1C1810 100%)",
          borderRadius:18, padding:"16px 28px",
          display:"flex", alignItems:"center",
          border:`1px solid rgba(197,160,89,0.22)`,
          boxShadow:`0 8px 30px rgba(0,0,0,0.15), inset 0 1px 0 rgba(197,160,89,0.12)`,
          position:"relative", overflow:"hidden",
          gap:0,
        }}>
          <div style={{ position:"absolute", top:-50, right:"50%", transform:"translateX(50%)", width:280, height:100, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(197,160,89,0.07) 0%, transparent 70%)", pointerEvents:"none" }}/>
          {[
            { label:"إجمالي قيمة العقود النشطة", value:`${formatSAR(totalSAR)} ر.س`, icon:"💰" },
            { label:"العقود النشطة في المسار",    value:`${cActive} عقد`,              icon:"⚡" },
            { label:"عقود مكتملة هذا الأسبوع",   value:`${completedThisWeek} عقد`,    icon:"📊" },
            { label:"نسبة الإنجاز الكلية",        value:`${completePct}%`,             icon:"🎯" },
          ].map((item, i, arr) => (
            <div key={i} style={{ flex:1, textAlign:"center", position:"relative", borderLeft: i < arr.length - 1 ? "1px solid rgba(197,160,89,0.18)" : "none" }}>
              <div style={{ fontSize:"0.6rem", color:"rgba(226,194,117,0.6)", marginBottom:4, letterSpacing:"0.04em" }}>{item.icon} {item.label}</div>
              <div style={{
                fontSize:"1.1rem", fontWeight:900, letterSpacing:"-0.02em",
                background:`linear-gradient(135deg, ${GOLD_END}, ${GOLD})`,
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              }}>{item.value}</div>
            </div>
          ))}
        </div>

      </div>

      {/* ═══ STAGE SLIDE-OVER ══════════════════════════════════════ */}
      {slideOverStage !== null && (
        <StageSlideOver
          stageNum={slideOverStage}
          contracts={slideOverContracts}
          role={role}
          onClose={() => setSlideOverStage(null)}
          onOpenContract={(id) => { setSlideOverStage(null); onOpenContract(id); }}
        />
      )}
    </div>
  );
}
