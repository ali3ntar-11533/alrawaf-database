import { useState } from "react";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
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
const GOLD_BOR  = "rgba(197,160,89,0.22)";
const GREEN     = "#22c55e";
const GREEN_D   = "#15803d";
const RED       = "#ef4444";
const RED_D     = "#b91c1c";
const AMBER     = "#f59e0b";
const BLUE      = "#3b82f6";
const BLUE_D    = "#1d4ed8";

// 4 levels with distinctive accent colors
const LEVEL_CONFIG = [
  { label: "إدارة المشروع",          icon: "🏗️", stages: [1, 2, 3],     color: "#2563EB", colorMid: "#3B82F6", colorEnd: "#93C5FD" },
  { label: "التدقيق والتعاقد",       icon: "⚙️", stages: [4, 5, 6, 7], color: "#8B6914", colorMid: GOLD,      colorEnd: GOLD_END  },
  { label: "الاعتمادات العليا",      icon: "🏛️", stages: [8, 9],       color: "#7C3AED", colorMid: "#8B5CF6", colorEnd: "#C4B5FD" },
  { label: "مسؤول التوقيعات",        icon: "📜", stages: [10, 11],     color: "#0F766E", colorMid: "#14B8A6", colorEnd: "#99F6E4" },
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
function urgencyColor(d: number) {
  if (d >= 7) return RED;
  if (d >= 3) return AMBER;
  return GREEN;
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

// ── Level avg-time popup ─────────────────────────────────────────────
function AvgTimePopup({ stages, contracts, accent, onClose }: {
  stages: number[]; contracts: Contract[]; accent: string; onClose: () => void;
}) {
  const levelContracts = contracts.filter(c => stages.includes(c.currentStage) && c.status === "active");
  const avgDays = levelContracts.length > 0
    ? Math.round(levelContracts.reduce((s, c) => s + daysSince(c.updatedAt), 0) / levelContracts.length)
    : 0;
  const perStage = stages.map(s => {
    const sc = contracts.filter(c => c.currentStage === s && c.status === "active");
    const avg = sc.length > 0 ? Math.round(sc.reduce((x, c) => x + daysSince(c.updatedAt), 0) / sc.length) : 0;
    return { stage: s, label: STAGES[s - 1]?.label, icon: STAGES[s - 1]?.icon, avg, count: sc.length };
  });
  return (
    <div style={{
      position: "absolute", top: "100%", right: 0, zIndex: 50, marginTop: 8,
      background: "#fff", borderRadius: 16, border: `1px solid ${accent}25`,
      boxShadow: `0 12px 40px rgba(0,0,0,0.15), 0 4px 16px ${accent}20`,
      padding: "14px 18px", minWidth: 240,
      animation: "fade-up 0.18s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1A1A1A" }}>⏱️ متوسط الوقت في المستوى</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#AAA", fontSize: "0.85rem" }}>✕</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", background: `${accent}0D`, borderRadius: 10 }}>
        <span style={{ fontSize: "1.6rem" }}>⏳</span>
        <div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: urgencyColor(avgDays) }}>{avgDays}</div>
          <div style={{ fontSize: "0.58rem", color: "#888" }}>يوم متوسط لكل عقد في هذا المستوى</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {perStage.map(d => (
          <div key={d.stage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>{d.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.58rem", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                م{d.stage}: {d.label}
              </div>
              <div style={{ height: 4, background: "#F0F0F0", borderRadius: 2, marginTop: 3 }}>
                <div style={{ height: "100%", width: d.avg > 0 ? `${Math.min(100, d.avg * 10)}%` : "5%", borderRadius: 2, background: urgencyColor(d.avg) }}/>
              </div>
            </div>
            <span style={{ fontSize: "0.68rem", fontWeight: 900, color: urgencyColor(d.avg), flexShrink: 0 }}>
              {d.avg > 0 ? `${d.avg}ي` : "—"}
            </span>
            <span style={{ fontSize: "0.55rem", color: "#AAA", flexShrink: 0 }}>({d.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stage Card ────────────────────────────────────────────────────────
function StageCard({
  stageNum, accent, allActive, totalActive, isMine, onOpen
}: {
  stageNum: number; accent: string; allActive: Contract[];
  totalActive: number; isMine: boolean; onOpen: (s: number) => void;
}) {
  const stage = STAGES[stageNum - 1];
  const count = allActive.filter(c => c.currentStage === stageNum).length;
  const pct   = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;

  const urgent = allActive.filter(c => c.currentStage === stageNum && daysSince(c.updatedAt) >= 7).length;
  const warn   = allActive.filter(c => c.currentStage === stageNum && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;

  const badgeColor = urgent > 0 ? RED : warn > 0 ? AMBER : isMine ? GOLD : accent;
  const badgeGlow  = urgent > 0
    ? "rgba(239,68,68,0.55)"
    : warn > 0 ? "rgba(245,158,11,0.55)"
    : isMine ? GOLD_GLOW : `${accent}60`;

  return (
    <div
      onClick={() => onOpen(stageNum)}
      className="stage-card"
      style={{
        flex: "1 1 140px", minWidth: 128, maxWidth: 200,
        borderRadius: 18,
        background: isMine
          ? `linear-gradient(145deg, #FFFEF9, #FFF8E8)`
          : count > 0 ? "#FFFFFF" : "#FAFAFA",
        border: isMine
          ? `1.5px solid ${GOLD_BOR}`
          : count > 0 ? "1px solid #E8E8E8" : "1px solid #F0F0F0",
        boxShadow: isMine
          ? `0 4px 20px rgba(197,160,89,0.18), 0 1px 6px rgba(0,0,0,0.04)`
          : count > 0 ? "0 2px 12px rgba(0,0,0,0.06)" : "none",
        padding: "16px 16px 14px",
        position: "relative", cursor: "pointer", overflow: "hidden",
        transition: "transform 0.16s ease, box-shadow 0.16s ease",
      }}
    >
      {/* Stage icon + number */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: isMine
            ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`
            : count > 0 ? `${accent}18` : "#F0F0F0",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1rem",
          boxShadow: isMine ? `0 3px 12px ${GOLD_GLOW}` : count > 0 ? `0 2px 8px ${accent}22` : "none",
        }}>{stage?.icon ?? "📄"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.52rem", fontWeight: 900, color: isMine ? GOLD2 : count > 0 ? accent : "#BDBDBD", letterSpacing: "0.04em" }}>
            المرحلة {stageNum}
          </div>
          <div style={{
            fontSize: "0.65rem", fontWeight: 800,
            color: count > 0 ? "#1A1A1A" : "#C0C0C0",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            marginTop: 1,
          }}>{stage?.label}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: "0.52rem", color: "#AAAAAA" }}>نسبة من الإجمالي</span>
          <span style={{ fontSize: "0.6rem", fontWeight: 900, color: count > 0 ? accent : "#D0D0D0" }}>
            {pct}%
          </span>
        </div>
        <div style={{ height: 5, background: "#F0F0F0", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 4,
            background: isMine
              ? `linear-gradient(90deg, ${GOLD}, ${GOLD_END})`
              : count > 0 ? `linear-gradient(90deg, ${accent}, ${accent}80)` : "transparent",
            boxShadow: isMine && pct > 0 ? `0 0 6px ${GOLD_GLOW}` : "none",
            transition: "width 0.9s ease",
            minWidth: count > 0 ? 4 : 0,
          }}/>
        </div>
      </div>

      {/* Role label */}
      <div style={{ fontSize: "0.56rem", color: "#B0B0B0", marginBottom: count > 0 ? 4 : 0 }}>
        👤 {stage?.role}
      </div>

      {/* Urgency pills row */}
      {count > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
          {urgent > 0 && (
            <span style={{ fontSize: "0.5rem", fontWeight: 800, color: RED, background: `${RED}12`, border: `1px solid ${RED}22`, borderRadius: 8, padding: "2px 6px" }}>
              ⚠️ {urgent} عاجل
            </span>
          )}
          {warn > 0 && (
            <span style={{ fontSize: "0.5rem", fontWeight: 800, color: AMBER, background: `${AMBER}12`, border: `1px solid ${AMBER}22`, borderRadius: 8, padding: "2px 6px" }}>
              🔔 {warn} تنبيه
            </span>
          )}
          {isMine && (
            <span style={{ fontSize: "0.5rem", fontWeight: 800, color: GOLD2, background: `${GOLD}12`, border: `1px solid ${GOLD_BOR}`, borderRadius: 8, padding: "2px 6px" }}>
              ⭐ مرحلتك
            </span>
          )}
        </div>
      )}

      {/* Glowing count badge (corner) */}
      {count > 0 && (
        <div style={{
          position: "absolute", top: -10, left: -10,
          width: 34, height: 34, borderRadius: "50%",
          background: `linear-gradient(135deg, ${badgeColor}, ${badgeColor}CC)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: count >= 100 ? "0.55rem" : "0.72rem",
          fontWeight: 900, color: "#fff",
          boxShadow: `0 0 0 3px #fff, 0 0 14px ${badgeGlow}, 0 2px 6px rgba(0,0,0,0.15)`,
          border: `2px solid #fff`,
          letterSpacing: "-0.03em",
        }}>{count}</div>
      )}

      {/* "Click to open" hint on hover via CSS class */}
      <div style={{
        position: "absolute", bottom: 6, left: "50%", transform: "translateX(50%)",
        fontSize: "0.42rem", color: count > 0 ? accent : "#DDD", fontWeight: 800,
        opacity: 0.7, letterSpacing: "0.04em",
      }}>اضغط للفتح</div>
    </div>
  );
}

// ── Level Row ────────────────────────────────────────────────────────
function LevelRow({
  lvl, config, contracts, allActive, totalActive, myRoleInfo, onOpenStage
}: {
  lvl: number;
  config: typeof LEVEL_CONFIG[0];
  contracts: Contract[];
  allActive: Contract[];
  totalActive: number;
  myRoleInfo: typeof ROLES[0] | undefined;
  onOpenStage: (s: number) => void;
}) {
  const [showTime, setShowTime] = useState(false);

  const levelTotal   = config.stages.reduce((s, st) => s + allActive.filter(c => c.currentStage === st).length, 0);
  const levelUrgent  = config.stages.reduce((s, st) => s + allActive.filter(c => c.currentStage === st && daysSince(c.updatedAt) >= 7).length, 0);
  const isBottleneck = levelTotal > 0 && config.stages.some(st => {
    const ct = allActive.filter(c => c.currentStage === st).length;
    return ct > 4; // flag if any stage in this level has 4+ contracts
  });

  return (
    <div style={{
      borderRadius: 22,
      border: `1.5px solid ${config.color}15`,
      background: "#FFFFFF",
      boxShadow: `0 4px 24px rgba(0,0,0,0.055), 0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)`,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Subtle logo watermark */}
      <img
        src={logoImg}
        aria-hidden="true"
        style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%,-50%)",
          width: 120, height: 120, objectFit: "contain",
          opacity: 0.03, pointerEvents: "none",
          filter: "grayscale(100%)",
        }}
      />

      {/* Row header */}
      <div style={{
        background: `linear-gradient(90deg, ${config.color}12 0%, ${config.color}06 60%, transparent 100%)`,
        borderBottom: `1.5px solid ${config.color}12`,
        padding: "13px 22px 12px",
        display: "flex", alignItems: "center", gap: 12,
        position: "relative",
      }}>
        {/* Level accent bar */}
        <div style={{ width: 4, height: 40, borderRadius: 3, flexShrink: 0, background: `linear-gradient(180deg, ${config.colorMid}, ${config.color}55)`, boxShadow: `0 0 8px ${config.color}40` }}/>

        {/* Icon + labels */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${config.colorMid}22, ${config.colorEnd}18)`,
          border: `1px solid ${config.color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem",
        }}>{config.icon}</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.54rem", fontWeight: 900, color: config.colorMid, letterSpacing: "0.08em", marginBottom: 2 }}>
            المستوى {lvl + 1} من {LEVEL_CONFIG.length}
          </div>
          <div style={{ fontSize: "0.88rem", fontWeight: 900, color: "#1A1A1A", letterSpacing: "-0.01em" }}>
            {config.label}
          </div>
        </div>

        {/* Right side: badges + hourglass */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
          {levelTotal > 0 && (
            <div style={{
              background: `${config.color}14`, border: `1px solid ${config.color}25`,
              borderRadius: 20, padding: "4px 12px",
              fontSize: "0.62rem", fontWeight: 800, color: config.colorMid,
            }}>{levelTotal} عقد</div>
          )}
          {levelUrgent > 0 && (
            <div style={{
              background: `${RED}10`, border: `1px solid ${RED}20`,
              borderRadius: 20, padding: "4px 10px",
              fontSize: "0.58rem", fontWeight: 800, color: RED,
            }}>⚠️ {levelUrgent} عاجل</div>
          )}
          {isBottleneck && (
            <div style={{
              background: `${RED}10`, border: `1px solid ${RED}20`,
              borderRadius: 20, padding: "4px 10px",
              fontSize: "0.58rem", fontWeight: 800, color: RED,
            }}>🔴 اختناق</div>
          )}
          {/* Hourglass button */}
          <button
            onClick={e => { e.stopPropagation(); setShowTime(v => !v); }}
            title="متوسط الوقت في هذا المستوى"
            style={{
              width: 32, height: 32, borderRadius: "50%", border: `1px solid ${config.color}25`,
              background: showTime ? `${config.color}18` : "#F8F8F8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.85rem", cursor: "pointer",
              transition: "background 0.15s",
              boxShadow: showTime ? `0 0 10px ${config.color}30` : "none",
            }}
          >⏳</button>
          {showTime && (
            <AvgTimePopup
              stages={config.stages}
              contracts={contracts}
              accent={config.colorMid}
              onClose={() => setShowTime(false)}
            />
          )}
        </div>
      </div>

      {/* Stage cards grid */}
      <div style={{ padding: "14px 18px 16px", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {config.stages.map(stageNum => (
          <StageCard
            key={stageNum}
            stageNum={stageNum}
            accent={config.colorMid}
            allActive={allActive}
            totalActive={totalActive}
            isMine={myRoleInfo?.stage.includes(stageNum) ?? false}
            onOpen={onOpenStage}
          />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════════════════════
export default function ContractDashboard({ role, actorName, contracts, pendingContracts, onOpenContract }: Props) {
  const [activeTab,      setActiveTab]      = useState<MetricTab>("all");
  const [slideOverStage, setSlideOverStage] = useState<number | null>(null);

  // ── Aggregates ──────────────────────────────────────────────────
  const total     = contracts.length;
  const cActive   = contracts.filter(c => c.status === "active" && !c.rejectionReason).length;
  const cDone     = contracts.filter(c => c.status === "completed").length;
  const cRejected = contracts.filter(c => !!c.rejectionReason && c.status !== "completed").length;
  const totalSAR  = contracts.filter(c => c.status === "active").reduce((s, c) => s + (c.value || 0), 0);
  const completePct = total > 0 ? Math.round((cDone / total) * 100) : 0;

  const urgentContracts = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warnContracts   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;
  const safeContracts   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) < 3).length;

  // ── Filtered set (used for metric tiles tab) ─────────────────────
  const filtered = (() => {
    if (activeTab === "active")    return contracts.filter(c => c.status === "active" && !c.rejectionReason);
    if (activeTab === "completed") return contracts.filter(c => c.status === "completed");
    if (activeTab === "rejected")  return contracts.filter(c => !!c.rejectionReason && c.status !== "completed");
    return contracts;
  })();
  void filtered; // used by future expansion

  const myRoleInfo = ROLES.find(r => r.name === role);
  // All active contracts (unfiltered) for workflow hub
  const allActive  = contracts.filter(c => c.status === "active");
  const totalActive = allActive.length;

  // ── Analytics ───────────────────────────────────────────────────
  const bottleneckData = STAGES.map((s, i) => ({
    name: s.label.length > 8 ? s.label.slice(0, 8) + "…" : s.label,
    fullName: s.label,
    icon: s.icon,
    stageNum: i + 1,
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

  // ── Metric tiles ────────────────────────────────────────────────
  const TILES = [
    { key: "all" as MetricTab,       label: "إجمالي العقود",   sub: "جميع الحالات",      count: total,     icon: "📁", accent: BLUE,  accentD: BLUE_D  },
    { key: "active" as MetricTab,    label: "الطلبات النشطة",   sub: "قيد التنفيذ الآن",  count: cActive,   icon: "⚡", accent: GOLD,  accentD: GOLD2   },
    { key: "completed" as MetricTab, label: "العقود المكتملة",  sub: "أُنجزت بنجاح",      count: cDone,     icon: "✅", accent: GREEN, accentD: GREEN_D },
    { key: "rejected" as MetricTab,  label: "العقود المرفوضة",  sub: "أُعيدت أو رُفضت",   count: cRejected, icon: "↩", accent: RED,   accentD: RED_D   },
  ];

  const slideOverContracts = slideOverStage !== null
    ? contracts.filter(c => c.currentStage === slideOverStage && c.status !== "completed")
    : [];

  return (
    <div dir="rtl" style={{
      background: "#FFFFFF",
      minHeight: "100%",
      fontFamily: "'Cairo','Tajawal',sans-serif",
    }}>
      <style>{`
        @keyframes glow-gold {
          0%,100% { box-shadow: 0 0 0 3px #fff, 0 0 0 0 ${GOLD_GLOW}; }
          50%      { box-shadow: 0 0 0 3px #fff, 0 0 18px 5px ${GOLD_GLOW}; }
        }
        @keyframes fade-up {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .tile-btn { transition: transform 0.18s ease, box-shadow 0.18s ease; cursor: pointer; }
        .tile-btn:hover { transform: translateY(-4px); }
        .stage-card:hover { transform: translateY(-4px) scale(1.01) !important; box-shadow: 0 8px 28px rgba(0,0,0,0.1) !important; }
        .glass-card {
          background: #ffffff;
          border: 1px solid #F0F0F0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 16px rgba(0,0,0,0.05);
        }
      `}</style>

      {/* ═══ SOVEREIGN HEADER (dark) ════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(120deg, #1C1810 0%, #2E2112 50%, #1C1810 100%)",
        borderBottom: "2px solid rgba(197,160,89,0.35)",
        padding: "18px 30px 16px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position:"absolute", top:-80, left:-80, width:260, height:260, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(197,160,89,0.09) 0%, transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-60, right:60, width:200, height:200, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(226,194,117,0.06) 0%, transparent 70%)", pointerEvents:"none" }}/>

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
              <div style={{
                background:"rgba(239,68,68,0.18)", border:"1px solid rgba(239,68,68,0.3)",
                borderRadius:20, padding:"6px 14px",
                fontSize:"0.65rem", fontWeight:800, color:"#FCA5A5",
                display:"flex", alignItems:"center", gap:5,
              }}>⚠️ {urgentContracts} عقد عاجل</div>
            )}
            <div style={{
              display:"flex", alignItems:"center", gap:10,
              background:"rgba(255,255,255,0.07)", border:"1px solid rgba(197,160,89,0.2)",
              borderRadius:14, padding:"10px 18px", backdropFilter:"blur(10px)",
            }}>
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
                </div>
                <div style={{ fontSize:"2.1rem", fontWeight:900, lineHeight:1, color: on ? tile.accentD : "#1A1A1A", letterSpacing:"-0.03em" }}>{tile.count}</div>
                <div style={{ fontSize:"0.72rem", fontWeight:700, color: on ? tile.accentD : "#555", marginTop:5 }}>{tile.label}</div>
                <div style={{ fontSize:"0.6rem", color: on ? `${tile.accent}CC` : "#BBB", marginTop:2 }}>{tile.sub}</div>
              </div>
            );
          })}
        </div>

        {/* ═══ WORKFLOW HUB — Stacked Data-Driven Rows ═══════════════ */}
        <div style={{
          borderRadius:24, overflow:"hidden",
          border:"1px solid #F0F0F0",
          boxShadow:"0 4px 30px rgba(0,0,0,0.045)",
          background:"#FAFAFA",
        }}>
          {/* Hub header */}
          <div style={{
            padding:"15px 24px",
            background:"linear-gradient(90deg, #FBF9F4 0%, #F5EDD8 100%)",
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
              <div style={{ fontSize:"0.9rem", fontWeight:900, color:"#1A1108", letterSpacing:"-0.01em" }}>
                خريطة دورة حياة العقد
              </div>
              <div style={{ fontSize:"0.6rem", color:"#9b8060", marginTop:1 }}>
                {STAGES.length} مرحلة · {LEVEL_CONFIG.length} مستويات إدارية · اضغط أي مرحلة لفتح لوحة عقودها
              </div>
            </div>
            {myRoleInfo && (
              <div style={{
                marginRight:"auto",
                background:`rgba(197,160,89,0.08)`, border:`1px solid ${GOLD_BOR}`,
                borderRadius:12, padding:"6px 14px",
                fontSize:"0.66rem", fontWeight:800, color:"#7A5C10",
                display:"flex", alignItems:"center", gap:6,
              }}>
                {myRoleInfo.icon} مرحلتك: {myRoleInfo.stage.map(s => `م${s}`).join("، ")}
              </div>
            )}
          </div>

          {/* Level rows */}
          <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>
            {LEVEL_CONFIG.map((config, lvlIdx) => (
              <LevelRow
                key={lvlIdx}
                lvl={lvlIdx}
                config={config}
                contracts={contracts}
                allActive={allActive}
                totalActive={totalActive}
                myRoleInfo={myRoleInfo}
                onOpenStage={setSlideOverStage}
              />
            ))}
          </div>
        </div>

        {/* ═══ ADVANCED ANALYTICS ════════════════════════════════════ */}
        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr", gap:14 }}>

          {/* Bottleneck */}
          <div className="glass-card">
            <div style={{ padding:"13px 18px 12px", borderBottom:"1px solid #F5F5F5", background:"linear-gradient(90deg, #FBF9F4, transparent)", display:"flex", alignItems:"center", gap:8 }}>
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
                      <div key={d.stageNum} style={{ cursor:"pointer" }} onClick={() => setSlideOverStage(d.stageNum)}>
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

          {/* Weekly performance */}
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
              <div style={{ borderTop:"1px solid #F5F5F5", paddingTop:10, display:"flex", flexDirection:"column", gap:5 }}>
                <div style={{ fontSize:"0.6rem", fontWeight:800, color:"#888", marginBottom:2 }}>🚦 توزيع الأولوية</div>
                {[
                  { label:"عاجل (≥٧ أيام)",   count:urgentContracts, color:RED   },
                  { label:"تحذير (٣-٧ أيام)",  count:warnContracts,   color:AMBER },
                  { label:"طبيعي (< ٣ أيام)",  count:safeContracts,   color:GREEN },
                ].map((item, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"0.58rem", color:"#666" }}>{item.label}</span>
                    <span style={{
                      minWidth:22, height:20, borderRadius:10,
                      background:`${item.color}14`, color:item.color,
                      fontSize:"0.6rem", fontWeight:900,
                      display:"flex", alignItems:"center", justifyContent:"center", padding:"0 7px",
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
          border:"1px solid rgba(197,160,89,0.22)",
          boxShadow:"0 8px 30px rgba(0,0,0,0.15), inset 0 1px 0 rgba(197,160,89,0.12)",
          position:"relative", overflow:"hidden",
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
