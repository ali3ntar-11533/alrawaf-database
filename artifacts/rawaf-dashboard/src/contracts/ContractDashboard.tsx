import { useState } from "react";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { STAGES, ROLES } from "./types";
import type { Contract } from "./types";
import logoImg from "@assets/logo_1776506524686.jpg";

// ── Design tokens ─────────────────────────────────────────────────────
const GOLD      = "#C5A059";
const GOLD2     = "#a88540";
const GOLD_END  = "#E2C275";
const GOLD_GLOW = "rgba(197,160,89,0.45)";
const GOLD_BOR  = "rgba(197,160,89,0.22)";
const GREEN     = "#22c55e";
const GREEN_D   = "#15803d";
const RED       = "#ef4444";
const RED_D     = "#b91c1c";
const AMBER     = "#f59e0b";
const BLUE      = "#3b82f6";
const BLUE_D    = "#1d4ed8";

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function formatSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ألف`;
  return `${n}`;
}

interface Props {
  role: string;
  actorName: string;
  contracts: Contract[];
  pendingContracts: Contract[];
  onOpenContract: (id: number) => void;
  onOpenStage: (stageNum: number) => void;
}

type MetricTab = "all" | "active" | "completed" | "rejected";

// ── Individual Stage Row ──────────────────────────────────────────────
function StageRow({
  stageNum,
  contracts,
  totalActive,
  isMine,
  pulseActive,
  onEnter,
}: {
  stageNum: number;
  contracts: Contract[];
  totalActive: number;
  isMine: boolean;
  pulseActive: boolean;
  onEnter: () => void;
}) {
  const stage = STAGES[stageNum - 1];
  const count = contracts.filter(c => c.currentStage === stageNum && c.status === "active").length;
  const pct   = totalActive > 0 ? Math.min(100, Math.round((count / totalActive) * 100)) : 0;

  const urgent = contracts.filter(c => c.currentStage === stageNum && c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warn   = contracts.filter(c => c.currentStage === stageNum && c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;

  const badgeColor = urgent > 0 ? RED : warn > 0 ? AMBER : isMine ? GOLD : count > 0 ? "#2563EB" : "#D0D0D0";
  const badgeGlow  = urgent > 0 ? "rgba(239,68,68,0.6)" : warn > 0 ? "rgba(245,158,11,0.6)" : isMine ? GOLD_GLOW : "rgba(37,99,235,0.4)";
  const isEmpty    = count === 0;

  const shouldPulse = pulseActive && count > 0;

  return (
    <div
      className={shouldPulse ? "row-pulse" : ""}
      style={{
        display: "flex", alignItems: "center", gap: 0,
        background: "#FFFFFF",
        borderRadius: 16,
        border: isMine ? `1.5px solid ${GOLD_BOR}` : "1px solid #EBEBEB",
        boxShadow: isMine
          ? `0 4px 20px rgba(197,160,89,0.12), 0 1px 4px rgba(0,0,0,0.04)`
          : "0 2px 10px rgba(0,0,0,0.04)",
        overflow: "hidden",
        borderRight: `4px solid ${isEmpty ? "#F0F0F0" : badgeColor}`,
        opacity: isEmpty ? 0.65 : 1,
        transition: "opacity 0.2s, box-shadow 0.2s",
        minHeight: 70,
      }}
    >
      {/* LEFT: Stage icon + number + name + role */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", flex: "0 0 auto", minWidth: 280 }}>
        {/* Icon */}
        <div style={{
          width: 46, height: 46, borderRadius: 13, flexShrink: 0,
          background: isMine
            ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`
            : isEmpty ? "#F5F5F5" : `${badgeColor}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.15rem",
          boxShadow: isMine ? `0 3px 14px ${GOLD_GLOW}` : isEmpty ? "none" : `0 2px 10px ${badgeColor}28`,
        }}>{stage?.icon ?? "📄"}</div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: "0.55rem", fontWeight: 900, color: isMine ? GOLD2 : "#BBBBBB", letterSpacing: "0.06em" }}>
              م{stageNum}
            </span>
            {isMine && (
              <span style={{ fontSize: "0.5rem", background: `rgba(197,160,89,0.12)`, border: `1px solid ${GOLD_BOR}`, borderRadius: 8, padding: "1px 6px", color: GOLD2, fontWeight: 900 }}>
                ⭐ مرحلتك
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 800, color: isEmpty ? "#CCCCCC" : "#1A1A1A", marginTop: 2, lineHeight: 1.2 }}>
            {stage?.label}
          </div>
          <div style={{ fontSize: "0.6rem", color: "#BBBBBB", marginTop: 2 }}>
            👤 {stage?.role}
          </div>
        </div>
      </div>

      {/* SEPARATOR */}
      <div style={{ width: 1, height: 44, background: "#F0F0F0", flexShrink: 0 }}/>

      {/* MIDDLE: Counter badge + progress bar */}
      <div style={{ flex: 1, padding: "14px 24px", display: "flex", alignItems: "center", gap: 18 }}>
        {/* Glowing count */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          background: isEmpty
            ? "#F5F5F5"
            : `linear-gradient(135deg, ${badgeColor}, ${badgeColor}CC)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: count >= 100 ? "0.9rem" : count >= 10 ? "1.1rem" : "1.35rem",
          fontWeight: 900, color: isEmpty ? "#CCCCCC" : "#fff",
          boxShadow: isEmpty ? "none" : `0 0 0 4px ${badgeColor}18, 0 0 20px ${badgeGlow}`,
          transition: "box-shadow 0.3s",
          letterSpacing: "-0.02em",
        }}>{count}</div>

        {/* Progress + urgency info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: "0.6rem", color: "#AAAAAA" }}>
              {isEmpty ? "لا طلبات حالياً" : `${count} طلب · ${pct}% من الإجمالي`}
            </span>
            <div style={{ display: "flex", gap: 5 }}>
              {urgent > 0 && (
                <span style={{ fontSize: "0.55rem", fontWeight: 800, color: RED, background: `${RED}10`, border: `1px solid ${RED}20`, borderRadius: 8, padding: "2px 7px" }}>
                  ⚠️ {urgent} عاجل
                </span>
              )}
              {warn > 0 && (
                <span style={{ fontSize: "0.55rem", fontWeight: 800, color: AMBER, background: `${AMBER}10`, border: `1px solid ${AMBER}20`, borderRadius: 8, padding: "2px 7px" }}>
                  🔔 {warn} تنبيه
                </span>
              )}
            </div>
          </div>
          <div style={{ height: 8, background: "#F0F0F0", borderRadius: 6, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 6,
              background: isEmpty
                ? "transparent"
                : isMine
                  ? `linear-gradient(90deg, ${GOLD}, ${GOLD_END})`
                  : `linear-gradient(90deg, ${badgeColor}, ${badgeColor}80)`,
              boxShadow: pct > 0 && isMine ? `0 0 8px ${GOLD_GLOW}` : pct > 0 ? `0 0 6px ${badgeColor}50` : "none",
              transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
              minWidth: count > 0 ? 6 : 0,
            }}/>
          </div>
        </div>
      </div>

      {/* SEPARATOR */}
      <div style={{ width: 1, height: 44, background: "#F0F0F0", flexShrink: 0 }}/>

      {/* RIGHT: Enter button */}
      <div style={{ padding: "14px 22px", flexShrink: 0 }}>
        <button
          onClick={onEnter}
          disabled={isEmpty}
          style={{
            background: isEmpty
              ? "#F5F5F5"
              : isMine
                ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`
                : `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`,
            color: isEmpty ? "#CCCCCC" : "#fff",
            border: "none", borderRadius: 12,
            padding: "10px 22px",
            fontFamily: "'Cairo','Tajawal',sans-serif",
            fontSize: "0.78rem", fontWeight: 800,
            cursor: isEmpty ? "default" : "pointer",
            boxShadow: isEmpty ? "none" : `0 4px 18px ${GOLD_GLOW}`,
            whiteSpace: "nowrap",
            transition: "opacity 0.15s, transform 0.15s",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={e => { if (!isEmpty) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          {isEmpty ? "لا طلبات" : "دخول المرحلة ←"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════
export default function ContractDashboard({
  role, actorName, contracts, pendingContracts, onOpenContract, onOpenStage,
}: Props) {
  const [activeTab,  setActiveTab]  = useState<MetricTab>("all");
  const [pulseActive, setPulseActive] = useState(false);

  // ── Aggregates ──────────────────────────────────────────────────
  const total     = contracts.length;
  const cActive   = contracts.filter(c => c.status === "active" && !c.rejectionReason).length;
  const cDone     = contracts.filter(c => c.status === "completed").length;
  const cRejected = contracts.filter(c => !!c.rejectionReason && c.status !== "completed").length;
  const totalSAR  = contracts.filter(c => c.status === "active").reduce((s, c) => s + (c.value || 0), 0);
  const completePct = total > 0 ? Math.round((cDone / total) * 100) : 0;
  const totalActive = contracts.filter(c => c.status === "active").length;

  const urgentContracts = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warnContracts   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;
  const safeContracts   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) < 3).length;

  const myRoleInfo = ROLES.find(r => r.name === role);

  // ── Analytics ───────────────────────────────────────────────────
  const bottleneckData = STAGES.map((s, i) => ({
    name: s.label.length > 8 ? s.label.slice(0, 8) + "…" : s.label,
    fullName: s.label, icon: s.icon, stageNum: i + 1,
    count: contracts.filter(c => c.currentStage === i + 1 && c.status === "active").length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
  const maxBottleneck = Math.max(...bottleneckData.map(d => d.count), 1);

  const completedThisWeek = contracts.filter(c => c.status === "completed" && daysSince(c.updatedAt) <= 7).length;
  const completedLastWeek = contracts.filter(c => c.status === "completed" && daysSince(c.updatedAt) > 7 && daysSince(c.updatedAt) <= 14).length;

  const pieData = [
    { name: "نشطة",   value: cActive,   color: GOLD  },
    { name: "مكتملة", value: cDone,     color: GREEN },
    { name: "مرفوضة", value: cRejected, color: RED   },
  ].filter(d => d.value > 0);
  const radialData = [{ value: completePct, fill: GOLD }];

  const TILES = [
    { key: "all" as MetricTab,       label: "إجمالي العقود",   sub: "جميع الحالات",      count: total,     icon: "📁", accent: BLUE,  accentD: BLUE_D,  pulse: false  },
    { key: "active" as MetricTab,    label: "الطلبات النشطة",   sub: "قيد التنفيذ الآن",  count: cActive,   icon: "⚡", accent: GOLD,  accentD: GOLD2,   pulse: true   },
    { key: "completed" as MetricTab, label: "العقود المكتملة",  sub: "أُنجزت بنجاح",      count: cDone,     icon: "✅", accent: GREEN, accentD: GREEN_D, pulse: false  },
    { key: "rejected" as MetricTab,  label: "العقود المرفوضة",  sub: "أُعيدت أو رُفضت",   count: cRejected, icon: "↩", accent: RED,   accentD: RED_D,   pulse: false  },
  ];

  return (
    <div dir="rtl" style={{
      background: "#FFFFFF",
      minHeight: "100%",
      fontFamily: "'Cairo','Tajawal',sans-serif",
    }}>
      <style>{`
        @keyframes glow-gold {
          0%,100% { box-shadow: 0 0 0 3px #fff, 0 0 0 rgba(197,160,89,0); }
          50%      { box-shadow: 0 0 0 3px #fff, 0 0 20px 6px ${GOLD_GLOW}; }
        }
        @keyframes row-pulse-kf {
          0%,100% { box-shadow: 0 2px 10px rgba(0,0,0,0.04); }
          40%      { box-shadow: 0 0 0 2px ${GOLD_BOR}, 0 4px 22px rgba(197,160,89,0.25); }
        }
        @keyframes fade-up {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .tile-btn { transition: transform 0.18s ease, box-shadow 0.18s ease; cursor:pointer; }
        .tile-btn:hover { transform: translateY(-4px); }
        .row-pulse { animation: row-pulse-kf 1.1s ease 3; }
        .glass-card {
          background:#ffffff;
          border:1px solid #F0F0F0;
          border-radius:20px;
          overflow:hidden;
          box-shadow:0 2px 16px rgba(0,0,0,0.05);
        }
      `}</style>

      {/* ═══ SOVEREIGN HEADER ════════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(120deg, #1C1810 0%, #2E2112 50%, #1C1810 100%)",
        borderBottom: `2px solid ${GOLD_BOR}`,
        padding: "18px 30px 16px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position:"absolute", top:-80, left:-80, width:260, height:260, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(197,160,89,0.09) 0%, transparent 70%)", pointerEvents:"none" }}/>

        <div style={{ position:"relative", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{
              width:54, height:54, borderRadius:16, overflow:"hidden", flexShrink:0,
              boxShadow:`0 0 0 2px rgba(197,160,89,0.5), 0 6px 24px rgba(0,0,0,0.4)`,
              animation:"glow-gold 3.5s ease-in-out infinite",
            }}>
              <img src={logoImg} alt="شركة الرواف" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            </div>
            <div>
              <div style={{ fontSize:"0.52rem", fontWeight:800, letterSpacing:"0.14em", color:"rgba(197,160,89,0.7)", marginBottom:2 }}>
                ALRAWAF CONTRACTING COMPANY
              </div>
              <div style={{
                fontSize:"1.35rem", fontWeight:900, letterSpacing:"-0.02em",
                background:`linear-gradient(135deg, ${GOLD_END} 0%, ${GOLD} 50%, ${GOLD2} 100%)`,
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              }}>لوحة القيادة التنفيذية</div>
              <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.5)", marginTop:2 }}>
                {role ? `${actorName || role} · ${pendingContracts.length} عقد بانتظار قرارك` : "نظام إدارة العقود — اختر دورك من القائمة"}
              </div>
            </div>
          </div>

          <div style={{ marginRight:"auto", display:"flex", alignItems:"center", gap:12 }}>
            {urgentContracts > 0 && (
              <div style={{ background:"rgba(239,68,68,0.18)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:20, padding:"6px 14px", fontSize:"0.65rem", fontWeight:800, color:"#FCA5A5" }}>
                ⚠️ {urgentContracts} عقد عاجل
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(197,160,89,0.2)", borderRadius:14, padding:"10px 18px", backdropFilter:"blur(10px)" }}>
              <div style={{ width:42, height:42, flexShrink:0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" startAngle={90} endAngle={90 - 360 * completePct / 100} data={radialData}>
                    <RadialBar dataKey="value" cornerRadius={5} fill={GOLD}/>
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

      <div style={{ padding:"20px 26px", display:"flex", flexDirection:"column", gap:18, background:"#FFFFFF" }}>

        {/* ═══ METRIC TILES ════════════════════════════════════════ */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:13 }}>
          {TILES.map(tile => {
            const on = activeTab === tile.key;
            return (
              <div
                key={tile.key}
                className="tile-btn"
                onClick={() => {
                  setActiveTab(tile.key);
                  if (tile.pulse) {
                    setPulseActive(true);
                    setTimeout(() => setPulseActive(false), 3500);
                  }
                }}
                style={{
                  borderRadius:18, padding:"20px 22px",
                  background: on ? `linear-gradient(135deg, ${tile.accent}12 0%, ${tile.accent}06 100%)` : "#fff",
                  border: on ? `2px solid ${tile.accent}30` : "1px solid #EBEBEB",
                  boxShadow: on ? `0 6px 28px ${tile.accent}22` : "0 1px 8px rgba(0,0,0,0.04)",
                  position:"relative", overflow:"hidden",
                  transform: on ? "translateY(-3px)" : "none",
                }}
              >
                {on && <div style={{ position:"absolute", top:0, right:0, left:0, height:3, background:`linear-gradient(90deg, ${tile.accent}, ${tile.accentD})`, borderRadius:"18px 18px 0 0" }}/>}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div style={{
                    width:42, height:42, borderRadius:12,
                    background: on ? `${tile.accent}16` : "#F5F5F5",
                    border: on ? `1.5px solid ${tile.accent}28` : "1px solid #EBEBEB",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem",
                    boxShadow: on ? `0 3px 12px ${tile.accent}22` : "none",
                  }}>{tile.icon}</div>
                  {on && <span style={{ fontSize:"0.52rem", fontWeight:800, color:tile.accent, background:`${tile.accent}10`, border:`1px solid ${tile.accent}18`, borderRadius:20, padding:"3px 9px" }}>مفعّل</span>}
                  {tile.pulse && !on && (
                    <span style={{ fontSize:"0.5rem", color:GOLD2, background:`rgba(197,160,89,0.08)`, border:`1px solid ${GOLD_BOR}`, borderRadius:20, padding:"3px 8px", fontWeight:700 }}>
                      ✨ انقر لإضاءة الصفوف
                    </span>
                  )}
                </div>
                <div style={{ fontSize:"2.1rem", fontWeight:900, lineHeight:1, color: on ? tile.accentD : "#1A1A1A", letterSpacing:"-0.03em" }}>{tile.count}</div>
                <div style={{ fontSize:"0.72rem", fontWeight:700, color: on ? tile.accentD : "#555", marginTop:5 }}>{tile.label}</div>
                <div style={{ fontSize:"0.6rem", color: on ? `${tile.accent}CC` : "#BBB", marginTop:2 }}>{tile.sub}</div>
              </div>
            );
          })}
        </div>

        {/* ═══ WORKFLOW ROWS ═══════════════════════════════════════ */}
        <div style={{
          borderRadius:22, border:`1px solid ${GOLD_BOR}`,
          background:"#FAFAFA",
          boxShadow:"0 4px 24px rgba(0,0,0,0.04)",
          overflow:"hidden",
        }}>
          {/* Section header */}
          <div style={{
            background:`linear-gradient(90deg, #FBF9F4 0%, #F5EDD8 100%)`,
            borderBottom:`2px solid ${GOLD_BOR}`,
            padding:"15px 24px",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <div style={{
              width:38, height:38, borderRadius:12, flexShrink:0,
              background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem",
              boxShadow:`0 4px 14px ${GOLD_GLOW}`,
            }}>🗺️</div>
            <div>
              <div style={{ fontSize:"0.9rem", fontWeight:900, color:"#1A1108", letterSpacing:"-0.01em" }}>
                دورة حياة العقد — {STAGES.length} مرحلة متسلسلة
              </div>
              <div style={{ fontSize:"0.6rem", color:"#9b8060", marginTop:1 }}>
                اضغط "دخول المرحلة" للاطلاع على تفاصيل الطلبات وأعمارها الزمنية
              </div>
            </div>
            {myRoleInfo && (
              <div style={{
                marginRight:"auto",
                background:"rgba(197,160,89,0.08)", border:`1px solid ${GOLD_BOR}`,
                borderRadius:12, padding:"6px 14px",
                fontSize:"0.66rem", fontWeight:800, color:"#7A5C10",
                display:"flex", alignItems:"center", gap:6,
              }}>
                {myRoleInfo.icon} مرحلتك: {myRoleInfo.stage.map(s => `م${s}`).join("، ")}
              </div>
            )}
            <div style={{
              fontSize:"0.6rem", color:"#AAAAAA",
              background:"#fff", border:"1px solid #EBEBEB",
              borderRadius:10, padding:"5px 12px",
            }}>
              {totalActive} طلب نشط إجمالاً
            </div>
          </div>

          {/* Stage rows */}
          <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:9 }}>
            {STAGES.map((_, i) => (
              <StageRow
                key={i + 1}
                stageNum={i + 1}
                contracts={contracts}
                totalActive={totalActive}
                isMine={myRoleInfo?.stage.includes(i + 1) ?? false}
                pulseActive={pulseActive}
                onEnter={() => onOpenStage(i + 1)}
              />
            ))}
          </div>
        </div>

        {/* ═══ ADVANCED ANALYTICS ══════════════════════════════════ */}
        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr", gap:14 }}>

          {/* Bottleneck */}
          <div className="glass-card">
            <div style={{ padding:"13px 18px 12px", borderBottom:"1px solid #F5F5F5", background:"linear-gradient(90deg, #FBF9F4, transparent)", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", boxShadow:`0 2px 10px ${GOLD_GLOW}` }}>🚥</div>
              <div>
                <div style={{ fontSize:"0.82rem", fontWeight:800, color:"#1A1A1A" }}>نقاط الاختناق</div>
                <div style={{ fontSize:"0.58rem", color:"#9b8060" }}>المراحل الأكثر ضغطاً</div>
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
                      <div key={d.stageNum} style={{ cursor:"pointer" }} onClick={() => onOpenStage(d.stageNum)}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:"0.62rem", fontWeight:700, color: isTop ? RED : "#555" }}>{d.icon} {d.fullName}</span>
                          <span style={{ fontSize:"0.62rem", fontWeight:900, color:barColor }}>{d.count}</span>
                        </div>
                        <div style={{ height:7, background:"#F0F0F0", borderRadius:4, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, borderRadius:4, background:`linear-gradient(90deg, ${barColor}, ${barColor}80)`, boxShadow: isTop ? `0 0 8px ${barColor}60` : "none", transition:"width 0.8s ease" }}/>
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
            <div style={{ padding:"13px 18px 12px", borderBottom:"1px solid #F5F5F5", background:"linear-gradient(90deg, #FBF9F4, transparent)", display:"flex", alignItems:"center", gap:8 }}>
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

          {/* Weekly + urgency */}
          <div className="glass-card">
            <div style={{ padding:"13px 18px 12px", borderBottom:"1px solid #F5F5F5", background:"linear-gradient(90deg, #FBF9F4, transparent)", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:`linear-gradient(135deg, ${GOLD}, ${GOLD_END})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", boxShadow:`0 2px 10px ${GOLD_GLOW}` }}>📈</div>
              <div style={{ fontSize:"0.82rem", fontWeight:800, color:"#1A1A1A" }}>الأداء الأسبوعي</div>
            </div>
            <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:"0.65rem", fontWeight:700, color:"#555" }}>الأسبوع الحالي</span>
                  <span style={{ fontSize:"0.72rem", fontWeight:900, color:GREEN }}>{completedThisWeek}</span>
                </div>
                <ResponsiveContainer width="100%" height={50}>
                  <BarChart data={[
                    { name:"أسبوع سابق", value: completedLastWeek },
                    { name:"هذا الأسبوع", value: completedThisWeek },
                  ]} margin={{ top:2, right:2, left:-20, bottom:0 }}>
                    <defs>
                      <linearGradient id="wkGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD_END}/>
                        <stop offset="100%" stopColor={GOLD2}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize:8, fill:"#AAA", fontFamily:"'Cairo',sans-serif" }} axisLine={false} tickLine={false}/>
                    <Bar dataKey="value" radius={[4,4,0,0]} fill="url(#wkGrad2)" maxBarSize={36}/>
                    <Tooltip formatter={(v: unknown) => [`${v} عقد`, ""]} contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.72rem", direction:"rtl", border:`1px solid ${GOLD_BOR}`, borderRadius:8 }}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ borderTop:"1px solid #F5F5F5", paddingTop:10, display:"flex", flexDirection:"column", gap:5 }}>
                <div style={{ fontSize:"0.6rem", fontWeight:800, color:"#888", marginBottom:2 }}>🚦 توزيع الأولوية</div>
                {[
                  { label:"عاجل (≥٧ أيام)",   count:urgentContracts, color:RED   },
                  { label:"تحذير (٣-٧ أيام)",  count:warnContracts,   color:AMBER },
                  { label:"طبيعي (< ٣ أيام)",  count:safeContracts,   color:GREEN },
                ].map((item, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"0.58rem", color:"#666" }}>{item.label}</span>
                    <span style={{ minWidth:22, height:20, borderRadius:10, background:`${item.color}14`, color:item.color, fontSize:"0.6rem", fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 7px" }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ VALUE STRIP ════════════════════════════════════════ */}
        <div style={{
          background:"linear-gradient(135deg, #1C1810 0%, #2A2010 50%, #1C1810 100%)",
          borderRadius:18, padding:"16px 28px",
          display:"flex", alignItems:"center",
          border:`1px solid ${GOLD_BOR}`,
          boxShadow:"0 8px 30px rgba(0,0,0,0.15), inset 0 1px 0 rgba(197,160,89,0.12)",
          position:"relative", overflow:"hidden",
        }}>
          {[
            { label:"إجمالي قيمة العقود النشطة", value:`${formatSAR(totalSAR)} ر.س`, icon:"💰" },
            { label:"الطلبات النشطة في المسار",  value:`${cActive} عقد`,             icon:"⚡" },
            { label:"مكتملة هذا الأسبوع",        value:`${completedThisWeek} عقد`,   icon:"📊" },
            { label:"نسبة الإنجاز الكلية",        value:`${completePct}%`,            icon:"🎯" },
          ].map((item, i, arr) => (
            <div key={i} style={{ flex:1, textAlign:"center", borderLeft: i < arr.length - 1 ? "1px solid rgba(197,160,89,0.18)" : "none" }}>
              <div style={{ fontSize:"0.6rem", color:"rgba(226,194,117,0.6)", marginBottom:4 }}>{item.icon} {item.label}</div>
              <div style={{
                fontSize:"1.1rem", fontWeight:900, letterSpacing:"-0.02em",
                background:`linear-gradient(135deg, ${GOLD_END}, ${GOLD})`,
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              }}>{item.value}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
