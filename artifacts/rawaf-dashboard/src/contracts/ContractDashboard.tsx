import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";
import { STAGES, ROLES } from "./types";
import type { Contract } from "./types";
import logoImg from "@assets/logo_1776506524686.jpg";

// ── Tokens ──────────────────────────────────────────────────────────
const GOLD     = "#C5A059";
const GOLD2    = "#a88540";
const GOLD_END = "#E2C275";
const GREEN    = "#16a34a";
const GREEN_L  = "#22c55e";
const ORANGE   = "#ea580c";
const ORANGE_L = "#f97316";
const BLUE     = "#2563eb";
const BLUE_L   = "#3b82f6";
const RED      = "#dc2626";
const AMBER    = "#d97706";

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

// ── Animated counter ────────────────────────────────────────────────
function AnimCount({ value, color }: { value: number; color?: string }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current, to = value;
    if (from === to) return;
    const dur = Math.min(700, Math.abs(to - from) * 30 + 200);
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(tick);
      else { setV(to); prev.current = to; }
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <span style={{ color }}>{v}</span>;
}

// ── Single stage row (reference-image style) ─────────────────────────
function StageRow({
  stageNum, contracts, maxCount, isMine, viewTab, pulseActive, onEnter, idx,
}: {
  stageNum: number; contracts: Contract[]; maxCount: number; isMine: boolean;
  viewTab: ViewTab; pulseActive: boolean; onEnter: () => void; idx: number;
}) {
  const [hov, setHov] = useState(false);
  const stage = STAGES[stageNum - 1];

  const activeC    = contracts.filter(c => c.currentStage === stageNum && c.status === "active").length;
  const completedC = contracts.filter(c => c.currentStage === stageNum && c.status === "completed").length;
  const rejectedC  = contracts.filter(c => c.currentStage === stageNum && !!c.rejectionReason).length;
  const count = viewTab === "completed" ? completedC : viewTab === "rejected" ? rejectedC : activeC;

  const urgent = contracts.filter(c => c.currentStage === stageNum && c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warn   = contracts.filter(c => c.currentStage === stageNum && c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;

  const pct      = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const isEmpty  = count === 0;
  const shouldPulse = pulseActive && count > 0;

  // Bar color based on count proportion
  const barColor = viewTab === "completed" ? GREEN_L
    : viewTab === "rejected" ? RED
    : urgent > 0 ? RED
    : warn > 0   ? AMBER
    : pct >= 50  ? GREEN_L
    : pct >= 20  ? ORANGE_L
    : count > 0  ? BLUE_L
    : "#E5E7EB";

  const numColor = viewTab === "completed" ? GREEN
    : viewTab === "rejected" ? RED
    : count === 0 ? "#D1D5DB"
    : urgent > 0  ? RED
    : warn > 0    ? AMBER
    : BLUE;

  return (
    <div
      className={shouldPulse ? "row-pulse" : ""}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => !isEmpty && onEnter()}
      style={{
        display: "flex", alignItems: "center", gap: 0,
        padding: "10px 0",
        borderBottom: "1px solid #F3F4F6",
        cursor: isEmpty ? "default" : "pointer",
        background: hov && !isEmpty
          ? isMine ? "rgba(197,160,89,0.04)" : "#FAFAFA"
          : "transparent",
        borderRadius: hov ? 8 : 0,
        transition: "background 0.18s ease",
        animation: `rowFadeIn 0.35s ease ${idx * 0.03}s both`,
        opacity: isEmpty ? 0.55 : 1,
      }}
    >
      {/* Count number — left side */}
      <div style={{
        width: 52, flexShrink: 0, textAlign: "left",
        paddingLeft: 6,
        fontSize: count >= 100 ? "1.3rem" : count >= 10 ? "1.55rem" : "1.8rem",
        fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>
        <AnimCount value={count} color={numColor}/>
      </div>

      {/* Bar + urgency — middle */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, padding: "0 14px 0 8px" }}>
        {/* Bar track */}
        <div style={{
          height: 7, background: "#EEF0F2", borderRadius: 99, overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: pct > 0 ? `${Math.max(pct, 3)}%` : "0%",
            borderRadius: 99,
            background: isEmpty ? "transparent" : barColor,
            boxShadow: pct > 0 && !isEmpty ? `0 0 6px ${barColor}70` : "none",
            transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)",
          }}/>
        </div>
        {/* Urgency pills */}
        {(urgent > 0 || warn > 0) && (
          <div style={{ display: "flex", gap: 5, paddingRight: 2 }}>
            {urgent > 0 && (
              <span style={{ fontSize: "0.52rem", fontWeight: 800, color: RED, background: "#FEF2F2", border: "1px solid #FCA5A580", borderRadius: 20, padding: "1px 7px" }}>
                ⚠ {urgent} عاجل
              </span>
            )}
            {warn > 0 && (
              <span style={{ fontSize: "0.52rem", fontWeight: 800, color: AMBER, background: "#FFFBEB", border: "1px solid #FCD34D80", borderRadius: 20, padding: "1px 7px" }}>
                🔔 {warn} تنبيه
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stage name + role — right side */}
      <div style={{ width: 200, flexShrink: 0, textAlign: "right", paddingRight: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          {isMine && (
            <span style={{ fontSize: "0.48rem", fontWeight: 800, color: GOLD2, background: "rgba(197,160,89,0.1)", border: "1px solid rgba(197,160,89,0.25)", borderRadius: 20, padding: "1px 6px" }}>
              مرحلتك ⭐
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: isEmpty ? "#C9CDD4" : "#1F2937", lineHeight: 1.2 }}>
              {stage?.label}
            </span>
            <span style={{ fontSize: "0.9rem" }}>{stage?.icon}</span>
          </div>
        </div>
        <div style={{ fontSize: "0.56rem", color: "#9CA3AF", marginTop: 2, textAlign: "right" }}>
          {stage?.role}
        </div>
      </div>

      {/* Enter button — shown on hover */}
      <div style={{
        width: hov && !isEmpty ? 76 : 0, overflow: "hidden",
        transition: "width 0.22s ease",
        flexShrink: 0, paddingLeft: hov && !isEmpty ? 8 : 0,
      }}>
        {!isEmpty && (
          <button
            onClick={e => { e.stopPropagation(); onEnter(); }}
            style={{
              background: isMine
                ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`
                : `linear-gradient(135deg, ${BLUE}, ${BLUE_L})`,
              color: "#fff", border: "none", borderRadius: 8,
              padding: "6px 12px", fontSize: "0.65rem", fontWeight: 800,
              cursor: "pointer", whiteSpace: "nowrap",
              fontFamily: "'Cairo','Tajawal',sans-serif",
              boxShadow: isMine ? `0 3px 12px rgba(197,160,89,0.4)` : `0 3px 12px rgba(37,99,235,0.3)`,
            }}
          >دخول ←</button>
        )}
      </div>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────
function StatCard({
  label, sub, count, icon, accent, isActive, onClick,
}: {
  label: string; sub: string; count: number; icon: string;
  accent: string; isActive: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 16, padding: "18px 20px",
        background: isActive ? "#fff" : "#fff",
        border: `1.5px solid ${isActive ? accent + "60" : hov ? "#E5E7EB" : "#F3F4F6"}`,
        boxShadow: isActive
          ? `0 8px 28px ${accent}22, 0 2px 6px ${accent}12`
          : hov ? "0 6px 20px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
        cursor: "pointer",
        position: "relative", overflow: "hidden",
        transform: isActive ? "translateY(-4px)" : hov ? "translateY(-2px)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      {isActive && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "16px 16px 0 0" }}/>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, color: isActive ? accent : "#6B7280" }}>{sub}</span>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: isActive ? accent + "15" : "#F9FAFB",
          border: `1px solid ${isActive ? accent + "30" : "#F3F4F6"}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
          boxShadow: isActive ? `0 2px 10px ${accent}20` : "none",
        }}>{icon}</div>
      </div>
      <div style={{
        fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1,
        color: isActive ? accent : "#111827",
      }}>
        <AnimCount value={count} color={isActive ? accent : "#111827"}/>
      </div>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: isActive ? accent + "CC" : "#374151", marginTop: 5 }}>{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function ContractDashboard({
  role, actorName, contracts, pendingContracts, onOpenContract, onOpenStage,
}: Props) {
  const [viewTab, setViewTab]         = useState<ViewTab>("all");
  const [pulseActive, setPulseActive] = useState(false);

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

  // Max count for bar scaling
  const maxCount = Math.max(
    ...STAGES.map((_, i) => {
      const n = i + 1;
      return viewTab === "completed"
        ? contracts.filter(c => c.currentStage === n && c.status === "completed").length
        : viewTab === "rejected"
        ? contracts.filter(c => c.currentStage === n && !!c.rejectionReason).length
        : contracts.filter(c => c.currentStage === n && c.status === "active").length;
    }),
    1
  );

  // Bottleneck
  const bottleneckData = STAGES.map((s, i) => ({
    name: s.label.length > 9 ? s.label.slice(0, 9) + "…" : s.label,
    fullName: s.label, icon: s.icon, stageNum: i + 1,
    count: contracts.filter(c => c.currentStage === i + 1 && c.status === "active").length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
  const maxB = Math.max(...bottleneckData.map(d => d.count), 1);

  const pieData = [
    { name: "نشطة",   value: cActive,   color: GOLD     },
    { name: "مكتملة", value: cDone,     color: GREEN_L  },
    { name: "مرفوضة", value: cRejected, color: RED      },
  ].filter(d => d.value > 0);

  const areaData = [
    { name: "الأسبوع الماضي", مكتملة: completedLastWeek  },
    { name: "هذا الأسبوع",    مكتملة: completedThisWeek },
  ];

  const TABS = [
    { key: "all"       as ViewTab, label: "إجمالي العقود",  sub: "جميع الحالات",     count: total,     icon: "📁", accent: BLUE   },
    { key: "active"    as ViewTab, label: "الطلبات النشطة", sub: "قيد التنفيذ الآن", count: cActive,   icon: "⚡", accent: GOLD   },
    { key: "completed" as ViewTab, label: "العقود المكتملة", sub: "أُنجزت بنجاح",   count: cDone,     icon: "✅", accent: GREEN  },
    { key: "rejected"  as ViewTab, label: "العقود المرفوضة", sub: "مرفوضة / معادة",  count: cRejected, icon: "↩", accent: RED    },
  ];

  const tabMeta =
    viewTab === "completed" ? { title: "حالات العقود المكتملة حسب المرحلة", color: GREEN }
    : viewTab === "rejected"  ? { title: "حالات العقود المرفوضة حسب المرحلة", color: RED   }
    : viewTab === "active"    ? { title: "حالات الطلبات الجارية", color: BLUE  }
    : { title: "حالات الطلبات الجارية", color: BLUE };

  function handleTab(t: ViewTab) {
    setViewTab(t);
    if (t === "active") {
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 3500);
    } else {
      setPulseActive(false);
    }
  }

  return (
    <div dir="rtl" style={{ background: "#F8FAFC", minHeight: "100%", fontFamily: "'Cairo','Tajawal',sans-serif" }}>
      <style>{`
        @keyframes rowFadeIn {
          from { opacity:0; transform:translateX(10px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmerText {
          0%   { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        @keyframes glowLogo {
          0%,100% { box-shadow: 0 0 0 2px rgba(197,160,89,0.35), 0 4px 20px rgba(0,0,0,0.18); }
          50%     { box-shadow: 0 0 0 3px rgba(197,160,89,0.7), 0 6px 28px rgba(197,160,89,0.25); }
        }
        @keyframes row-pulse-kf {
          0%,100% { background:transparent; }
          40%     { background:rgba(197,160,89,0.06); }
        }
        @keyframes urgBlink {
          0%,100%{opacity:1;}50%{opacity:0.5;}
        }
        .row-pulse { animation: row-pulse-kf 1.1s ease 3 !important; }
      `}</style>

      {/* ═══ HEADER ════════════════════════════════════════════════ */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #E5E7EB",
        padding: "14px 28px",
        display: "flex", alignItems: "center", gap: 16,
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      }}>
        {/* Logo */}
        <div style={{ width: 48, height: 48, borderRadius: 14, overflow: "hidden", flexShrink: 0, animation: "glowLogo 4s ease infinite" }}>
          <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        </div>
        <div>
          <div style={{ fontSize: "0.48rem", fontWeight: 800, letterSpacing: "0.14em", color: GOLD2, marginBottom: 1 }}>
            ALRAWAF CONTRACTING
          </div>
          <div style={{
            fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.02em",
            background: `linear-gradient(120deg, #1F2937, #374151, ${GOLD2})`,
            backgroundSize: "200%",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>لوحة القيادة التنفيذية</div>
          <div style={{ fontSize: "0.6rem", color: "#9CA3AF", marginTop: 1 }}>
            {role ? `${actorName || role} · ${pendingContracts.length} عقد بانتظار قرارك` : "نظام إدارة العقود"}
          </div>
        </div>

        <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {urgentCount > 0 && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 20,
              padding: "5px 13px", fontSize: "0.62rem", fontWeight: 800, color: RED,
              animation: "urgBlink 2.5s ease infinite",
            }}>⚠️ {urgentCount} عاجل</div>
          )}
          {/* Completion chip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#F9FAFB", border: "1px solid #E5E7EB",
            borderRadius: 14, padding: "8px 16px",
          }}>
            <svg width="36" height="36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#E5E7EB" strokeWidth="3.5"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke={GOLD} strokeWidth="3.5"
                strokeDasharray={`${2 * Math.PI * 14}`}
                strokeDashoffset={`${2 * Math.PI * 14 * (1 - completePct / 100)}`}
                strokeLinecap="round" transform="rotate(-90 18 18)"
                style={{ transition: "stroke-dashoffset 1.2s ease", filter: `drop-shadow(0 0 3px rgba(197,160,89,0.5))` }}
              />
              <text x="18" y="22" textAnchor="middle" fill={GOLD2} fontSize="7.5" fontWeight="900" fontFamily="Cairo">{completePct}%</text>
            </svg>
            <div>
              <div style={{ fontSize: "0.64rem", fontWeight: 700, color: "#374151" }}>نسبة الإنجاز</div>
              <div style={{ fontSize: "0.56rem", color: "#9CA3AF" }}>{cDone} من {total} عقد</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ═══ STAT TILES ════════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, animation: "fadeUp 0.4s ease both" }}>
          {TABS.map(t => (
            <StatCard
              key={t.key}
              label={t.label} sub={t.sub} count={t.count} icon={t.icon}
              accent={t.accent} isActive={viewTab === t.key}
              onClick={() => handleTab(t.key)}
            />
          ))}
        </div>

        {/* ═══ STAGE LIST (reference-image style) ════════════════════ */}
        <div style={{
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}>
          {/* Section header */}
          <div style={{
            padding: "16px 24px 14px",
            borderBottom: "1px solid #F3F4F6",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 8, height: 32, borderRadius: 4,
                background: `linear-gradient(180deg, ${tabMeta.color}, ${tabMeta.color}60)`,
              }}/>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#111827" }}>{tabMeta.title}</div>
                <div style={{ fontSize: "0.6rem", color: "#9CA3AF", marginTop: 1 }}>
                  اضغط على أي مرحلة لعرض تفاصيل طلباتها
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {myRoleInfo && (
                <div style={{
                  background: "rgba(197,160,89,0.08)", border: "1px solid rgba(197,160,89,0.2)",
                  borderRadius: 20, padding: "5px 13px",
                  fontSize: "0.62rem", fontWeight: 700, color: GOLD2,
                }}>
                  {myRoleInfo.icon} مرحلتك: {myRoleInfo.stage.map(s => `م${s}`).join("، ")}
                </div>
              )}
              <div style={{
                background: "#F3F4F6", borderRadius: 20, padding: "5px 12px",
                fontSize: "0.6rem", color: "#6B7280", fontWeight: 600,
              }}>
                {maxCount} أعلى عدد
              </div>
            </div>
          </div>

          {/* Rows */}
          <div style={{ padding: "8px 24px 12px" }}>
            {STAGES.map((_, i) => (
              <StageRow
                key={i}
                stageNum={i + 1}
                contracts={contracts}
                maxCount={maxCount}
                isMine={myRoleInfo?.stage.includes(i + 1) ?? false}
                viewTab={viewTab}
                pulseActive={pulseActive}
                onEnter={() => onOpenStage(i + 1)}
                idx={i}
              />
            ))}
          </div>
        </div>

        {/* ═══ ANALYTICS ROW ══════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 1fr", gap: 14, animation: "fadeUp 0.45s ease 0.08s both" }}>

          {/* Bottleneck bars */}
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "13px 18px 11px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 28, borderRadius: 4, background: `linear-gradient(180deg, ${RED}, ${ORANGE_L})` }}/>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#111827" }}>نقاط الاختناق</div>
                <div style={{ fontSize: "0.57rem", color: "#9CA3AF" }}>المراحل الأكثر ضغطاً</div>
              </div>
            </div>
            <div style={{ padding: "12px 18px" }}>
              {bottleneckData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "22px 0", color: "#D1D5DB", fontSize: "0.75rem" }}>لا عقود نشطة</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {bottleneckData.slice(0, 6).map((d, i) => {
                    const p  = (d.count / maxB) * 100;
                    const c  = i === 0 ? RED : i === 1 ? ORANGE : GOLD;
                    return (
                      <div key={d.stageNum} style={{ cursor: "pointer" }} onClick={() => onOpenStage(d.stageNum)}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 900, letterSpacing: "-0.02em", color: c }}>{d.count}</span>
                          <span style={{ fontSize: "0.6rem", fontWeight: 600, color: i === 0 ? RED : "#374151" }}>{d.icon} {d.fullName}</span>
                        </div>
                        <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${p}%`, borderRadius: 99, background: c, boxShadow: i === 0 ? `0 0 8px ${c}60` : "none", transition: "width 0.9s ease" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Donut */}
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "13px 18px 11px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 28, borderRadius: 4, background: `linear-gradient(180deg, ${GOLD}, ${GOLD_END})` }}/>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#111827" }}>توزيع الحالات</div>
            </div>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 90, height: 90, flexShrink: 0 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={26} outerRadius={42} paddingAngle={5} dataKey="value">
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none"/>)}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => [`${v} عقد`, ""]} contentStyle={{ fontFamily: "'Cairo',sans-serif", fontSize: "0.7rem", direction: "rtl", borderRadius: 10, border: "1px solid #E5E7EB" }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#D1D5DB", fontSize: "0.72rem" }}>لا بيانات</div>
                )}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "نشطة",   count: cActive,   color: GOLD    },
                  { label: "مكتملة", count: cDone,     color: GREEN_L },
                  { label: "مرفوضة", count: cRejected, color: RED     },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: item.color }}>{item.count}</span>
                      <span style={{ fontSize: "0.6rem", color: "#6B7280" }}>{item.label}</span>
                    </div>
                    <div style={{ height: 5, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: total > 0 ? `${Math.round(item.count/total*100)}%` : "0%", borderRadius: 99, background: item.color, transition: "width 0.8s ease" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly area chart + urgency */}
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "13px 18px 11px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 28, borderRadius: 4, background: `linear-gradient(180deg, ${GREEN_L}, ${GREEN})` }}/>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#111827" }}>الأداء الأسبوعي</div>
            </div>
            <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <ResponsiveContainer width="100%" height={55}>
                <AreaChart data={areaData} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN_L} stopOpacity={0.25}/>
                      <stop offset="100%" stopColor={GREEN_L} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#9CA3AF", fontFamily: "'Cairo',sans-serif" }} axisLine={false} tickLine={false}/>
                  <Area type="monotone" dataKey="مكتملة" stroke={GREEN_L} strokeWidth={2} fill="url(#aGrad)" dot={{ r: 3, fill: GREEN, stroke: "#fff", strokeWidth: 2 }}/>
                  <Tooltip formatter={(v: unknown) => [`${v} عقد`, ""]} contentStyle={{ fontFamily: "'Cairo',sans-serif", fontSize: "0.7rem", direction: "rtl", borderRadius: 10, border: "1px solid #E5E7EB" }}/>
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "#9CA3AF", marginBottom: 2 }}>🚦 توزيع الأولوية</div>
                {[
                  { label: "عاجل ≥٧ أيام",   count: urgentCount, color: RED     },
                  { label: "تحذير ٣–٧ أيام",  count: warnCount,   color: AMBER   },
                  { label: "طبيعي < ٣ أيام",  count: safeCount,   color: GREEN_L },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.57rem", color: "#6B7280" }}>{item.label}</span>
                    <span style={{
                      minWidth: 24, height: 20, borderRadius: 10,
                      background: item.color + "15", color: item.color,
                      fontSize: "0.62rem", fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 7px",
                    }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ VALUE STRIP ════════════════════════════════════════════ */}
        <div style={{
          background: "linear-gradient(130deg, #0E0B06 0%, #1C1508 50%, #0E0B06 100%)",
          borderRadius: 18, padding: "14px 26px",
          display: "flex", alignItems: "center",
          border: "1px solid rgba(197,160,89,0.22)",
          boxShadow: "0 6px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(197,160,89,0.1)",
          animation: "fadeUp 0.45s ease 0.15s both",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -50, right: "35%", width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(197,160,89,0.06) 0%, transparent 70%)", pointerEvents: "none" }}/>
          {[
            { label: "قيمة العقود النشطة", value: `${formatSAR(totalSAR)} ر.س`, icon: "💰" },
            { label: "الطلبات في المسار",  value: `${cActive} عقد`,             icon: "⚡" },
            { label: "مكتملة الأسبوع",     value: `${completedThisWeek} عقد`,   icon: "📊" },
            { label: "نسبة الإنجاز",        value: `${completePct}%`,            icon: "🎯" },
          ].map((item, i, arr) => (
            <div key={i} style={{
              flex: 1, textAlign: "center",
              borderLeft: i < arr.length - 1 ? "1px solid rgba(197,160,89,0.12)" : "none",
              padding: "0 8px",
            }}>
              <div style={{ fontSize: "0.57rem", color: "rgba(226,194,117,0.5)", marginBottom: 4 }}>{item.icon} {item.label}</div>
              <div style={{
                fontSize: "1.05rem", fontWeight: 900, letterSpacing: "-0.02em",
                background: `linear-gradient(135deg, ${GOLD_END}, ${GOLD})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{item.value}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
