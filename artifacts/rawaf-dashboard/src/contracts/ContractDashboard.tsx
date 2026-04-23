import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { STAGES, ROLES } from "./types";
import type { Contract } from "./types";
import logoImg from "@assets/logo_1776506524686.jpg";

// ── Tokens ──────────────────────────────────────────────────────────
const GOLD      = "#C5A059";
const GOLD2     = "#a88540";
const GOLD_END  = "#E2C275";
const GOLD_GLOW = "rgba(197,160,89,0.55)";
const GOLD_BOR  = "rgba(197,160,89,0.28)";
const GREEN     = "#22c55e";
const GREEN_D   = "#15803d";
const RED       = "#ef4444";
const RED_D     = "#b91c1c";
const AMBER     = "#f59e0b";
const BLUE      = "#3b82f6";
const BLUE_D    = "#1d4ed8";
// Dark luxury palette
const BG        = "#07090F";
const CARD      = "rgba(14,17,26,0.98)";
const BORD      = "rgba(255,255,255,0.07)";
const BORD_HI   = "rgba(255,255,255,0.13)";
const TX        = "rgba(255,255,255,0.90)";
const TX2       = "rgba(255,255,255,0.50)";
const TX3       = "rgba(255,255,255,0.22)";

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function formatSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ألف`;
  return `${n}`;
}

type ViewTab = "all" | "active" | "completed" | "rejected";

interface Props {
  role: string;
  actorName: string;
  contracts: Contract[];
  pendingContracts: Contract[];
  onOpenContract: (id: number) => void;
  onOpenStage: (stageNum: number) => void;
}

// ── Animated Counter ────────────────────────────────────────────────
function AnimatedNum({ value, color }: { value: number; color?: string }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff  = value - start;
    if (diff === 0) return;
    const dur = Math.min(900, Math.abs(diff) * 40);
    const t0  = performance.now();
    const raf = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * ease));
      if (p < 1) requestAnimationFrame(raf);
      else { setDisplay(value); prev.current = value; }
    };
    requestAnimationFrame(raf);
  }, [value]);
  return <span style={{ color: color ?? TX }}>{display}</span>;
}

// ── Stage Row (pipeline card) ────────────────────────────────────────
function StageRow({
  stageNum, contracts, totalForTab, isMine, viewTab, pulseActive, onEnter, isFirst, isLast, idx,
}: {
  stageNum: number; contracts: Contract[]; totalForTab: number; isMine: boolean;
  viewTab: ViewTab; pulseActive: boolean; onEnter: () => void;
  isFirst: boolean; isLast: boolean; idx: number;
}) {
  const [hovered, setHovered] = useState(false);
  const stage = STAGES[stageNum - 1];

  const activeC    = contracts.filter(c => c.currentStage === stageNum && c.status === "active").length;
  const completedC = contracts.filter(c => c.currentStage === stageNum && c.status === "completed").length;
  const rejectedC  = contracts.filter(c => c.currentStage === stageNum && !!c.rejectionReason).length;
  const count = viewTab === "completed" ? completedC : viewTab === "rejected" ? rejectedC : activeC;

  const urgent = contracts.filter(c => c.currentStage === stageNum && c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warn   = contracts.filter(c => c.currentStage === stageNum && c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;

  const pct = totalForTab > 0 ? Math.min(100, Math.round((count / totalForTab) * 100)) : 0;

  const accent =
    viewTab === "completed" ? GREEN :
    viewTab === "rejected"  ? RED :
    urgent > 0              ? RED :
    warn > 0                ? AMBER :
    isMine                  ? GOLD :
    count > 0               ? BLUE  :
    "rgba(255,255,255,0.1)";
  const isEmpty  = count === 0;
  const lineClr  = isEmpty ? "rgba(255,255,255,0.05)" : accent + "55";
  const shouldPulse = pulseActive && count > 0;

  return (
    <div
      className={shouldPulse ? "row-pulse" : ""}
      style={{ display: "flex", alignItems: "stretch", animation: `slideIn 0.42s ease ${idx * 0.035}s both` }}
    >
      {/* ── Pipeline track (right side in RTL = logical start) */}
      <div style={{ width: 52, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ flex: 1, width: 2, background: isFirst ? "transparent" : lineClr, minHeight: 14, transition: "background 0.4s" }}/>
        {/* Numbered node */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0, zIndex: 1,
          background: isEmpty ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${accent}, ${accent}80)`,
          border: `2px solid ${isEmpty ? BORD : accent + "70"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.68rem", fontWeight: 900, color: isEmpty ? TX3 : "#fff",
          boxShadow: isEmpty ? "none" : `0 0 0 4px ${accent}10, 0 0 16px ${accent}40`,
          transition: "all 0.35s ease",
          transform: hovered && !isEmpty ? "scale(1.1)" : "scale(1)",
        }}>{stageNum}</div>
        <div style={{ flex: 1, width: 2, background: isLast ? "transparent" : lineClr, minHeight: 14, transition: "background 0.4s" }}/>
      </div>

      {/* ── Card */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          flex: 1, marginTop: 3, marginBottom: 3,
          background: isEmpty ? "rgba(255,255,255,0.015)" :
                      isMine  ? `rgba(197,160,89,0.07)` : CARD,
          border: `1px solid ${hovered && !isEmpty ? (isMine ? GOLD_BOR : BORD_HI) : (isMine ? GOLD_BOR : BORD)}`,
          borderRight: `3px solid ${isEmpty ? "transparent" : accent}`,
          borderRadius: 16,
          display: "flex", alignItems: "center",
          overflow: "hidden",
          boxShadow: hovered && !isEmpty
            ? `0 8px 32px ${accent}22, 0 2px 8px rgba(0,0,0,0.3)`
            : isEmpty ? "none" : "0 4px 18px rgba(0,0,0,0.2)",
          transition: "all 0.25s ease",
          opacity: isEmpty && viewTab !== "all" ? 0.45 : isEmpty ? 0.6 : 1,
          transform: hovered && !isEmpty ? "translateX(-2px)" : "none",
        }}
      >
        {/* Shimmer on hover */}
        {hovered && !isEmpty && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16,
            background: `linear-gradient(105deg, transparent 40%, ${accent}08 50%, transparent 60%)`,
            animation: "shimmer 1.5s ease infinite",
          }}/>
        )}

        {/* Stage info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", flex: "0 0 auto", minWidth: 250 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: isEmpty ? "rgba(255,255,255,0.04)" : isMine ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})` : `${accent}20`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
            boxShadow: isEmpty ? "none" : isMine ? `0 4px 14px ${GOLD_GLOW}` : `0 2px 10px ${accent}30`,
            transition: "transform 0.25s", transform: hovered && !isEmpty ? "scale(1.08) rotate(-3deg)" : "scale(1)",
          }}>{stage?.icon ?? "📄"}</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
              {isMine && (
                <span style={{ fontSize: "0.5rem", background: "rgba(197,160,89,0.15)", border: `1px solid ${GOLD_BOR}`, borderRadius: 8, padding: "1px 6px", color: GOLD, fontWeight: 800 }}>
                  ⭐ مرحلتك
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.84rem", fontWeight: 800, color: isEmpty ? TX3 : TX, lineHeight: 1.25 }}>{stage?.label}</div>
            <div style={{ fontSize: "0.58rem", color: TX3, marginTop: 3 }}>👤 {stage?.role}</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 38, background: BORD, flexShrink: 0 }}/>

        {/* Count + bar */}
        <div style={{ flex: 1, padding: "11px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          {/* Glowing orb */}
          <div style={{
            width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
            background: isEmpty ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg, ${accent}BB, ${accent}70)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: count >= 100 ? "0.82rem" : count >= 10 ? "1rem" : "1.28rem",
            fontWeight: 900, color: isEmpty ? TX3 : "#fff",
            boxShadow: isEmpty ? "none" : `0 0 0 5px ${accent}10, 0 0 24px ${accent}38`,
            letterSpacing: "-0.02em",
            animation: shouldPulse ? "orbPulse 0.8s ease 3" : "none",
          }}>{count}</div>

          {/* Progress info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: "0.58rem", color: TX3 }}>
                {isEmpty ? "لا طلبات حالياً" : `${count} طلب · ${pct}%`}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {urgent > 0 && (
                  <span style={{ fontSize: "0.52rem", fontWeight: 800, color: RED, background: `${RED}14`, border: `1px solid ${RED}22`, borderRadius: 8, padding: "1px 6px", animation: "urgentBlink 2s ease infinite" }}>
                    ⚠ {urgent} عاجل
                  </span>
                )}
                {warn > 0 && (
                  <span style={{ fontSize: "0.52rem", fontWeight: 800, color: AMBER, background: `${AMBER}14`, border: `1px solid ${AMBER}22`, borderRadius: 8, padding: "1px 6px" }}>
                    🔔 {warn}
                  </span>
                )}
              </div>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`, borderRadius: 4,
                background: isEmpty ? "transparent" : isMine
                  ? `linear-gradient(90deg, ${GOLD}, ${GOLD_END})`
                  : `linear-gradient(90deg, ${accent}, ${accent}60)`,
                boxShadow: pct > 0 ? `0 0 8px ${accent}50` : "none",
                transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)",
              }}/>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 38, background: BORD, flexShrink: 0 }}/>

        {/* Enter button */}
        <div style={{ padding: "11px 16px", flexShrink: 0 }}>
          <button
            onClick={onEnter}
            disabled={isEmpty}
            style={{
              background: isEmpty
                ? "rgba(255,255,255,0.04)"
                : `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_END} 100%)`,
              color: isEmpty ? TX3 : "#fff",
              border: isEmpty ? `1px solid ${BORD}` : "none",
              borderRadius: 11,
              padding: "8px 16px",
              fontFamily: "'Cairo','Tajawal',sans-serif",
              fontSize: "0.73rem", fontWeight: 800,
              cursor: isEmpty ? "default" : "pointer",
              boxShadow: isEmpty ? "none" : `0 4px 16px ${GOLD_GLOW}`,
              whiteSpace: "nowrap",
              transition: "all 0.18s ease",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={e => { if (!isEmpty) { const b = e.currentTarget; b.style.transform = "scale(1.06)"; b.style.boxShadow = `0 6px 24px ${GOLD_GLOW}`; }}}
            onMouseLeave={e => { const b = e.currentTarget; b.style.transform = "scale(1)"; b.style.boxShadow = isEmpty ? "none" : `0 4px 16px ${GOLD_GLOW}`; }}
          >
            {isEmpty ? "فارغة" : "دخول ←"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Metric Tile ─────────────────────────────────────────────────────
function MetricTile({
  label, sub, count, icon, accent, accentD, isActive, onClick, hint,
}: {
  label: string; sub: string; count: number; icon: string;
  accent: string; accentD: string; isActive: boolean; onClick: () => void; hint?: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 20, padding: "20px 22px",
        background: isActive ? `linear-gradient(145deg, ${accent}18, ${accent}08)` : CARD,
        border: `1px solid ${isActive ? accent + "40" : hov ? BORD_HI : BORD}`,
        boxShadow: isActive
          ? `0 8px 32px ${accent}25, inset 0 1px 0 ${accent}18`
          : hov ? `0 8px 24px rgba(0,0,0,0.3)` : "0 2px 10px rgba(0,0,0,0.2)",
        cursor: "pointer",
        position: "relative", overflow: "hidden",
        transform: isActive ? "translateY(-5px)" : hov ? "translateY(-2px)" : "none",
        transition: "all 0.22s ease",
      }}
    >
      {/* Top accent line */}
      {isActive && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${accent}, ${accentD})`,
          borderRadius: "20px 20px 0 0",
          boxShadow: `0 0 12px ${accent}80`,
        }}/>
      )}
      {/* Corner glow */}
      {isActive && (
        <div style={{
          position: "absolute", top: -30, right: -30, width: 80, height: 80,
          borderRadius: "50%", background: `radial-gradient(ellipse, ${accent}18, transparent 70%)`,
          pointerEvents: "none",
        }}/>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13,
          background: isActive ? `${accent}20` : "rgba(255,255,255,0.05)",
          border: `1px solid ${isActive ? accent + "35" : BORD}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem",
          boxShadow: isActive ? `0 4px 14px ${accent}30` : "none",
          transition: "all 0.22s ease",
        }}>{icon}</div>
        {isActive
          ? <span style={{ fontSize: "0.52rem", fontWeight: 800, color: accent, background: `${accent}14`, border: `1px solid ${accent}25`, borderRadius: 20, padding: "3px 9px" }}>● نشط</span>
          : hint
            ? <span style={{ fontSize: "0.5rem", color: TX3, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORD}`, borderRadius: 20, padding: "3px 9px" }}>{hint}</span>
            : null
        }
      </div>

      <div style={{
        fontSize: "2.3rem", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1,
        color: isActive ? accent : TX,
        textShadow: isActive ? `0 0 30px ${accent}40` : "none",
        transition: "color 0.3s",
      }}>
        <AnimatedNum value={count} color={isActive ? accent : TX}/>
      </div>
      <div style={{ fontSize: "0.73rem", fontWeight: 700, color: isActive ? accent + "CC" : TX2, marginTop: 6 }}>{label}</div>
      <div style={{ fontSize: "0.58rem", color: isActive ? accent + "80" : TX3, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════
export default function ContractDashboard({
  role, actorName, contracts, pendingContracts, onOpenContract, onOpenStage,
}: Props) {
  const [viewTab, setViewTab]       = useState<ViewTab>("all");
  const [pulseActive, setPulseActive] = useState(false);

  // Aggregates
  const total      = contracts.length;
  const cActive    = contracts.filter(c => c.status === "active" && !c.rejectionReason).length;
  const cDone      = contracts.filter(c => c.status === "completed").length;
  const cRejected  = contracts.filter(c => !!c.rejectionReason && c.status !== "completed").length;
  const totalSAR   = contracts.filter(c => c.status === "active").reduce((s, c) => s + (c.value || 0), 0);
  const completePct = total > 0 ? Math.round((cDone / total) * 100) : 0;

  const urgentCount = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warnCount   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;
  const safeCount   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) < 3).length;

  const completedThisWeek = contracts.filter(c => c.status === "completed" && daysSince(c.updatedAt) <= 7).length;
  const completedLastWeek = contracts.filter(c => c.status === "completed" && daysSince(c.updatedAt) > 7 && daysSince(c.updatedAt) <= 14).length;

  const myRoleInfo = ROLES.find(r => r.name === role);

  const totalForTab =
    viewTab === "completed" ? cDone :
    viewTab === "rejected"  ? cRejected : cActive;

  // Bottleneck
  const bottleneckData = STAGES.map((s, i) => ({
    name: s.label.length > 8 ? s.label.slice(0, 8) + "…" : s.label,
    fullName: s.label, icon: s.icon, stageNum: i + 1,
    count: contracts.filter(c => c.currentStage === i + 1 && c.status === "active").length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
  const maxB = Math.max(...bottleneckData.map(d => d.count), 1);

  const pieData = [
    { name: "نشطة",   value: cActive,   color: GOLD  },
    { name: "مكتملة", value: cDone,     color: GREEN },
    { name: "مرفوضة", value: cRejected, color: RED   },
  ].filter(d => d.value > 0);

  const TAB_META: { key: ViewTab; label: string; sub: string; count: number; icon: string; accent: string; accentD: string; hint?: string }[] = [
    { key: "all",       label: "إجمالي العقود",   sub: "جميع الحالات",      count: total,     icon: "📁", accent: BLUE,  accentD: BLUE_D,  hint: "عرض الكل" },
    { key: "active",    label: "الطلبات النشطة",   sub: "قيد التنفيذ الآن",  count: cActive,   icon: "⚡", accent: GOLD,  accentD: GOLD2,   hint: "يُضيء الصفوف" },
    { key: "completed", label: "العقود المكتملة",  sub: "أُنجزت بنجاح",      count: cDone,     icon: "✅", accent: GREEN, accentD: GREEN_D, hint: "عرض الإنجاز" },
    { key: "rejected",  label: "العقود المرفوضة",  sub: "أُعيدت أو رُفضت",   count: cRejected, icon: "↩", accent: RED,   accentD: RED_D,   hint: "عرض المرفوض" },
  ];

  function handleTabClick(tab: ViewTab) {
    setViewTab(tab);
    if (tab === "active") {
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 3600);
    } else {
      setPulseActive(false);
    }
  }

  const tabLabel =
    viewTab === "completed" ? "عدد العقود المكتملة لكل مرحلة" :
    viewTab === "rejected"  ? "عدد العقود المرفوضة لكل مرحلة" :
    viewTab === "active"    ? "الطلبات النشطة — المراحل متوهجة" :
    "الطلبات النشطة لكل مرحلة";

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100%", fontFamily: "'Cairo','Tajawal',sans-serif" }}>
      <style>{`
        @keyframes glowLogo {
          0%,100% { box-shadow: 0 0 0 2px rgba(197,160,89,0.4), 0 6px 24px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 0 3px rgba(197,160,89,0.8), 0 8px 32px rgba(197,160,89,0.35); }
        }
        @keyframes slideIn {
          from { opacity:0; transform:translateX(14px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes orbPulse {
          0%,100% { transform:scale(1); }
          50%     { transform:scale(1.18); }
        }
        @keyframes urgentBlink {
          0%,100% { opacity:1; }
          50%     { opacity:0.55; }
        }
        @keyframes row-pulse-kf {
          0%,100% { box-shadow:0 4px 18px rgba(0,0,0,0.2); }
          40%     { box-shadow:0 0 0 2px ${GOLD_BOR}, 0 8px 32px rgba(197,160,89,0.28); }
        }
        @keyframes headerShimmer {
          0%   { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        .row-pulse { animation: row-pulse-kf 1.1s ease 3; }
        .tile-hover { transition: all 0.22s ease; }
      `}</style>

      {/* ═══ HEADER ══════════════════════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(115deg, #0D0B08 0%, #1A1508 45%, #0D0B08 100%)",
        borderBottom: `1px solid ${GOLD_BOR}`,
        padding: "16px 28px 14px",
        position: "relative", overflow: "hidden",
      }}>
        {/* BG decoration */}
        <div style={{ position: "absolute", top: -60, left: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(197,160,89,0.07) 0%, transparent 70%)", pointerEvents: "none" }}/>
        <div style={{ position: "absolute", bottom: -40, right: "40%", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(197,160,89,0.04) 0%, transparent 70%)", pointerEvents: "none" }}/>

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16 }}>
          {/* Logo */}
          <div style={{ width: 52, height: 52, borderRadius: 16, overflow: "hidden", flexShrink: 0, animation: "glowLogo 4s ease-in-out infinite" }}>
            <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          </div>

          <div>
            <div style={{ fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.16em", color: "rgba(197,160,89,0.6)", marginBottom: 2 }}>
              ALRAWAF CONTRACTING — EXECUTIVE COMMAND CENTER
            </div>
            <div style={{
              fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.02em",
              background: `linear-gradient(120deg, ${GOLD_END}, ${GOLD}, ${GOLD2}, ${GOLD_END})`,
              backgroundSize: "300%",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              animation: "headerShimmer 6s linear infinite",
            }}>لوحة القيادة التنفيذية</div>
            <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              {role
                ? `${actorName || role} · ${pendingContracts.length} عقد بانتظار قرارك`
                : "نظام إدارة العقود — اختر دورك من القائمة الجانبية"}
            </div>
          </div>

          {/* Right chips */}
          <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {urgentCount > 0 && (
              <div style={{
                background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.32)", borderRadius: 22,
                padding: "6px 14px", fontSize: "0.63rem", fontWeight: 800, color: "#FCA5A5",
                animation: "urgentBlink 2.5s ease infinite",
              }}>
                ⚠️ {urgentCount} عاجل
              </div>
            )}
            {/* Completion mini-ring */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD_BOR}`,
              borderRadius: 14, padding: "8px 16px", backdropFilter: "blur(10px)",
            }}>
              {/* SVG ring */}
              <svg width="38" height="38" style={{ flexShrink: 0 }}>
                <circle cx="19" cy="19" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
                <circle
                  cx="19" cy="19" r="15" fill="none" stroke={GOLD} strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 15}`}
                  strokeDashoffset={`${2 * Math.PI * 15 * (1 - completePct / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 19 19)"
                  style={{ transition: "stroke-dashoffset 1.2s ease", filter: `drop-shadow(0 0 4px ${GOLD_GLOW})` }}
                />
                <text x="19" y="23" textAnchor="middle" fill={GOLD_END} fontSize="8" fontWeight="900" fontFamily="Cairo">{completePct}%</text>
              </svg>
              <div>
                <div style={{ fontSize: "0.66rem", fontWeight: 800, color: TX2 }}>نسبة الإنجاز</div>
                <div style={{ fontSize: "0.58rem", color: TX3 }}>{cDone} من {total} عقد</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ═══ METRIC TILES ═══════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, animation: "fadeUp 0.45s ease both" }}>
          {TAB_META.map(t => (
            <MetricTile
              key={t.key}
              label={t.label} sub={t.sub} count={t.count} icon={t.icon}
              accent={t.accent} accentD={t.accentD}
              isActive={viewTab === t.key}
              onClick={() => handleTabClick(t.key)}
              hint={t.hint}
            />
          ))}
        </div>

        {/* ═══ PIPELINE ════════════════════════════════════════════════ */}
        <div style={{
          background: "rgba(255,255,255,0.015)",
          border: `1px solid ${BORD}`,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}>
          {/* Section header */}
          <div style={{
            background: "linear-gradient(90deg, rgba(197,160,89,0.06) 0%, rgba(197,160,89,0.02) 100%)",
            borderBottom: `1px solid ${GOLD_BOR}`,
            padding: "14px 22px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11, flexShrink: 0,
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem",
              boxShadow: `0 4px 14px ${GOLD_GLOW}`,
            }}>🗺️</div>
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 900, color: TX }}>
                مسار دورة حياة العقد — {STAGES.length} مرحلة
              </div>
              <div style={{ fontSize: "0.58rem", color: TX3, marginTop: 1 }}>{tabLabel}</div>
            </div>
            {myRoleInfo && (
              <div style={{
                marginRight: "auto",
                background: "rgba(197,160,89,0.1)", border: `1px solid ${GOLD_BOR}`,
                borderRadius: 11, padding: "5px 13px",
                fontSize: "0.63rem", fontWeight: 800, color: GOLD,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {myRoleInfo.icon} {myRoleInfo.stage.map(s => `م${s}`).join("، ")}
              </div>
            )}
            {/* View indicator badges */}
            <div style={{ display: "flex", gap: 6 }}>
              {viewTab !== "all" && (
                <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORD}`, borderRadius: 10, padding: "4px 12px", fontSize: "0.58rem", color: TX2 }}>
                  {totalForTab} إجمالاً
                </div>
              )}
            </div>
          </div>

          {/* Rows */}
          <div style={{ padding: "14px 16px 10px", display: "flex", flexDirection: "column" }}>
            {STAGES.map((_, i) => (
              <StageRow
                key={i}
                stageNum={i + 1}
                contracts={contracts}
                totalForTab={totalForTab}
                isMine={myRoleInfo?.stage.includes(i + 1) ?? false}
                viewTab={viewTab}
                pulseActive={pulseActive}
                onEnter={() => onOpenStage(i + 1)}
                isFirst={i === 0}
                isLast={i === STAGES.length - 1}
                idx={i}
              />
            ))}
          </div>
        </div>

        {/* ═══ ANALYTICS ROW ══════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 14, animation: "fadeUp 0.5s ease 0.12s both" }}>

          {/* Bottleneck */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 20, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px 11px", borderBottom: `1px solid ${BORD}`, background: "rgba(197,160,89,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", boxShadow: `0 2px 10px ${GOLD_GLOW}` }}>🚥</div>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 800, color: TX }}>نقاط الاختناق</div>
                <div style={{ fontSize: "0.57rem", color: TX3 }}>المراحل الأكثر ضغطاً</div>
              </div>
            </div>
            <div style={{ padding: "12px 16px" }}>
              {bottleneckData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: TX3, fontSize: "0.75rem" }}>لا عقود نشطة</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {bottleneckData.slice(0, 6).map((d, i) => {
                    const p = Math.round((d.count / maxB) * 100);
                    const clr = i === 0 ? RED : i === 1 ? AMBER : GOLD;
                    return (
                      <div key={d.stageNum} style={{ cursor: "pointer" }} onClick={() => onOpenStage(d.stageNum)}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: i === 0 ? RED : TX2 }}>{d.icon} {d.fullName}</span>
                          <span style={{ fontSize: "0.6rem", fontWeight: 900, color: clr }}>{d.count}</span>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${p}%`, borderRadius: 4, background: `linear-gradient(90deg, ${clr}, ${clr}60)`, boxShadow: i === 0 ? `0 0 8px ${clr}60` : "none", transition: "width 0.9s ease" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Status donut */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 20, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px 11px", borderBottom: `1px solid ${BORD}`, background: "rgba(197,160,89,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", boxShadow: `0 2px 10px ${GOLD_GLOW}` }}>🍩</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: TX }}>توزيع الحالات</div>
            </div>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 96, height: 96, flexShrink: 0 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={5} dataKey="value">
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none"/>)}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => [`${v} عقد`, ""]} contentStyle={{ fontFamily: "'Cairo',sans-serif", fontSize: "0.7rem", direction: "rtl", background: "#111", border: `1px solid ${BORD}`, borderRadius: 10, color: TX }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: TX3, fontSize: "0.72rem" }}>لا بيانات</div>}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "نشطة",   count: cActive,   color: GOLD  },
                  { label: "مكتملة", count: cDone,     color: GREEN },
                  { label: "مرفوضة", count: cRejected, color: RED   },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: "0.58rem", fontWeight: 700, color: TX2 }}>{item.label}</span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 900, color: item.color }}>{item.count}</span>
                    </div>
                    <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: total > 0 ? `${Math.round(item.count/total*100)}%` : "0%", borderRadius: 3, background: `linear-gradient(90deg, ${item.color}, ${item.color}60)`, transition: "width 0.8s ease" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly + urgency */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 20, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px 11px", borderBottom: `1px solid ${BORD}`, background: "rgba(197,160,89,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", boxShadow: `0 2px 10px ${GOLD_GLOW}` }}>📈</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: TX }}>الأداء الأسبوعي</div>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <ResponsiveContainer width="100%" height={56}>
                <BarChart data={[
                  { name: "الأسبوع السابق", value: completedLastWeek },
                  { name: "هذا الأسبوع",    value: completedThisWeek },
                ]} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wkGr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD_END}/>
                      <stop offset="100%" stopColor={GOLD2}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: TX3, fontFamily: "'Cairo',sans-serif" }} axisLine={false} tickLine={false}/>
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="url(#wkGr)" maxBarSize={38}/>
                  <Tooltip formatter={(v: unknown) => [`${v} عقد`, ""]} contentStyle={{ fontFamily: "'Cairo',sans-serif", fontSize: "0.7rem", direction: "rtl", background: "#111", border: `1px solid ${BORD}`, borderRadius: 8, color: TX }}/>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ borderTop: `1px solid ${BORD}`, paddingTop: 9, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: "0.58rem", fontWeight: 800, color: TX3, marginBottom: 2 }}>🚦 توزيع الأولوية</div>
                {[
                  { label: "عاجل ≥٧ أيام",    count: urgentCount, color: RED   },
                  { label: "تحذير ٣–٧ أيام",   count: warnCount,   color: AMBER },
                  { label: "طبيعي < ٣ أيام",   count: safeCount,   color: GREEN },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.57rem", color: TX3 }}>{item.label}</span>
                    <span style={{ minWidth: 22, height: 20, borderRadius: 10, background: `${item.color}16`, color: item.color, fontSize: "0.6rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 7px" }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ VALUE STRIP ════════════════════════════════════════════ */}
        <div style={{
          background: "linear-gradient(130deg, #0E0B06 0%, #1A1406 50%, #0E0B06 100%)",
          borderRadius: 20, padding: "15px 26px",
          display: "flex", alignItems: "center",
          border: `1px solid ${GOLD_BOR}`,
          boxShadow: `0 8px 36px rgba(0,0,0,0.35), inset 0 1px 0 ${GOLD_BOR}`,
          position: "relative", overflow: "hidden",
          animation: "fadeUp 0.5s ease 0.2s both",
        }}>
          <div style={{ position: "absolute", top: -40, right: "30%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(197,160,89,0.05) 0%, transparent 70%)", pointerEvents: "none" }}/>
          {[
            { label: "قيمة العقود النشطة", value: `${formatSAR(totalSAR)} ر.س`, icon: "💰" },
            { label: "الطلبات في المسار",  value: `${cActive} عقد`,             icon: "⚡" },
            { label: "مكتملة الأسبوع",     value: `${completedThisWeek} عقد`,   icon: "📊" },
            { label: "نسبة الإنجاز",        value: `${completePct}%`,            icon: "🎯" },
          ].map((item, i, arr) => (
            <div key={i} style={{
              flex: 1, textAlign: "center",
              borderLeft: i < arr.length - 1 ? `1px solid rgba(197,160,89,0.14)` : "none",
              padding: "0 8px",
            }}>
              <div style={{ fontSize: "0.58rem", color: "rgba(226,194,117,0.5)", marginBottom: 4 }}>{item.icon} {item.label}</div>
              <div style={{
                fontSize: "1.1rem", fontWeight: 900, letterSpacing: "-0.02em",
                background: `linear-gradient(135deg, ${GOLD_END}, ${GOLD})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                textShadow: "none",
              }}>{item.value}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
