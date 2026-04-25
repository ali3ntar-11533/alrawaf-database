import { useState, useEffect, useRef, useMemo } from "react";
import { PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { STAGES, ROLES } from "./types";
import type { Contract } from "./types";
import logoImg from "@assets/logo_1776506524686.jpg";

const GOLD     = "#C5A059";
const GOLD2    = "#a88540";
const GOLD_END = "#E2C275";
const GREEN    = "#16a34a";
const GREEN_L  = "#22c55e";
const ORANGE   = "#ea580c";
const RED      = "#dc2626";
const AMBER    = "#d97706";
const BLUE     = "#2563eb";
const BLUE_L   = "#3b82f6";

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

/* ── Animated counter ─────────────────────────────────────── */
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

/* ── Speedometer Gauge ─────────────────────────────────────── */
function SpeedometerGauge({ pct, done, total }: { pct: number; done: number; total: number }) {
  const cx = 64, cy = 56, R = 44, r = 36;
  const zones = [
    { from: 180, to: 120, color: RED      },
    { from: 120, to: 60,  color: AMBER    },
    { from: 60,  to: 0,   color: GREEN_L  },
  ];
  function pt(angle: number, radius: number) {
    const rad = angle * Math.PI / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }
  function arc(from: number, to: number, radius: number) {
    const s = pt(from, radius), e = pt(to, radius);
    const large = Math.abs(from - to) > 180 ? 1 : 0;
    return `M${s.x},${s.y} A${radius},${radius} 0 ${large},1 ${e.x},${e.y}`;
  }
  const needleAngle = 180 - (pct / 100) * 180;
  const needleTip = pt(needleAngle, R - 8);
  const needleColor = pct < 33 ? RED : pct < 66 ? AMBER : GOLD;

  return (
    <svg width="128" height="80" viewBox="0 0 128 80">
      {/* Track */}
      <path d={arc(180, 0, R)} fill="none" stroke="#E5E7EB" strokeWidth="9" strokeLinecap="round"/>
      {/* Zone arcs (faded) */}
      {zones.map((z, i) => (
        <path key={i} d={arc(z.from, z.to, R)} fill="none" stroke={z.color} strokeWidth="9" strokeOpacity={0.18} strokeLinecap="butt"/>
      ))}
      {/* Inner track */}
      <path d={arc(180, 0, r)} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="1"/>
      {/* Active fill */}
      <path d={arc(180, needleAngle, R)} fill="none" stroke={needleColor} strokeWidth="9" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${needleColor}80)` }}/>
      {/* Tick marks */}
      {[0, 30, 60, 90, 120, 150, 180].map(a => {
        const inner = pt(a, R - 13), outer = pt(a, R - 6);
        return <line key={a} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#D1D5DB" strokeWidth="1.5"/>;
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y}
        stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"
        style={{ transition: "x2 1.4s cubic-bezier(0.22,1,0.36,1), y2 1.4s cubic-bezier(0.22,1,0.36,1)" }}/>
      <circle cx={cx} cy={cy} r={5} fill="#1F2937"/>
      <circle cx={cx} cy={cy} r={2.5} fill={needleColor}/>
      {/* Labels */}
      <text x={18} y={cy + 16} fill="#9CA3AF" fontSize="6" fontFamily="Cairo">0%</text>
      <text x={100} y={cy + 16} fill="#9CA3AF" fontSize="6" fontFamily="Cairo">100%</text>
      <text x={cx} y={cy + 20} textAnchor="middle" fill={GOLD2} fontSize="11" fontWeight="900" fontFamily="Cairo">{pct}%</text>
      <text x={cx} y={cy + 30} textAnchor="middle" fill="#9CA3AF" fontSize="6" fontFamily="Cairo">{done}/{total} عقد</text>
    </svg>
  );
}

/* ── Folder Card ───────────────────────────────────────────── */
function FolderCard({ label, sub, count, icon, accent, isActive, onClick }: {
  label: string; sub: string; count: number; icon: string;
  accent: string; isActive: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const active = isActive || hov;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 20, padding: "18px 20px",
        background: isActive
          ? `linear-gradient(135deg, ${accent}10, ${accent}05)`
          : "rgba(255,255,255,0.85)",
        border: `1.5px solid ${isActive ? accent + "50" : hov ? accent + "30" : "#F0F0F0"}`,
        boxShadow: isActive
          ? `0 12px 36px ${accent}22, 0 2px 8px ${accent}14`
          : hov ? `0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05)`
          : "0 2px 8px rgba(0,0,0,0.04)",
        cursor: "pointer",
        position: "relative", overflow: "hidden",
        transform: isActive ? "translateY(-5px) scale(1.01)" : hov ? "translateY(-3px)" : "none",
        transition: "all 0.22s cubic-bezier(0.22,1,0.36,1)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: isActive ? accent : hov ? accent + "80" : "transparent",
        borderRadius: "20px 20px 0 0",
        transition: "background 0.2s",
      }}/>
      {/* Folder tab decoration */}
      <div style={{
        position: "absolute", top: 3, right: 14, width: 28, height: 9,
        background: isActive ? accent + "30" : "#F3F4F6",
        borderRadius: "6px 6px 0 0",
        transition: "background 0.2s",
      }}/>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, marginTop: 4 }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 700, color: active ? accent : "#9CA3AF", letterSpacing: "0.02em" }}>{sub}</span>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: isActive ? accent + "20" : hov ? accent + "10" : "#F9FAFB",
          border: `1px solid ${isActive ? accent + "35" : hov ? accent + "20" : "#F3F4F6"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.05rem",
          boxShadow: isActive ? `0 4px 14px ${accent}25` : "none",
          transition: "all 0.2s",
        }}>{icon}</div>
      </div>
      <div style={{
        fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1,
        color: isActive ? accent : "#111827",
      }}>
        <AnimCount value={count} color={isActive ? accent : "#111827"}/>
      </div>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: isActive ? accent + "CC" : "#374151", marginTop: 5 }}>{label}</div>
      <div style={{
        marginTop: 10, display: "flex", alignItems: "center", gap: 4,
        color: active ? accent : "#9CA3AF", fontSize: "0.6rem", fontWeight: 600,
        transition: "color 0.2s",
      }}>
        <span>عرض الجدول الكامل</span>
        <span>←</span>
      </div>
    </div>
  );
}

/* ── Stage Row ─────────────────────────────────────────────── */
function StageRow({ stageNum, contracts, maxCount, isMine, onEnter, idx }: {
  stageNum: number; contracts: Contract[]; maxCount: number;
  isMine: boolean; onEnter: () => void; idx: number;
}) {
  const [hov, setHov] = useState(false);
  const stage = STAGES[stageNum - 1];

  const active  = contracts.filter(c => c.currentStage === stageNum && c.status === "active").length;
  const urgent  = contracts.filter(c => c.currentStage === stageNum && c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warn    = contracts.filter(c => c.currentStage === stageNum && c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;

  const pct      = maxCount > 0 ? (active / maxCount) * 100 : 0;
  const isEmpty  = active === 0;
  const barColor = urgent > 0 ? RED : warn > 0 ? AMBER : pct >= 50 ? GREEN_L : pct >= 20 ? ORANGE : active > 0 ? BLUE_L : "#E5E7EB";
  const numColor = active === 0 ? "#D1D5DB" : urgent > 0 ? RED : warn > 0 ? AMBER : BLUE;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => !isEmpty && onEnter()}
      style={{
        display: "flex", alignItems: "center", gap: 0,
        padding: "9px 0",
        borderBottom: "1px solid #F5F5F5",
        cursor: isEmpty ? "default" : "pointer",
        background: hov && !isEmpty ? (isMine ? "rgba(197,160,89,0.05)" : "#FAFAFA") : "transparent",
        borderRadius: 8,
        transition: "background 0.18s ease",
        animation: `rowFadeIn 0.35s ease ${idx * 0.025}s both`,
        opacity: isEmpty ? 0.45 : 1,
      }}
    >
      <div style={{
        width: 50, flexShrink: 0, textAlign: "left", paddingLeft: 6,
        fontSize: active >= 100 ? "1.25rem" : active >= 10 ? "1.5rem" : "1.75rem",
        fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>
        <AnimCount value={active} color={numColor}/>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "0 12px 0 8px" }}>
        <div style={{ height: 6, background: "#EEF0F2", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: pct > 0 ? `${Math.max(pct, 3)}%` : "0%",
            borderRadius: 99, background: isEmpty ? "transparent" : barColor,
            boxShadow: pct > 0 && !isEmpty ? `0 0 6px ${barColor}70` : "none",
            transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)",
          }}/>
        </div>
        {(urgent > 0 || warn > 0) && (
          <div style={{ display: "flex", gap: 5 }}>
            {urgent > 0 && <span style={{ fontSize: "0.5rem", fontWeight: 800, color: RED, background: "#FEF2F2", border: "1px solid #FCA5A580", borderRadius: 20, padding: "1px 7px" }}>⚠ {urgent} عاجل</span>}
            {warn > 0 && <span style={{ fontSize: "0.5rem", fontWeight: 800, color: AMBER, background: "#FFFBEB", border: "1px solid #FCD34D80", borderRadius: 20, padding: "1px 7px" }}>🔔 {warn} تنبيه</span>}
          </div>
        )}
      </div>

      <div style={{ width: 190, flexShrink: 0, textAlign: "right", paddingRight: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
          {isMine && <span style={{ fontSize: "0.46rem", fontWeight: 800, color: GOLD2, background: "rgba(197,160,89,0.1)", border: "1px solid rgba(197,160,89,0.25)", borderRadius: 20, padding: "1px 6px" }}>مرحلتك ⭐</span>}
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: isEmpty ? "#C9CDD4" : "#1F2937" }}>{stage?.label}</span>
          <span style={{ fontSize: "0.88rem" }}>{stage?.icon}</span>
        </div>
        <div style={{ fontSize: "0.54rem", color: "#9CA3AF", marginTop: 2 }}>{stage?.role}</div>
      </div>

      <div style={{ width: hov && !isEmpty ? 72 : 0, overflow: "hidden", transition: "width 0.22s ease", flexShrink: 0, paddingLeft: hov && !isEmpty ? 8 : 0 }}>
        {!isEmpty && (
          <button
            onClick={e => { e.stopPropagation(); onEnter(); }}
            style={{
              background: isMine ? `linear-gradient(135deg,${GOLD},${GOLD_END})` : `linear-gradient(135deg,${BLUE},${BLUE_L})`,
              color: "#fff", border: "none", borderRadius: 8,
              padding: "6px 10px", fontSize: "0.62rem", fontWeight: 800,
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

/* ── Contract Data Table ───────────────────────────────────── */
function ContractDataTable({ contracts, mode, onOpenContract, onBack }: {
  contracts: Contract[];
  mode: ViewMode;
  onOpenContract: (id: number) => void;
  onBack: () => void;
}) {
  const [search, setSearch]       = useState("");
  const [vendor, setVendor]       = useState("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [valMin, setValMin]       = useState("");
  const [valMax, setValMax]       = useState("");
  const [sortBy, setSortBy]       = useState<"date" | "value" | "stage" | "no">("date");
  const [sortDir, setSortDir]     = useState<"desc" | "asc">("desc");

  const modeLabels: Record<ViewMode, { label: string; accent: string }> = {
    overview:  { label: "جميع العقود",    accent: BLUE  },
    all:       { label: "جميع العقود",    accent: BLUE  },
    active:    { label: "الطلبات النشطة", accent: GOLD  },
    completed: { label: "العقود المكتملة", accent: GREEN },
    rejected:  { label: "العقود المرفوضة", accent: RED  },
  };
  const meta = modeLabels[mode];

  const baseFilter = useMemo(() => {
    if (mode === "active")    return contracts.filter(c => c.status === "active" && !c.rejectionReason);
    if (mode === "completed") return contracts.filter(c => c.status === "completed");
    if (mode === "rejected")  return contracts.filter(c => !!c.rejectionReason && c.status !== "completed");
    return contracts;
  }, [contracts, mode]);

  const filtered = useMemo(() => {
    let list = baseFilter;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.contractNo.toLowerCase().includes(q) ||
        c.vendorName.toLowerCase().includes(q) ||
        c.projectName?.toLowerCase().includes(q)
      );
    }
    if (vendor.trim()) list = list.filter(c => c.vendorName.includes(vendor.trim()));
    if (dateFrom) list = list.filter(c => c.createdAt >= dateFrom);
    if (dateTo)   list = list.filter(c => c.createdAt <= dateTo + "T23:59:59");
    if (valMin)   list = list.filter(c => (c.value || 0) >= Number(valMin));
    if (valMax)   list = list.filter(c => (c.value || 0) <= Number(valMax));

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date")  cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "value") cmp = (a.value || 0) - (b.value || 0);
      if (sortBy === "stage") cmp = a.currentStage - b.currentStage;
      if (sortBy === "no")    cmp = a.contractNo.localeCompare(b.contractNo);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [baseFilter, search, vendor, dateFrom, dateTo, valMin, valMax, sortBy, sortDir]);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }
  function SortIcon({ col }: { col: typeof sortBy }) {
    if (sortBy !== col) return <span style={{ color: "#D1D5DB", fontSize: "0.6rem" }}>⇅</span>;
    return <span style={{ color: meta.accent, fontSize: "0.6rem" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 10,
    border: "1.5px solid #E5E7EB", background: "#fff",
    fontSize: "0.72rem", fontFamily: "'Cairo','Tajawal',sans-serif",
    outline: "none", color: "#374151",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ fontFamily: "'Cairo','Tajawal',sans-serif" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 0 18px",
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 10,
            border: "1.5px solid #E5E7EB", background: "#fff",
            cursor: "pointer", fontSize: "0.75rem", fontWeight: 700,
            fontFamily: "'Cairo','Tajawal',sans-serif", color: "#374151",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = meta.accent; (e.currentTarget as HTMLElement).style.color = meta.accent; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}
        >
          ← رجوع
        </button>
        <div style={{ height: 22, width: 1, background: "#E5E7EB" }}/>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: meta.accent, boxShadow: `0 0 0 3px ${meta.accent}25`,
        }}/>
        <span style={{ fontSize: "1rem", fontWeight: 900, color: "#111827" }}>{meta.label}</span>
        <span style={{
          padding: "3px 12px", borderRadius: 20,
          background: meta.accent + "15", color: meta.accent,
          fontSize: "0.7rem", fontWeight: 800,
          border: `1px solid ${meta.accent}30`,
        }}>{filtered.length} عقد</span>
      </div>

      {/* Filters */}
      <div style={{
        background: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 16,
        border: "1px solid #E5E7EB", boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#9CA3AF", marginBottom: 10, letterSpacing: "0.05em" }}>
          🔍 فلاتر البحث المتقدم
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 10 }}>
          <input
            style={inputStyle}
            placeholder="بحث في العنوان، الرقم، المقاول..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="اسم المقاول"
            value={vendor}
            onChange={e => setVendor(e.target.value)}
          />
          <input
            type="date"
            style={inputStyle}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="من تاريخ"
          />
          <input
            type="date"
            style={inputStyle}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="إلى تاريخ"
          />
          <input
            type="number"
            style={inputStyle}
            placeholder="قيمة من (ر.س)"
            value={valMin}
            onChange={e => setValMin(e.target.value)}
          />
          <input
            type="number"
            style={inputStyle}
            placeholder="قيمة إلى (ر.س)"
            value={valMax}
            onChange={e => setValMax(e.target.value)}
          />
        </div>
        {(search || vendor || dateFrom || dateTo || valMin || valMax) && (
          <button
            onClick={() => { setSearch(""); setVendor(""); setDateFrom(""); setDateTo(""); setValMin(""); setValMax(""); }}
            style={{
              marginTop: 10, padding: "5px 14px", borderRadius: 8,
              border: "1px solid #FCA5A5", background: "#FEF2F2",
              cursor: "pointer", fontSize: "0.65rem", color: RED, fontWeight: 700,
              fontFamily: "'Cairo','Tajawal',sans-serif",
            }}
          >✕ مسح الفلاتر</button>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: "#fff", borderRadius: 16,
        border: "1px solid #E5E7EB", boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1.5px solid #E5E7EB" }}>
              {([
                { label: "رقم العقد",       col: "no"    as const },
                { label: "عنوان المشروع",   col: null            },
                { label: "المقاول",         col: null            },
                { label: "المرحلة",         col: "stage" as const },
                { label: "الحالة",          col: null            },
                { label: "القيمة",          col: "value" as const },
                { label: "تاريخ الإنشاء",  col: "date"  as const },
                { label: "",               col: null            },
              ]).map(({ label, col }, i) => (
                <th
                  key={i}
                  onClick={col ? () => toggleSort(col) : undefined}
                  style={{
                    padding: "11px 14px", textAlign: "right",
                    fontWeight: 800, color: "#374151", fontSize: "0.68rem",
                    cursor: col ? "pointer" : "default",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label} {col && <SortIcon col={col}/>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: "0.82rem" }}>
                  لا توجد عقود مطابقة للبحث
                </td>
              </tr>
            ) : filtered.map((c, i) => {
              const stage = STAGES[c.currentStage - 1];
              const isRej = !!c.rejectionReason && c.status !== "completed";
              const isDone = c.status === "completed";
              const statusColor = isDone ? GREEN_L : isRej ? RED : GOLD;
              const statusLabel = isDone ? "مكتملة" : isRej ? "مرفوضة" : "نشطة";

              return (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: "1px solid #F3F4F6",
                    background: i % 2 === 0 ? "#fff" : "#FAFAFA",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${meta.accent}08`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "#fff" : "#FAFAFA"; }}
                >
                  <td style={{ padding: "10px 14px", fontWeight: 800, color: "#374151", whiteSpace: "nowrap" }}>{c.contractNo}</td>
                  <td style={{ padding: "10px 14px", color: "#111827", maxWidth: 200 }}>
                    <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    <div style={{ fontSize: "0.6rem", color: "#9CA3AF" }}>{c.projectName}</div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#374151" }}>{c.vendorName}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "2px 8px", borderRadius: 20,
                      background: "rgba(197,160,89,0.08)", color: GOLD2,
                      border: "1px solid rgba(197,160,89,0.2)", fontSize: "0.62rem", fontWeight: 700,
                    }}>
                      م{c.currentStage} {stage?.icon}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      padding: "2px 10px", borderRadius: 20,
                      background: statusColor + "15", color: statusColor,
                      fontSize: "0.62rem", fontWeight: 800,
                      border: `1px solid ${statusColor}30`,
                    }}>{statusLabel}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1F2937", whiteSpace: "nowrap" }}>
                    {c.value ? `${formatSAR(c.value)} ر.س` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#6B7280", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                    {new Date(c.createdAt).toLocaleDateString("ar-SA")}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <button
                      onClick={() => onOpenContract(c.id)}
                      style={{
                        padding: "6px 14px", borderRadius: 8,
                        border: `1.5px solid ${meta.accent}40`,
                        background: `${meta.accent}10`, color: meta.accent,
                        cursor: "pointer", fontSize: "0.65rem", fontWeight: 800,
                        fontFamily: "'Cairo','Tajawal',sans-serif",
                        whiteSpace: "nowrap", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = meta.accent; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${meta.accent}10`; (e.currentTarget as HTMLElement).style.color = meta.accent; }}
                    >فتح ←</button>
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
  const cRejected = contracts.filter(c => !!c.rejectionReason && c.status !== "completed").length;
  const completePct = total > 0 ? Math.round((cDone / total) * 100) : 0;

  const urgentCount = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 7).length;
  const warnCount   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;
  const safeCount   = contracts.filter(c => c.status === "active" && daysSince(c.updatedAt) < 3).length;

  const completedThisWeek = contracts.filter(c => c.status === "completed" && daysSince(c.updatedAt) <= 7).length;
  const completedLastWeek = contracts.filter(c => c.status === "completed" && daysSince(c.updatedAt) > 7 && daysSince(c.updatedAt) <= 14).length;

  const avgCycleTime = useMemo(() => {
    const done = contracts.filter(c => c.status === "completed");
    if (!done.length) return 0;
    const total = done.reduce((s, c) => s + Math.max(0, Math.floor((new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / 86400000)), 0);
    return Math.round(total / done.length);
  }, [contracts]);

  const myRoleInfo = ROLES.find(r => r.name === role);

  const maxCount = Math.max(
    ...STAGES.map((_, i) => contracts.filter(c => c.currentStage === i + 1 && c.status === "active").length),
    1
  );

  const pieData = [
    { name: "نشطة",   value: cActive,   color: GOLD    },
    { name: "مكتملة", value: cDone,     color: GREEN_L },
    { name: "مرفوضة", value: cRejected, color: RED     },
  ].filter(d => d.value > 0);

  const areaData = [
    { name: "الأسبوع الماضي", مكتملة: completedLastWeek  },
    { name: "هذا الأسبوع",    مكتملة: completedThisWeek },
  ];

  const FOLDERS = [
    { key: "all"       as ViewMode, label: "إجمالي العقود",  sub: "جميع الحالات",     count: total,     icon: "📁", accent: BLUE  },
    { key: "active"    as ViewMode, label: "الطلبات النشطة", sub: "قيد التنفيذ الآن", count: cActive,   icon: "⚡", accent: GOLD  },
    { key: "completed" as ViewMode, label: "العقود المكتملة", sub: "أُنجزت بنجاح",   count: cDone,     icon: "✅", accent: GREEN },
    { key: "rejected"  as ViewMode, label: "العقود المرفوضة", sub: "مرفوضة / معادة",  count: cRejected, icon: "↩", accent: RED   },
  ];

  const reversedStages = [...Array(STAGES.length)].map((_, i) => STAGES.length - i);

  return (
    <div dir="rtl" style={{ background: "linear-gradient(160deg, #F8FAFC 0%, #F3F4F6 100%)", minHeight: "100%", fontFamily: "'Cairo','Tajawal',sans-serif" }}>
      <style>{`
        @keyframes rowFadeIn { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowLogo { 0%,100%{box-shadow:0 0 0 2px rgba(197,160,89,0.3),0 4px 20px rgba(0,0,0,0.14)} 50%{box-shadow:0 0 0 3px rgba(197,160,89,0.6),0 6px 28px rgba(197,160,89,0.22)} }
        @keyframes urgBlink { 0%,100%{opacity:1} 50%{opacity:0.55} }
      `}</style>

      {/* ═══ HEADER ══════════════════════════════════════════════ */}
      <div style={{
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(229,231,235,0.8)",
        padding: "12px 28px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, overflow: "hidden", flexShrink: 0, animation: "glowLogo 4s ease infinite" }}>
          <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        </div>
        <div>
          <div style={{ fontSize: "0.46rem", fontWeight: 800, letterSpacing: "0.14em", color: GOLD2, marginBottom: 1 }}>ALRAWAF CONTRACTING</div>
          <div style={{
            fontSize: "1.15rem", fontWeight: 900, letterSpacing: "-0.02em",
            background: `linear-gradient(120deg,#1F2937,#374151,${GOLD2})`,
            backgroundSize: "200%", WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>لوحة القيادة التنفيذية</div>
          <div style={{ fontSize: "0.56rem", color: "#9CA3AF", marginTop: 1 }}>
            {role ? `${actorName || role} · ${pendingContracts.length} عقد بانتظار قرارك` : "نظام إدارة العقود"}
          </div>
        </div>

        <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {urgentCount > 0 && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 20, padding: "5px 12px", fontSize: "0.6rem", fontWeight: 800, color: RED, animation: "urgBlink 2.5s ease infinite" }}>
              ⚠️ {urgentCount} عاجل
            </div>
          )}
          {/* Speedometer */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(249,250,251,0.9)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(229,231,235,0.8)",
            borderRadius: 16, padding: "6px 14px 6px 10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}>
            <SpeedometerGauge pct={completePct} done={cDone} total={total}/>
            <div>
              <div style={{ fontSize: "0.64rem", fontWeight: 800, color: "#374151" }}>نسبة الإنجاز</div>
              <div style={{ fontSize: "0.54rem", color: "#9CA3AF" }}>إجمالي {total} عقد</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

        {viewMode !== "overview" ? (
          /* ═══ DATA TABLE MODE ════════════════════════════════ */
          <ContractDataTable
            contracts={contracts}
            mode={viewMode}
            onOpenContract={onOpenContract}
            onBack={() => setViewMode("overview")}
          />
        ) : (
          /* ═══ OVERVIEW MODE ══════════════════════════════════ */
          <>
            {/* ── Folder Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, animation: "fadeUp 0.4s ease both" }}>
              {FOLDERS.map(f => (
                <FolderCard
                  key={f.key}
                  label={f.label} sub={f.sub} count={f.count}
                  icon={f.icon} accent={f.accent}
                  isActive={false}
                  onClick={() => setViewMode(f.key)}
                />
              ))}
            </div>

            {/* ── Stage List (reversed: top authority → bottom) ── */}
            <div style={{
              background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(229,231,235,0.8)", borderRadius: 20,
              overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              animation: "fadeUp 0.4s ease 0.06s both",
            }}>
              <div style={{ padding: "16px 24px 13px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 8, height: 32, borderRadius: 4, background: `linear-gradient(180deg,${GOLD},${GOLD}60)` }}/>
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#111827" }}>حالات الطلبات الجارية</div>
                    <div style={{ fontSize: "0.58rem", color: "#9CA3AF", marginTop: 1 }}>من الأعلى تنظيمياً إلى الأدنى · اضغط على أي مرحلة للتفاصيل</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {myRoleInfo && (
                    <div style={{ background: "rgba(197,160,89,0.08)", border: "1px solid rgba(197,160,89,0.2)", borderRadius: 20, padding: "5px 12px", fontSize: "0.6rem", fontWeight: 700, color: GOLD2 }}>
                      {myRoleInfo.icon} مرحلتك: {myRoleInfo.stage.map(s => `م${s}`).join("، ")}
                    </div>
                  )}
                  <div style={{ background: "#F3F4F6", borderRadius: 20, padding: "5px 12px", fontSize: "0.58rem", color: "#6B7280", fontWeight: 600 }}>{maxCount} أعلى عدد</div>
                </div>
              </div>
              <div style={{ padding: "8px 24px 12px" }}>
                {reversedStages.map((stageNum, idx) => (
                  <StageRow
                    key={stageNum}
                    stageNum={stageNum}
                    contracts={contracts}
                    maxCount={maxCount}
                    isMine={myRoleInfo?.stage.includes(stageNum) ?? false}
                    onEnter={() => onOpenStage(stageNum)}
                    idx={idx}
                  />
                ))}
              </div>
            </div>

            {/* ── Analytics Row (2-col side-by-side, no bottleneck) ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, animation: "fadeUp 0.4s ease 0.1s both" }}>

              {/* توزيع الحالات */}
              <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(229,231,235,0.8)", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "13px 18px 11px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 28, borderRadius: 4, background: `linear-gradient(180deg,${GOLD},${GOLD_END})` }}/>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#111827" }}>توزيع الحالات</div>
                </div>
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={5} dataKey="value">
                            {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none"/>)}
                          </Pie>
                          <Tooltip formatter={(v: unknown) => [`${v} عقد`, ""]} contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.7rem", direction:"rtl", borderRadius:10, border:"1px solid #E5E7EB" }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#D1D5DB", fontSize:"0.72rem" }}>لا بيانات</div>
                    )}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "نشطة",   count: cActive,   color: GOLD    },
                      { label: "مكتملة", count: cDone,     color: GREEN_L },
                      { label: "مرفوضة", count: cRejected, color: RED     },
                    ].map((item, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: item.color }}>{item.count}</span>
                          <span style={{ fontSize: "0.62rem", color: "#6B7280" }}>{item.label}</span>
                        </div>
                        <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height:"100%", width: total > 0 ? `${Math.round(item.count/total*100)}%` : "0%", borderRadius:99, background:item.color, transition:"width 0.9s ease" }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* الأداء الأسبوعي */}
              <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(229,231,235,0.8)", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "13px 18px 11px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 28, borderRadius: 4, background: `linear-gradient(180deg,${GREEN_L},${GREEN})` }}/>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#111827" }}>الأداء الأسبوعي</div>
                </div>
                <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <ResponsiveContainer width="100%" height={62}>
                    <AreaChart data={areaData} margin={{ top:2, right:4, left:-24, bottom:0 }}>
                      <defs>
                        <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={GREEN_L} stopOpacity={0.28}/>
                          <stop offset="100%" stopColor={GREEN_L} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                      <XAxis dataKey="name" tick={{ fontSize:8, fill:"#9CA3AF", fontFamily:"'Cairo',sans-serif" }} axisLine={false} tickLine={false}/>
                      <Area type="monotone" dataKey="مكتملة" stroke={GREEN_L} strokeWidth={2.5} fill="url(#aGrad)" dot={{ r:4, fill:GREEN, stroke:"#fff", strokeWidth:2 }}/>
                      <Tooltip formatter={(v: unknown) => [`${v} عقد`,""]} contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.7rem", direction:"rtl", borderRadius:10, border:"1px solid #E5E7EB" }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "#9CA3AF", marginBottom: 2 }}>🚦 توزيع الأولوية</div>
                    {[
                      { label: "عاجل ≥٧ أيام",  count: urgentCount, color: RED     },
                      { label: "تحذير ٣–٧ أيام", count: warnCount,   color: AMBER   },
                      { label: "طبيعي < ٣ أيام", count: safeCount,   color: GREEN_L },
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.57rem", color: "#6B7280" }}>{item.label}</span>
                        <span style={{ minWidth:24, height:20, borderRadius:10, background:item.color+"15", color:item.color, fontSize:"0.62rem", fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 7px" }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Dark strip (متوسط زمن الإنجاز بدلاً من قيمة العقود) ── */}
            <div style={{
              background: "linear-gradient(130deg,#0E0B06 0%,#1C1508 50%,#0E0B06 100%)",
              borderRadius: 20, padding: "14px 26px",
              display: "flex", alignItems: "center",
              border: "1px solid rgba(197,160,89,0.22)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.14),inset 0 1px 0 rgba(197,160,89,0.1)",
              animation: "fadeUp 0.4s ease 0.15s both",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position:"absolute", top:-50, right:"35%", width:160, height:160, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(197,160,89,0.07) 0%,transparent 70%)", pointerEvents:"none" }}/>
              {[
                { label: "متوسط زمن الإنجاز",    value: avgCycleTime > 0 ? `${avgCycleTime} يوم` : "—",   icon: "⏱️" },
                { label: "الطلبات في المسار",     value: `${cActive} عقد`,                                  icon: "⚡" },
                { label: "مكتملة هذا الأسبوع",    value: `${completedThisWeek} عقد`,                        icon: "📊" },
                { label: "نسبة الإنجاز الكلية",   value: `${completePct}%`,                                  icon: "🎯" },
              ].map((item, i, arr) => (
                <div key={i} style={{ flex:1, textAlign:"center", borderLeft:i<arr.length-1?"1px solid rgba(197,160,89,0.12)":"none", padding:"0 8px" }}>
                  <div style={{ fontSize:"0.56rem", color:"rgba(226,194,117,0.5)", marginBottom:5 }}>{item.icon} {item.label}</div>
                  <div style={{ fontSize:"1.05rem", fontWeight:900, letterSpacing:"-0.02em", background:`linear-gradient(135deg,${GOLD_END},${GOLD})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                    {item.value}
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
