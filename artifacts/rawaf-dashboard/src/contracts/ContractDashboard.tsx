import { useState, useEffect, useRef, useMemo } from "react";
import { PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ROLES, STAGES } from "./types";
import type { Contract } from "./types";
import logoImg from "@assets/logo_1776506524686.jpg";

/* ── Design tokens ─────────────────────────────────────────── */
const GOLD      = "#C5A059";
const GOLD2     = "#a88540";
const GOLD_END  = "#E2C275";
const GREEN     = "#16a34a";
const GREEN_L   = "#22c55e";
const RED       = "#dc2626";
const AMBER     = "#F5A623";
const BLUE      = "#1565C0";
const BLUE_M    = "#1976D2";
const BLUE_L    = "#4A90D9";
const DARK      = "#0C1427";
const DARK2     = "#152040";
const GLASS     = "rgba(255,255,255,0.97)";
const GLASS_B   = "rgba(255,255,255,0.85)";
const G_BORDER  = "rgba(197,160,89,0.14)";
const SLIDE_BG  = "#FFFFFF";

/* ── Stage display — synced with STAGES in types.ts ────────── */
const DASH_STAGES = [
  { label: STAGES[0].label,  sub: STAGES[0].role,   stageNums: [1]      },
  { label: STAGES[1].label,  sub: STAGES[1].role,   stageNums: [2]      },
  { label: STAGES[2].label,  sub: STAGES[2].role,   stageNums: [3]      },
  { label: STAGES[3].label,  sub: STAGES[3].role,   stageNums: [4]      },
  { label: STAGES[4].label,  sub: STAGES[4].role,   stageNums: [5]      },
  { label: STAGES[5].label,  sub: STAGES[5].role,   stageNums: [6]      },
  { label: STAGES[6].label,  sub: STAGES[6].role,   stageNums: [7]      },
  { label: STAGES[7].label,  sub: STAGES[7].role,   stageNums: [8]      },
  { label: STAGES[8].label,  sub: STAGES[8].role,   stageNums: [9]      },
  { label: STAGES[9].label, sub: STAGES[9].role, stageNums: [10] },
];

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function formatSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ألف`;
  return `${n}`;
}

type ViewMode = "overview" | "all" | "active" | "completed" | "rejected";

interface Props {
  role: string;
  actorName: string;
  contracts: Contract[];
  pendingContracts: Contract[];
  onOpenContract: (id: number) => void;
  onOpenStage: (stageNum: number) => void;
}

/* ── Animated counter ──────────────────────────────────────── */
function AnimCount({ value }: { value: number }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current, to = value;
    if (from === to) return;
    const dur = Math.min(800, Math.abs(to - from) * 30 + 200);
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
  return <>{v}</>;
}

/* ── Completion pulse strip ────────────────────────────────── */
function PulseWave({ pct, active, done, total }: { pct: number; active: number; done: number; total: number }) {
  const W = 150, H = 36, amp = 7, λ = 40;
  const pts = Array.from({ length: 160 }, (_, i) => {
    const x = (i * (W * 2)) / 159;
    const y = H / 2 - amp * Math.sin((2 * Math.PI * x) / λ);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  const BG = "#F8FBFF";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: `linear-gradient(120deg,${BG} 0%,#EFF5FF 60%,${BG} 100%)`,
      border: `1px solid rgba(25,118,210,0.16)`, borderRadius: 14, padding: "7px 14px 7px 10px",
      boxShadow: "0 2px 12px rgba(25,118,210,0.08)", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "relative", width: W, height: H, overflow: "hidden", flexShrink: 0 }}>
        <svg width={W * 2} height={H} style={{ position: "absolute", left: 0, animation: "pulseWaveScroll 3.2s linear infinite" }}>
          <defs>
            <linearGradient id="wGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={BLUE_M} stopOpacity="0"/>
              <stop offset="30%"  stopColor={BLUE_M} stopOpacity="0.30"/>
              <stop offset="70%"  stopColor={BLUE_L}  stopOpacity="0.30"/>
              <stop offset="100%" stopColor={BLUE_M} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <line x1="0" y1={H/2} x2={W*2} y2={H/2} stroke="rgba(25,118,210,0.1)" strokeWidth="1"/>
          <path d={pts} fill="none" stroke="url(#wGrad)" strokeWidth="1.4"/>
        </svg>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,${BG} 0%,transparent 22%,transparent 78%,${BG} 100%)`, pointerEvents: "none" }}/>
        <div style={{ position: "absolute", top: "50%", right: 6, transform: "translateY(-50%)", width: 3, height: 3, borderRadius: "50%", background: BLUE_M, opacity: 0.5, animation: "pulseDot 2.2s ease-in-out infinite" }}/>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
        <div style={{ fontSize: "0.38rem", color: "rgba(25,118,210,0.50)", letterSpacing: "0.1em", fontWeight: 700 }}>COMPLETION</div>
        <div style={{ fontSize: "1.45rem", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: BLUE }}>
          <AnimCount value={pct}/><span style={{ fontSize: "0.7rem" }}>%</span>
        </div>
        <div style={{ fontSize: "0.4rem", color: "rgba(25,118,210,0.40)" }}>{done}/{total}</div>
      </div>
      <div style={{ width: 1, height: 26, background: "rgba(25,118,210,0.15)", flexShrink: 0 }}/>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
        <div style={{ fontSize: "0.38rem", color: "rgba(25,118,210,0.50)", letterSpacing: "0.1em", fontWeight: 700 }}>ACTIVE</div>
        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: BLUE_M, letterSpacing: "-0.03em", lineHeight: 1 }}>
          <AnimCount value={active}/>
        </div>
        <div style={{ fontSize: "0.4rem", color: "rgba(25,118,210,0.40)" }}>نشط</div>
      </div>
    </div>
  );
}

/* ── Smart Folder Card ─────────────────────────────────────── */
function FolderCard({ label, sub, count, accent, onClick }: {
  label: string; sub: string; count: number;
  accent: string; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 18, overflow: "hidden",
        background: GLASS,
        backdropFilter: "blur(20px)",
        border: `1.5px solid ${hov ? accent + "40" : "rgba(0,0,0,0.06)"}`,
        boxShadow: hov
          ? `0 16px 48px ${accent}22, 0 4px 16px rgba(0,0,0,0.08)`
          : "0 4px 16px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.04)",
        cursor: "pointer", position: "relative",
        transform: hov ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* Top color band — slide style */}
      <div style={{
        height: hov ? 5 : 4,
        background: `linear-gradient(90deg, ${accent}, ${accent}BB)`,
        transition: "height 0.2s",
      }}/>
      <div style={{ padding: "14px 18px 16px" }}>
        <div style={{ fontSize: "0.56rem", fontWeight: 700, color: hov ? accent : "#9CA3AF", letterSpacing: "0.03em", transition: "color 0.2s", marginBottom: 6 }}>
          {sub}
        </div>
        <div style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, color: hov ? accent : "#111827", transition: "color 0.2s" }}>
          <AnimCount value={count}/>
        </div>
        <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#374151", marginTop: 5 }}>{label}</div>
        {/* Small decorative accent square — slide-style */}
        <div style={{
          position: "absolute", bottom: 12, left: 14,
          width: 8, height: 8, borderRadius: 2,
          background: hov ? accent : accent + "30",
          transition: "background 0.2s",
        }}/>
      </div>
    </div>
  );
}

/* ── Elite Stage Row ───────────────────────────────────────── */
type DashStage = typeof DASH_STAGES[number];

function EliteStageRow({ stage, contracts, maxCount, isMine, onEnter, idx }: {
  stage: DashStage; contracts: Contract[]; maxCount: number;
  isMine: boolean; onEnter: () => void; idx: number;
}) {
  const [hov, setHov] = useState(false);

  const active  = contracts.filter(c => stage.stageNums.includes(c.currentStage) && c.status === "active").length;
  const done    = contracts.filter(c => stage.stageNums.includes(c.currentStage) && c.status === "completed").length;
  const urgent  = contracts.filter(c => stage.stageNums.includes(c.currentStage) && c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warn    = contracts.filter(c => stage.stageNums.includes(c.currentStage) && c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;

  const pct      = maxCount > 0 ? (active / maxCount) * 100 : 0;
  const isEmpty  = active === 0;
  const barColor = urgent > 0 ? RED : warn > 0 ? AMBER : pct >= 60 ? GREEN_L : pct >= 25 ? BLUE_L : active > 0 ? GOLD : "#E5E7EB";
  const numColor = isEmpty ? "#D1D5DB" : urgent > 0 ? RED : warn > 0 ? AMBER : BLUE;
  const isFinal  = stage.stageNums.some(n => n >= 10);
  const isTop    = stage.stageNums.some(n => n >= 9);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => !isEmpty && onEnter()}
      style={{
        display: "flex", alignItems: "center", gap: 0,
        padding: "8px 0",
        borderBottom: isFinal ? "none" : "1px solid rgba(0,0,0,0.042)",
        cursor: isEmpty ? "default" : "pointer",
        background: hov && !isEmpty
          ? isMine ? "rgba(197,160,89,0.07)" : isTop ? "rgba(37,99,235,0.04)" : "#FAFAFA"
          : "transparent",
        borderRadius: 10,
        transition: "background 0.15s",
        animation: `rowFadeIn 0.4s ease ${idx * 0.022}s both`,
        opacity: isEmpty ? 0.35 : 1,
      }}
    >
      {/* Rank bar */}
      <div style={{
        width: 4, height: isEmpty ? 14 : 24, borderRadius: 2, marginLeft: 4, flexShrink: 0,
        background: isEmpty ? "#E5E7EB"
          : isFinal ? `linear-gradient(180deg,${GOLD_END},${GOLD})`
          : isTop ? `linear-gradient(180deg,${BLUE_L},${BLUE})`
          : barColor,
        boxShadow: !isEmpty && isFinal ? `0 0 8px rgba(197,160,89,0.45)` : "none",
        transition: "all 0.2s",
      }}/>

      {/* Count */}
      <div style={{
        width: 46, flexShrink: 0, textAlign: "left", paddingRight: 4, paddingLeft: 8,
        fontSize: active >= 10 ? "1.45rem" : "1.75rem",
        fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: numColor,
      }}>
        <AnimCount value={active}/>
      </div>

      {/* Progress bar */}
      <div style={{ flex: 1, padding: "0 10px 0 6px" }}>
        <div style={{ height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: pct > 0 ? `${Math.max(pct, 4)}%` : "0%",
            borderRadius: 99,
            background: isEmpty ? "transparent"
              : isFinal ? `linear-gradient(90deg,${GOLD},${GOLD_END})`
              : barColor,
            boxShadow: pct > 0 && !isEmpty ? `0 0 8px ${barColor}55` : "none",
            transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
          }}/>
        </div>
        {(urgent > 0 || warn > 0 || done > 0) && (
          <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
            {urgent > 0 && (
              <span style={{ fontSize: "0.46rem", fontWeight: 900, color: RED, background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.18)", borderRadius: 20, padding: "1px 7px" }}>
                {urgent} عاجل
              </span>
            )}
            {warn > 0 && (
              <span style={{ fontSize: "0.46rem", fontWeight: 900, color: AMBER, background: "#FFFBEB", border: "1px solid rgba(217,119,6,0.18)", borderRadius: 20, padding: "1px 7px" }}>
                {warn} تنبيه
              </span>
            )}
            {done > 0 && (
              <span style={{ fontSize: "0.46rem", fontWeight: 700, color: GREEN, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.18)", borderRadius: 20, padding: "1px 7px" }}>
                {done} مكتمل
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stage label */}
      <div style={{ width: 210, flexShrink: 0, textAlign: "right", paddingRight: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          {isMine && (
            <span style={{
              fontSize: "0.44rem", fontWeight: 900, color: GOLD2,
              background: "rgba(197,160,89,0.1)", border: "1px solid rgba(197,160,89,0.28)",
              borderRadius: 20, padding: "1px 7px", whiteSpace: "nowrap",
            }}>مرحلتك</span>
          )}
          <span style={{ fontSize: "0.82rem", fontWeight: 800, color: isEmpty ? "#C9CDD4" : isFinal ? GOLD2 : "#1F2937" }}>{stage.label}</span>
        </div>
        <div style={{ fontSize: "0.52rem", color: "#B0B8C4", marginTop: 1 }}>{stage.sub}</div>
      </div>
    </div>
  );
}

/* ── Contract Data Table ───────────────────────────────────── */
function ContractDataTable({ contracts, mode, onOpenContract, onBack }: {
  contracts: Contract[];
  mode: ViewMode;
  onOpenContract: (id: number) => void;
  onBack: () => void;
}) {
  const [search, setSearch]     = useState("");
  const [vendor, setVendor]     = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [valMin, setValMin]     = useState("");
  const [valMax, setValMax]     = useState("");
  const [sortBy, setSortBy]     = useState<"date"|"value"|"stage"|"no">("date");
  const [sortDir, setSortDir]   = useState<"desc"|"asc">("desc");

  const METAS: Record<ViewMode, { label: string; accent: string }> = {
    overview:  { label: "جميع العقود",    accent: BLUE  },
    all:       { label: "جميع العقود",    accent: BLUE  },
    active:    { label: "الطلبات النشطة", accent: GOLD  },
    completed: { label: "العقود المكتملة",accent: GREEN },
    rejected:  { label: "العقود المرفوضة",accent: RED   },
  };
  const meta = METAS[mode];

  const base = useMemo(() => {
    if (mode === "active")    return contracts.filter(c => c.status === "active" && !c.rejectionReason);
    if (mode === "completed") return contracts.filter(c => c.status === "completed");
    if (mode === "rejected")  return contracts.filter(c => !!c.rejectionReason && c.status !== "completed");
    return contracts;
  }, [contracts, mode]);

  const filtered = useMemo(() => {
    let list = base;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q) || c.contractNo.toLowerCase().includes(q) || c.vendorName.toLowerCase().includes(q));
    }
    if (vendor.trim()) list = list.filter(c => c.vendorName.includes(vendor.trim()));
    if (dateFrom)      list = list.filter(c => c.createdAt >= dateFrom);
    if (dateTo)        list = list.filter(c => c.createdAt <= dateTo + "T23:59:59");
    if (valMin)        list = list.filter(c => (c.value || 0) >= Number(valMin));
    if (valMax)        list = list.filter(c => (c.value || 0) <= Number(valMax));
    return [...list].sort((a, b) => {
      let d = 0;
      if (sortBy === "date")  d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "value") d = (a.value || 0) - (b.value || 0);
      if (sortBy === "stage") d = a.currentStage - b.currentStage;
      if (sortBy === "no")    d = a.contractNo.localeCompare(b.contractNo);
      return sortDir === "asc" ? d : -d;
    });
  }, [base, search, vendor, dateFrom, dateTo, valMin, valMax, sortBy, sortDir]);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  const inp: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${G_BORDER}`,
    background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
    fontSize: "0.72rem", fontFamily: "'Cairo','Tajawal',sans-serif",
    outline: "none", color: "#374151",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{ animation: "fadeUp 0.28s ease both" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 0 18px" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 18px", borderRadius: 11,
            border: `1.5px solid ${G_BORDER}`,
            background: GLASS, backdropFilter: "blur(10px)",
            cursor: "pointer", fontSize: "0.76rem", fontWeight: 700,
            fontFamily: "'Cairo','Tajawal',sans-serif", color: "#374151",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.15s",
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = meta.accent; el.style.color = meta.accent; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = G_BORDER; el.style.color = "#374151"; }}
        >رجوع للوحة</button>
        <div style={{ width: 1, height: 22, background: G_BORDER }}/>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: meta.accent, boxShadow: `0 0 0 3px ${meta.accent}28` }}/>
        <span style={{ fontSize: "1rem", fontWeight: 900, color: "#111827" }}>{meta.label}</span>
        <span style={{ padding: "3px 12px", borderRadius: 20, background: meta.accent + "18", color: meta.accent, fontSize: "0.68rem", fontWeight: 800, border: `1px solid ${meta.accent}30` }}>
          {filtered.length} عقد
        </span>
      </div>

      {/* Filters */}
      <div style={{
        background: GLASS, backdropFilter: "blur(14px)",
        borderRadius: 18, padding: "16px 18px", marginBottom: 14,
        border: `1px solid ${G_BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#9CA3AF", marginBottom: 10, letterSpacing: "0.06em" }}>بحث وتصفية</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 10 }}>
          <input style={inp} placeholder="بحث فوري: العنوان، الرقم، المقاول..." value={search} onChange={e => setSearch(e.target.value)}/>
          <input style={inp} placeholder="اسم المقاول" value={vendor} onChange={e => setVendor(e.target.value)}/>
          <input type="date" style={inp} value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
          <input type="date" style={inp} value={dateTo} onChange={e => setDateTo(e.target.value)}/>
          <input type="number" style={inp} placeholder="قيمة من" value={valMin} onChange={e => setValMin(e.target.value)}/>
          <input type="number" style={inp} placeholder="قيمة إلى" value={valMax} onChange={e => setValMax(e.target.value)}/>
        </div>
        {(search || vendor || dateFrom || dateTo || valMin || valMax) && (
          <button
            onClick={() => { setSearch(""); setVendor(""); setDateFrom(""); setDateTo(""); setValMin(""); setValMax(""); }}
            style={{ marginTop: 10, padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.22)", background: "rgba(220,38,38,0.05)", cursor: "pointer", fontSize: "0.63rem", color: RED, fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif" }}
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: GLASS, backdropFilter: "blur(14px)",
        borderRadius: 18, border: `1px solid ${G_BORDER}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.74rem" }}>
          <thead>
            <tr style={{ background: "rgba(249,250,251,0.95)", borderBottom: `1.5px solid ${G_BORDER}` }}>
              {([
                { l: "رقم العقد",     c: "no"    as const },
                { l: "عنوان المشروع", c: null },
                { l: "المقاول",       c: null },
                { l: "المرحلة",       c: "stage" as const },
                { l: "الحالة",        c: null },
                { l: "القيمة",        c: "value" as const },
                { l: "تاريخ الإنشاء", c: "date"  as const },
                { l: "",              c: null },
              ]).map(({ l, c }, i) => (
                <th
                  key={i}
                  onClick={c ? () => toggleSort(c) : undefined}
                  style={{ padding: "11px 14px", textAlign: "right", fontWeight: 800, color: "#374151", fontSize: "0.67rem", cursor: c ? "pointer" : "default", whiteSpace: "nowrap", userSelect: "none" }}
                >
                  {l}
                  {c && (
                    <span style={{ marginRight: 4, color: sortBy === c ? meta.accent : "#D1D5DB", fontSize: "0.58rem" }}>
                      {sortBy === c ? (sortDir === "asc" ? "صعود" : "هبوط") : "·"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#9CA3AF", fontSize: "0.82rem" }}>لا توجد عقود مطابقة</td></tr>
            ) : filtered.map((c, i) => {
              const stg = STAGES[c.currentStage - 1];
              const isRej  = !!c.rejectionReason && c.status !== "completed";
              const isDone = c.status === "completed";
              const sc = isDone ? GREEN_L : isRej ? RED : GOLD;
              const sl = isDone ? "مكتملة" : isRej ? "مرفوضة" : "نشطة";
              return (
                <tr
                  key={c.id}
                  onClick={() => onOpenContract(c.id)}
                  style={{ borderBottom: "1px solid #F3F4F6", background: i % 2 === 0 ? "rgba(255,255,255,0.8)" : "rgba(249,250,251,0.5)", transition: "background 0.15s", cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = meta.accent + "12"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "rgba(255,255,255,0.8)" : "rgba(249,250,251,0.5)"; }}
                >
                  <td style={{ padding: "10px 14px", fontWeight: 800, color: "#374151", whiteSpace: "nowrap" }}>{c.contractNo}</td>
                  <td style={{ padding: "10px 14px", maxWidth: 190 }}>
                    <div style={{ fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    <div style={{ fontSize: "0.58rem", color: "#9CA3AF" }}>{c.projectName}</div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#374151" }}>{c.vendorName}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    <span style={{ padding: "2px 9px", borderRadius: 20, background: "rgba(197,160,89,0.1)", color: GOLD2, border: "1px solid rgba(197,160,89,0.22)", fontSize: "0.62rem", fontWeight: 700 }}>
                      م{c.currentStage} — {stg?.label ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ padding: "2px 10px", borderRadius: 20, background: sc + "18", color: sc, fontSize: "0.62rem", fontWeight: 800, border: `1px solid ${sc}28` }}>{sl}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1F2937", whiteSpace: "nowrap" }}>{c.value ? `${formatSAR(c.value)} ر.س` : "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#9CA3AF", fontSize: "0.66rem", whiteSpace: "nowrap" }}>{new Date(c.createdAt).toLocaleDateString("ar-SA")}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.accent, opacity: 0.5, margin: "0 auto" }}/>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function ContractDashboard({ role, actorName, contracts, pendingContracts, onOpenContract, onOpenStage }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  const total     = contracts.length;
  const cActive   = contracts.filter(c => c.status === "active" && !c.rejectionReason).length;
  const cDone     = contracts.filter(c => c.status === "completed").length;
  const cRej      = contracts.filter(c => !!c.rejectionReason && c.status !== "completed").length;
  const completePct = total > 0 ? Math.round((cDone / total) * 100) : 0;

  const urgentCount = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warnCount   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;
  const safeCount   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) < 3).length;
  const completedThisWeek = contracts.filter(c => c.status === "completed" && daysSince(c.updatedAt) <= 7).length;
  const completedLastWeek = contracts.filter(c => c.status === "completed" && daysSince(c.updatedAt) > 7 && daysSince(c.updatedAt) <= 14).length;

  const avgCycle = useMemo(() => {
    const done = contracts.filter(c => c.status === "completed");
    if (!done.length) return 0;
    return Math.round(done.reduce((s, c) => s + Math.max(0, Math.floor((new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / 86400000)), 0) / done.length);
  }, [contracts]);

  const myRoleInfo    = ROLES.find(r => r.name === role);
  const maxCount      = Math.max(...DASH_STAGES.map(s => contracts.filter(c => s.stageNums.includes(c.currentStage) && c.status === "active").length), 1);
  const reversedStages = [...DASH_STAGES].reverse();

  const pieData = [
    { name: "نشطة",   value: cActive, color: GOLD    },
    { name: "مكتملة", value: cDone,   color: GREEN_L },
    { name: "مرفوضة", value: cRej,    color: RED     },
  ].filter(d => d.value > 0);

  const areaData = [
    { name: "الأسبوع الماضي", مكتملة: completedLastWeek  },
    { name: "هذا الأسبوع",    مكتملة: completedThisWeek },
  ];

  const FOLDERS = [
    { key: "all"       as ViewMode, label: "إجمالي العقود",   sub: "جميع الحالات",     count: total,   accent: BLUE_M },
    { key: "active"    as ViewMode, label: "الطلبات النشطة",  sub: "قيد التنفيذ",       count: cActive, accent: AMBER  },
    { key: "completed" as ViewMode, label: "العقود المكتملة", sub: "أُنجزت بنجاح",     count: cDone,   accent: GREEN  },
    { key: "rejected"  as ViewMode, label: "العقود المرفوضة", sub: "مرفوضة أو معادة",  count: cRej,    accent: RED    },
  ];

  return (
    <div dir="rtl" style={{ background: SLIDE_BG, minHeight: "100%", fontFamily: "'Cairo','Tajawal',sans-serif" }}>
      <style>{`
        @keyframes rowFadeIn { from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(14px);filter:blur(2px)}to{opacity:1;transform:translateY(0);filter:blur(0)} }
        @keyframes glowLogo  { 0%,100%{box-shadow:0 0 0 2px rgba(197,160,89,0.32),0 4px 20px rgba(0,0,0,0.14)} 50%{box-shadow:0 0 0 3px rgba(197,160,89,0.58),0 6px 28px rgba(197,160,89,0.22)} }
        @keyframes urgBlink  { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes pulseWaveScroll { from{transform:translateX(0)} to{transform:translateX(-220px)} }
        @keyframes pulseDot  { 0%,100%{opacity:1;transform:translateY(-50%) scale(1)} 50%{opacity:0.5;transform:translateY(-50%) scale(1.5)} }
        @keyframes cardBreath{ 0%,100%{box-shadow:0 4px 24px rgba(0,0,0,0.05)} 50%{box-shadow:0 8px 36px rgba(25,118,210,0.10)} }
        @keyframes topLineGlow{ 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes slideDecor{ 0%,100%{opacity:0.35;transform:scale(1)} 50%{opacity:0.55;transform:scale(1.08)} }
      `}</style>

      {/* ═══ HEADER ═══════════════════════════════════════════════ */}
      <div style={{
        background: GLASS, backdropFilter: "blur(24px)",
        borderBottom: `1px solid rgba(0,0,0,0.07)`,
        padding: "0 28px",
        display: "flex", alignItems: "stretch", gap: 0,
        boxShadow: "0 2px 20px rgba(0,0,0,0.06)",
        position: "sticky", top: 0, zIndex: 30,
        overflow: "hidden",
      }}>
        {/* Left accent bar — blue-to-amber slide colors */}
        <div style={{ width: 5, background: `linear-gradient(180deg,${BLUE_M},${BLUE_L},${AMBER})`, flexShrink: 0, animation: "topLineGlow 4s ease infinite" }}/>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, padding: "13px 0 13px 0", paddingRight: 20 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, overflow: "hidden", flexShrink: 0, animation: "glowLogo 4s ease infinite" }}>
            <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          </div>
          <div>
            <div style={{ fontSize: "0.44rem", fontWeight: 900, letterSpacing: "0.16em", color: BLUE_M, marginBottom: 2 }}>ALRAWAF CONTRACTING</div>
            <div style={{ fontSize: "1.16rem", fontWeight: 900, letterSpacing: "-0.025em", color: DARK }}>
              لوحة القيادة التنفيذية
            </div>
            <div style={{ fontSize: "0.55rem", color: "#64748B", marginTop: 1 }}>
              {role ? `${actorName || role} · ${pendingContracts.length} عقد بانتظار قرارك` : "نظام إدارة العقود — رؤية 2030"}
            </div>
          </div>

          <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {urgentCount > 0 && (
              <div style={{
                background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.28)",
                borderRadius: 20, padding: "5px 14px",
                fontSize: "0.62rem", fontWeight: 900, color: RED,
                animation: "urgBlink 2s ease infinite",
                boxShadow: "0 2px 8px rgba(220,38,38,0.12)",
              }}>
                {urgentCount} عاجل
              </div>
            )}
            <PulseWave pct={completePct} active={cActive} done={cDone} total={total}/>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {viewMode !== "overview" ? (
          <ContractDataTable contracts={contracts} mode={viewMode} onOpenContract={onOpenContract} onBack={() => setViewMode("overview")}/>
        ) : (
          <>
            {/* ── Folder Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, animation: "fadeUp 0.38s ease both" }}>
              {FOLDERS.map(f => (
                <FolderCard key={f.key} label={f.label} sub={f.sub} count={f.count} accent={f.accent} onClick={() => setViewMode(f.key)}/>
              ))}
            </div>

            {/* ── Workflow stages ── */}
            <div style={{
              background: GLASS,
              border: `1px solid rgba(0,0,0,0.07)`, borderRadius: 22,
              boxShadow: "0 6px 28px rgba(0,0,0,0.06)",
              animation: "fadeUp 0.4s ease 0.06s both",
              overflow: "hidden",
            }}>
              {/* Blue band header — slide style */}
              <div style={{
                padding: "16px 24px 15px",
                background: `linear-gradient(135deg, ${BLUE_M} 0%, ${BLUE} 50%, #0D47A1 100%)`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                position: "relative", overflow: "hidden",
              }}>
                {/* Decorative amber square — slide element */}
                <div style={{
                  position: "absolute", top: 8, left: 16,
                  width: 12, height: 12, borderRadius: 3,
                  background: AMBER, animation: "slideDecor 4s ease infinite",
                }}/>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 4, height: 32, borderRadius: 2, background: `linear-gradient(180deg,${AMBER},rgba(245,166,35,0.4))` }}/>
                  <div>
                    <div style={{ fontSize: "0.96rem", fontWeight: 900, color: "#FFFFFF" }}>مسار العقود — الهيكل التنظيمي الوظيفي</div>
                    <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>11 مرحلة تصاعدياً · انقر على المرحلة للتفاصيل الكاملة</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {myRoleInfo && (
                    <div style={{
                      background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                      borderRadius: 20, padding: "5px 14px",
                      fontSize: "0.6rem", fontWeight: 800, color: "#FFFFFF",
                    }}>
                      مرحلتك: {myRoleInfo.stage.map(s => `م${s}`).join("، ")}
                    </div>
                  )}
                  <div style={{
                    background: AMBER, borderRadius: 20, padding: "5px 12px",
                    fontSize: "0.58rem", color: "#1A1A1A", fontWeight: 800,
                  }}>{maxCount} أعلى عدد</div>
                </div>
              </div>
              <div style={{ padding: "8px 22px 14px" }}>
                {reversedStages.map((stage, idx) => (
                  <EliteStageRow
                    key={stage.stageNums[0]}
                    stage={stage}
                    contracts={contracts}
                    maxCount={maxCount}
                    isMine={stage.stageNums.some(n => myRoleInfo?.stage.includes(n) ?? false)}
                    onEnter={() => onOpenStage(stage.stageNums[0])}
                    idx={idx}
                  />
                ))}
              </div>
            </div>

            {/* ── Analytics Row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, animation: "fadeUp 0.4s ease 0.1s both" }}>

              {/* Pie chart */}
              <div style={{ background: GLASS, backdropFilter: "blur(16px)", border: `1px solid rgba(0,0,0,0.06)`, borderRadius: 22, overflow: "hidden", boxShadow: "0 6px 28px rgba(0,0,0,0.05)", animation: "cardBreath 6s ease infinite" }}>
                <div style={{ height: 4, background: `linear-gradient(90deg,${BLUE_M},${BLUE_L})` }}/>
                <div style={{ padding: "14px 20px 12px", borderBottom: `1px solid rgba(0,0,0,0.05)`, display: "flex", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 900, color: "#111827" }}>توزيع الحالات</div>
                    <div style={{ fontSize: "0.54rem", color: "#B0B8C4" }}>نسبة كل حالة من الإجمالي</div>
                  </div>
                </div>
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={5} dataKey="value">
                            {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none"/>)}
                          </Pie>
                          <Tooltip formatter={(v: unknown) => [`${v} عقد`, ""]} contentStyle={{ fontFamily: "'Cairo',sans-serif", fontSize: "0.7rem", direction: "rtl", borderRadius: 12, border: `1px solid ${G_BORDER}` }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#D1D5DB", fontSize: "0.72rem" }}>لا بيانات</div>
                    )}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[{ label: "نشطة", count: cActive, color: GOLD }, { label: "مكتملة", count: cDone, color: GREEN_L }, { label: "مرفوضة", count: cRej, color: RED }].map((item, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.76rem", fontWeight: 900, color: item.color }}>{item.count}</span>
                          <span style={{ fontSize: "0.6rem", color: "#9CA3AF" }}>{item.label}</span>
                        </div>
                        <div style={{ height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: total > 0 ? `${Math.round(item.count / total * 100)}%` : "0%", borderRadius: 99, background: item.color, transition: "width 1s ease" }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weekly chart */}
              <div style={{ background: GLASS, backdropFilter: "blur(16px)", border: `1px solid rgba(0,0,0,0.06)`, borderRadius: 22, overflow: "hidden", boxShadow: "0 6px 28px rgba(0,0,0,0.05)", animation: "cardBreath 6s ease 2s infinite" }}>
                <div style={{ height: 4, background: `linear-gradient(90deg,${GREEN},${GREEN_L})` }}/>
                <div style={{ padding: "14px 20px 12px", borderBottom: `1px solid rgba(0,0,0,0.05)`, display: "flex", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 900, color: "#111827" }}>الأداء الأسبوعي</div>
                    <div style={{ fontSize: "0.54rem", color: "#B0B8C4" }}>عقود منجزة هذا الأسبوع مقارنةً بالسابق</div>
                  </div>
                </div>
                <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <ResponsiveContainer width="100%" height={62}>
                    <AreaChart data={areaData} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={GREEN_L} stopOpacity={0.32}/>
                          <stop offset="100%" stopColor={GREEN_L} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false}/>
                      <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#9CA3AF", fontFamily: "'Cairo',sans-serif" }} axisLine={false} tickLine={false}/>
                      <Area type="monotone" dataKey="مكتملة" stroke={GREEN_L} strokeWidth={2.5} fill="url(#aGrad)" dot={{ r: 4, fill: GREEN, stroke: "#fff", strokeWidth: 2.5 }}/>
                      <Tooltip formatter={(v: unknown) => [`${v} عقد`, ""]} contentStyle={{ fontFamily: "'Cairo',sans-serif", fontSize: "0.7rem", direction: "rtl", borderRadius: 12, border: `1px solid ${G_BORDER}` }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ borderTop: `1px solid rgba(0,0,0,0.05)`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: "0.56rem", fontWeight: 800, color: "#B0B8C4", marginBottom: 2 }}>توزيع الأولوية الزمنية</div>
                    {[
                      { label: "عاجل (7 أيام فأكثر)",  count: urgentCount, color: RED     },
                      { label: "تحذير (3 – 7 أيام)",   count: warnCount,   color: AMBER   },
                      { label: "طبيعي (أقل من 3 أيام)", count: safeCount,  color: GREEN_L },
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.56rem", color: "#6B7280" }}>{item.label}</span>
                        <span style={{ minWidth: 24, height: 20, borderRadius: 10, background: item.color + "18", color: item.color, fontSize: "0.62rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 7px" }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── KPI strip — slide style: clean white card with colored top bars ── */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10,
              animation: "fadeUp 0.4s ease 0.15s both",
            }}>
              {[
                { label: "متوسط زمن الإنجاز",  numVal: avgCycle,         display: avgCycle > 0 ? null : "—", unit: avgCycle > 0 ? "يوم" : "", color: AMBER,  topBg: `linear-gradient(90deg,${AMBER},#FFD080)` },
                { label: "الطلبات في المسار",   numVal: cActive,          display: null,                       unit: "عقد",                    color: BLUE_M, topBg: `linear-gradient(90deg,${BLUE_M},${BLUE_L})` },
                { label: "مكتملة هذا الأسبوع", numVal: completedThisWeek,display: null,                       unit: "عقد",                    color: GREEN,  topBg: `linear-gradient(90deg,${GREEN},${GREEN_L})` },
                { label: "نسبة الإنجاز الكلية", numVal: completePct,      display: null,                       unit: "%",                      color: GOLD,   topBg: `linear-gradient(90deg,${GOLD},${GOLD_END})` },
              ].map((item, i) => (
                <div key={i} style={{
                  background: GLASS, backdropFilter: "blur(16px)",
                  border: `1px solid rgba(0,0,0,0.06)`, borderRadius: 18, overflow: "hidden",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
                }}>
                  <div style={{ height: 4, background: item.topBg }}/>
                  <div style={{ padding: "14px 18px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.50rem", fontWeight: 700, color: "#9CA3AF", marginBottom: 6, letterSpacing: "0.05em" }}>{item.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3 }}>
                      <span style={{ fontSize: "1.7rem", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: item.color }}>
                        {item.display ?? <AnimCount value={item.numVal}/>}
                      </span>
                      {item.unit && (
                        <span style={{ fontSize: "0.58rem", fontWeight: 700, color: item.color + "90" }}>{item.unit}</span>
                      )}
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: 1.5, background: item.color + "30", margin: "8px auto 0" }}/>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
