import { useState, useEffect, useRef, useMemo } from "react";
import { PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ROLES } from "./types";
import type { Contract } from "./types";
import logoImg from "@assets/logo_1776506524686.jpg";

/* ── Design tokens ─────────────────────────────────────────── */
const GOLD     = "#C5A059";
const GOLD2    = "#a88540";
const GOLD_END = "#E2C275";
const GREEN    = "#16a34a";
const GREEN_L  = "#22c55e";
const RED      = "#dc2626";
const AMBER    = "#d97706";
const BLUE     = "#2563eb";
const BLUE_L   = "#3b82f6";
const DARK     = "#0D0A04";
const DARK2    = "#1A1208";

/* ── Stage display labels (elite org hierarchy) ────────────── */
const DASH_STAGES = [
  { label: "مدير المشروع",                 icon: "👷",   sub: "القاعدة الوظيفية",       stageNums: [1]      },
  { label: "مدير المحفظة",                 icon: "🏢",   sub: "Portfolio Manager",      stageNums: [2]      },
  { label: "مدير التكاليف - PMO",          icon: "📊",   sub: "Cost Management",        stageNums: [3]      },
  { label: "مراجعة البيانات",              icon: "⚖️",   sub: "Legal & Data Review",    stageNums: [4]      },
  { label: "ناسخ العقد",                   icon: "✍️",   sub: "Contract Drafting",      stageNums: [5]      },
  { label: "المراجعة الفنية",              icon: "📤",   sub: "Technical Review",       stageNums: [6]      },
  { label: "اعتماد الإجراءات",             icon: "✅",   sub: "Procedure Approval",     stageNums: [7]      },
  { label: "نائب الرئيس التنفيذي",        icon: "🔑",   sub: "Deputy CEO",             stageNums: [8]      },
  { label: "الرئيس التنفيذي",              icon: "👑",   sub: "CEO — Final Stamp",      stageNums: [9]      },
  { label: "التوقيعات والأرشفة",          icon: "📜",   sub: "Signatures & Archive",   stageNums: [10, 11] },
];

/* ── Helpers ───────────────────────────────────────────────── */
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

/* ── Animated numeric counter ──────────────────────────────── */
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

/* ── Pulse Wave (Operational Pulse Engine) — compact faded ─── */
function PulseWave({ pct, active, done, total }: { pct: number; active: number; done: number; total: number }) {
  const W = 150, H = 36, amp = 7, λ = 40;
  const pts = Array.from({ length: 160 }, (_, i) => {
    const x = (i * (W * 2)) / 159;
    const y = H / 2 - amp * Math.sin((2 * Math.PI * x) / λ);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  const CARD_BG   = "#FFFDF8";
  const EDGE_FADE = "#FFFDF8";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: `linear-gradient(120deg,${CARD_BG} 0%,#FBF6EC 60%,${CARD_BG} 100%)`,
      border: "1px solid rgba(197,160,89,0.22)",
      borderRadius: 14, padding: "7px 14px 7px 10px",
      boxShadow: "0 2px 12px rgba(197,160,89,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Wave display */}
      <div style={{ position:"relative", width:W, height:H, overflow:"hidden", flexShrink:0 }}>
        <svg width={W * 2} height={H}
          style={{ position:"absolute", left:0, animation:`pulseWaveScroll 3.2s linear infinite` }}>
          <defs>
            <linearGradient id="wGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={GOLD} stopOpacity="0"/>
              <stop offset="30%"  stopColor={GOLD} stopOpacity="0.28"/>
              <stop offset="70%"  stopColor={GOLD_END} stopOpacity="0.28"/>
              <stop offset="100%" stopColor={GOLD} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <line x1="0" y1={H/2} x2={W*2} y2={H/2} stroke="rgba(197,160,89,0.1)" strokeWidth="1"/>
          <path d={pts} fill="none" stroke="url(#wGrad)" strokeWidth="1.4"/>
        </svg>
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(90deg,${EDGE_FADE} 0%,transparent 22%,transparent 78%,${EDGE_FADE} 100%)`, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:"50%", right:6, transform:"translateY(-50%)", width:3, height:3, borderRadius:"50%", background:GOLD, opacity:0.4, animation:"pulseDot 2.2s ease-in-out infinite" }}/>
      </div>

      {/* Completion % */}
      <div style={{ display:"flex", flexDirection:"column", gap:0, alignItems:"center" }}>
        <div style={{ fontSize:"0.38rem", color:"rgba(139,105,20,0.45)", letterSpacing:"0.1em", fontWeight:700 }}>COMPLETION</div>
        <div style={{
          fontSize:"1.45rem", fontWeight:900, letterSpacing:"-0.04em", lineHeight:1,
          fontVariantNumeric:"tabular-nums",
          color: GOLD2,
        }}>
          <AnimCount value={pct}/><span style={{ fontSize:"0.7rem" }}>%</span>
        </div>
        <div style={{ fontSize:"0.4rem", color:"rgba(139,105,20,0.38)" }}>{done}/{total}</div>
      </div>

      {/* Divider */}
      <div style={{ width:1, height:26, background:"rgba(197,160,89,0.18)", flexShrink:0 }}/>

      {/* Active count */}
      <div style={{ display:"flex", flexDirection:"column", gap:0, alignItems:"center" }}>
        <div style={{ fontSize:"0.38rem", color:"rgba(139,105,20,0.45)", letterSpacing:"0.1em", fontWeight:700 }}>ACTIVE</div>
        <div style={{ fontSize:"1.1rem", fontWeight:900, color: GOLD2, letterSpacing:"-0.03em", lineHeight:1, fontVariantNumeric:"tabular-nums" }}>
          <AnimCount value={active}/>
        </div>
        <div style={{ fontSize:"0.4rem", color:"rgba(139,105,20,0.38)" }}>نشط</div>
      </div>
    </div>
  );
}

/* ── Smart Folder Card ─────────────────────────────────────── */
function FolderCard({ label, sub, count, icon, accent, onClick }: {
  label: string; sub: string; count: number; icon: string;
  accent: string; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 16, padding: "14px 16px 12px",
        background: "#fff",
        border: `1px solid ${hov ? accent + "50" : "rgba(0,0,0,0.07)"}`,
        boxShadow: hov
          ? `0 8px 28px ${accent}18, 0 2px 8px rgba(0,0,0,0.06)`
          : "0 1px 4px rgba(0,0,0,0.04)",
        cursor: "pointer", position: "relative", overflow: "hidden",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 3, height: "100%",
        background: hov ? accent : accent + "30",
        borderRadius: "0 16px 16px 0",
        transition: "background 0.22s",
      }}/>

      {/* Top row: sub-label + icon */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingRight: 6 }}>
        <span style={{ fontSize: "0.56rem", fontWeight: 700, color: hov ? accent : "#9CA3AF", letterSpacing: "0.03em", transition: "color 0.2s" }}>
          {sub}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: hov ? accent + "18" : "#F8F8F8",
          border: `1px solid ${hov ? accent + "28" : "#EFEFEF"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.9rem",
          transition: "all 0.2s",
        }}>{icon}</div>
      </div>

      {/* Count */}
      <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: hov ? accent : "#111827", transition: "color 0.2s", paddingRight: 6 }}>
        <AnimCount value={count}/>
      </div>

      {/* Label */}
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#4B5563", marginTop: 4, paddingRight: 6 }}>{label}</div>

      {/* Footer hint */}
      <div style={{
        marginTop: 10, paddingRight: 6,
        color: hov ? accent : "#D1D5DB", fontSize: "0.54rem", fontWeight: 700,
        transition: "color 0.2s", letterSpacing: "0.02em",
      }}>
        ← عرض التفاصيل
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

  const pct = maxCount > 0 ? (active / maxCount) * 100 : 0;
  const isEmpty = active === 0;

  const barColor = urgent > 0 ? RED : warn > 0 ? AMBER : pct >= 60 ? GREEN_L : pct >= 25 ? BLUE_L : active > 0 ? GOLD : "#E5E7EB";
  const numColor = isEmpty ? "#D1D5DB" : urgent > 0 ? RED : warn > 0 ? AMBER : BLUE;

  const isTopLevel   = stage.stageNums.some(n => n >= 9);
  const isFinalStage = stage.stageNums.some(n => n >= 10);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => !isEmpty && onEnter()}
      style={{
        display:"flex", alignItems:"center", gap:0,
        padding:"8px 0",
        borderBottom: isFinalStage ? "none" : "1px solid rgba(0,0,0,0.045)",
        cursor: isEmpty ? "default" : "pointer",
        background: hov && !isEmpty
          ? (isMine ? "rgba(197,160,89,0.06)" : isTopLevel ? "rgba(37,99,235,0.04)" : "#FAFAFA")
          : "transparent",
        borderRadius:10,
        transition:"background 0.15s",
        animation:`rowFadeIn 0.4s ease ${idx * 0.022}s both`,
        opacity: isEmpty ? 0.38 : 1,
        position:"relative",
        zIndex: hov ? 50 : "auto",
      }}
    >
      {/* Left rank indicator (top → final stage has gold glow) */}
      <div style={{
        width:4, height:isEmpty ? 14 : 24, borderRadius:2, marginLeft:4, flexShrink:0,
        background: isEmpty ? "#E5E7EB"
          : isFinalStage ? `linear-gradient(180deg,${GOLD_END},${GOLD})`
          : isTopLevel ? `linear-gradient(180deg,${BLUE_L},${BLUE})`
          : `${barColor}`,
        boxShadow: (!isEmpty && isFinalStage) ? `0 0 8px rgba(197,160,89,0.5)` : "none",
        transition:"all 0.2s",
      }}/>

      {/* Count */}
      <div style={{
        width:46, flexShrink:0, textAlign:"left", paddingRight:4, paddingLeft:8,
        fontSize: active >= 10 ? "1.45rem" : "1.75rem",
        fontWeight:900, letterSpacing:"-0.04em", lineHeight:1,
        fontVariantNumeric:"tabular-nums", color:numColor,
      }}>
        <AnimCount value={active}/>
      </div>

      {/* Bar */}
      <div style={{ flex:1, padding:"0 10px 0 6px" }}>
        <div style={{ height:5, background:"rgba(0,0,0,0.06)", borderRadius:99, overflow:"hidden" }}>
          <div style={{
            height:"100%",
            width: pct > 0 ? `${Math.max(pct, 4)}%` : "0%",
            borderRadius:99,
            background: isEmpty ? "transparent"
              : isFinalStage ? `linear-gradient(90deg,${GOLD},${GOLD_END})`
              : barColor,
            boxShadow: pct > 0 && !isEmpty ? `0 0 8px ${barColor}60` : "none",
            transition:"width 1.2s cubic-bezier(0.22,1,0.36,1)",
          }}/>
        </div>
        {(urgent > 0 || warn > 0) && (
          <div style={{ display:"flex", gap:4, marginTop:3 }}>
            {urgent > 0 && <span style={{ fontSize:"0.48rem", fontWeight:900, color:RED, background:"#FEF2F2", border:"1px solid rgba(220,38,38,0.2)", borderRadius:20, padding:"1px 7px" }}>⚠ {urgent} عاجل</span>}
            {warn > 0   && <span style={{ fontSize:"0.48rem", fontWeight:900, color:AMBER, background:"#FFFBEB", border:"1px solid rgba(217,119,6,0.2)", borderRadius:20, padding:"1px 7px" }}>🔔 {warn} تنبيه</span>}
          </div>
        )}
      </div>

      {/* Stage name + org label */}
      <div style={{ width:195, flexShrink:0, textAlign:"right", paddingRight:8 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:5 }}>
          {isMine && <span style={{ fontSize:"0.44rem", fontWeight:900, color:GOLD2, background:"rgba(197,160,89,0.12)", border:"1px solid rgba(197,160,89,0.3)", borderRadius:20, padding:"1px 6px", whiteSpace:"nowrap" }}>مرحلتك ⭐</span>}
          <span style={{ fontSize:"0.8rem", fontWeight:800, color: isEmpty ? "#C9CDD4" : isFinalStage ? GOLD2 : "#1F2937" }}>{stage.label}</span>
          <span style={{ fontSize:"0.85rem" }}>{stage.icon}</span>
        </div>
        <div style={{ fontSize:"0.52rem", color:"#B0B8C4", marginTop:1 }}>{stage.sub}</div>
      </div>

      {/* Arrow indicator — replaces "دخول" button, row itself is clickable */}
      <div style={{ width:28, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {!isEmpty && (
          <span style={{
            fontSize:"0.85rem", color: isMine || isFinalStage ? GOLD : hov ? BLUE_L : "#D1D5DB",
            opacity: hov ? 1 : 0.4, transition:"all 0.2s",
            transform: hov ? "translateX(-3px)" : "translateX(0)",
            display:"inline-block",
          }}>←</span>
        )}
      </div>

      {/* Hover tooltip — floats above all siblings via row zIndex:50 */}
      {hov && !isEmpty && (
        <div style={{
          position:"absolute", right:4, top:"calc(100% + 4px)", zIndex:9999,
          background:"rgba(255,255,255,0.96)", backdropFilter:"blur(12px)",
          border:"1px solid rgba(197,160,89,0.22)",
          borderRadius:12, padding:"10px 14px",
          boxShadow:"0 8px 28px rgba(0,0,0,0.14)",
          minWidth:170, animation:"tooltipIn 0.15s ease both",
          pointerEvents:"none",
        }}>
          <div style={{ fontSize:"0.68rem", fontWeight:900, color:GOLD2, marginBottom:8, borderBottom:"1px solid rgba(197,160,89,0.12)", paddingBottom:6 }}>{stage.label}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {[
              { l:"نشطة",   v:active, c:BLUE     },
              { l:"مكتملة", v:done,   c:GREEN    },
              { l:"عاجل",   v:urgent, c:RED      },
              { l:"تحذير",  v:warn,   c:AMBER    },
            ].map(({l,v,c}) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", gap:14 }}>
                <span style={{ fontSize:"0.58rem", color:"#9CA3AF" }}>{l}</span>
                <span style={{ fontSize:"0.65rem", fontWeight:900, color:c }}>{v}</span>
              </div>
            ))}
          </div>
          {/* Triangle */}
          <div style={{ position:"absolute", top:-5, right:18, width:9, height:9, transform:"rotate(45deg)", background:"rgba(255,255,255,0.96)", borderTop:"1px solid rgba(197,160,89,0.22)", borderRight:"1px solid rgba(197,160,89,0.22)" }}/>
        </div>
      )}
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

  const METAS: Record<ViewMode,{label:string;accent:string}> = {
    overview:  { label:"جميع العقود",    accent:BLUE  },
    all:       { label:"جميع العقود",    accent:BLUE  },
    active:    { label:"الطلبات النشطة", accent:GOLD  },
    completed: { label:"العقود المكتملة",accent:GREEN },
    rejected:  { label:"العقود المرفوضة",accent:RED   },
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
    if (valMin)        list = list.filter(c => (c.value||0) >= Number(valMin));
    if (valMax)        list = list.filter(c => (c.value||0) <= Number(valMax));
    return [...list].sort((a,b) => {
      let d = 0;
      if (sortBy==="date")  d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy==="value") d = (a.value||0) - (b.value||0);
      if (sortBy==="stage") d = a.currentStage - b.currentStage;
      if (sortBy==="no")    d = a.contractNo.localeCompare(b.contractNo);
      return sortDir==="asc" ? d : -d;
    });
  }, [base, search, vendor, dateFrom, dateTo, valMin, valMax, sortBy, sortDir]);

  function toggleSort(col: typeof sortBy) {
    if (sortBy===col) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  const inp: React.CSSProperties = {
    padding:"8px 12px", borderRadius:10, border:"1.5px solid #E8EAEE",
    background:"rgba(255,255,255,0.9)", fontSize:"0.72rem",
    fontFamily:"'Cairo','Tajawal',sans-serif", outline:"none", color:"#374151",
  };

  return (
    <div style={{ animation:"fadeUp 0.28s ease both" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"0 0 18px" }}>
        <button
          onClick={onBack}
          style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"8px 16px", borderRadius:11,
            border:"1.5px solid #E5E7EB", background:"rgba(255,255,255,0.9)",
            cursor:"pointer", fontSize:"0.74rem", fontWeight:800,
            fontFamily:"'Cairo','Tajawal',sans-serif", color:"#374151",
            boxShadow:"0 2px 8px rgba(0,0,0,0.05)", transition:"all 0.15s",
          }}
          onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor=meta.accent; el.style.color=meta.accent; }}
          onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor="#E5E7EB"; el.style.color="#374151"; }}
        >← رجوع للوحة</button>
        <div style={{ width:1, height:22, background:"#E5E7EB" }}/>
        <div style={{ width:10, height:10, borderRadius:"50%", background:meta.accent, boxShadow:`0 0 0 3px ${meta.accent}28` }}/>
        <span style={{ fontSize:"1rem", fontWeight:900, color:"#111827" }}>{meta.label}</span>
        <span style={{ padding:"3px 12px", borderRadius:20, background:meta.accent+"18", color:meta.accent, fontSize:"0.68rem", fontWeight:800, border:`1px solid ${meta.accent}35` }}>
          {filtered.length} عقد
        </span>
      </div>

      {/* Filters */}
      <div style={{ background:"rgba(255,255,255,0.9)", backdropFilter:"blur(10px)", borderRadius:18, padding:"16px 18px", marginBottom:14, border:"1px solid rgba(229,231,235,0.7)", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#9CA3AF", marginBottom:10, letterSpacing:"0.06em" }}>🔍 مركز الفلاتر المتقدم</div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr", gap:10 }}>
          <input style={inp} placeholder="بحث فوري: العنوان، الرقم، المقاول..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <input style={inp} placeholder="اسم المقاول" value={vendor} onChange={e=>setVendor(e.target.value)}/>
          <input type="date" style={inp} value={dateFrom} onChange={e=>setDateFrom(e.target.value)} title="من تاريخ"/>
          <input type="date" style={inp} value={dateTo} onChange={e=>setDateTo(e.target.value)} title="إلى تاريخ"/>
          <input type="number" style={inp} placeholder="قيمة من" value={valMin} onChange={e=>setValMin(e.target.value)}/>
          <input type="number" style={inp} placeholder="قيمة إلى" value={valMax} onChange={e=>setValMax(e.target.value)}/>
        </div>
        {(search||vendor||dateFrom||dateTo||valMin||valMax) && (
          <button onClick={()=>{setSearch("");setVendor("");setDateFrom("");setDateTo("");setValMin("");setValMax("");}}
            style={{ marginTop:10, padding:"5px 14px", borderRadius:8, border:"1px solid rgba(220,38,38,0.25)", background:"rgba(220,38,38,0.06)", cursor:"pointer", fontSize:"0.63rem", color:RED, fontWeight:700, fontFamily:"'Cairo','Tajawal',sans-serif" }}>
            ✕ مسح الفلاتر
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background:"rgba(255,255,255,0.92)", backdropFilter:"blur(10px)", borderRadius:18, border:"1px solid rgba(229,231,235,0.7)", boxShadow:"0 4px 20px rgba(0,0,0,0.05)", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.74rem" }}>
          <thead>
            <tr style={{ background:"rgba(249,250,251,0.95)", borderBottom:"1.5px solid #E5E7EB" }}>
              {([
                {l:"رقم العقد",       c:"no"    as const},
                {l:"عنوان المشروع",   c:null},
                {l:"المقاول",         c:null},
                {l:"المرحلة",         c:"stage" as const},
                {l:"الحالة",          c:null},
                {l:"القيمة",          c:"value" as const},
                {l:"تاريخ الإنشاء",  c:"date"  as const},
                {l:"",               c:null},
              ]).map(({l,c},i)=>(
                <th key={i} onClick={c?()=>toggleSort(c):undefined}
                  style={{ padding:"11px 14px", textAlign:"right", fontWeight:800, color:"#374151", fontSize:"0.67rem", cursor:c?"pointer":"default", whiteSpace:"nowrap", userSelect:"none" }}>
                  {l}{c && <span style={{ marginRight:4, color:sortBy===c?meta.accent:"#D1D5DB", fontSize:"0.6rem" }}>{sortBy===c?(sortDir==="asc"?"↑":"↓"):"⇅"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={8} style={{ textAlign:"center", padding:"40px", color:"#9CA3AF", fontSize:"0.82rem" }}>لا توجد عقود مطابقة</td></tr>
            ) : filtered.map((c,i)=>{
              const ds = DASH_STAGES[c.currentStage-1];
              const isRej = !!c.rejectionReason && c.status!=="completed";
              const isDone = c.status==="completed";
              const sc = isDone?GREEN_L:isRej?RED:GOLD;
              const sl = isDone?"مكتملة":isRej?"مرفوضة":"نشطة";
              return (
                <tr key={c.id}
                  onClick={()=>onOpenContract(c.id)}
                  style={{ borderBottom:"1px solid #F3F4F6", background:i%2===0?"rgba(255,255,255,0.8)":"rgba(249,250,251,0.5)", transition:"background 0.15s", cursor:"pointer" }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=meta.accent+"14";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=i%2===0?"rgba(255,255,255,0.8)":"rgba(249,250,251,0.5)";}}
                >
                  <td style={{ padding:"10px 14px", fontWeight:800, color:"#374151", whiteSpace:"nowrap" }}>{c.contractNo}</td>
                  <td style={{ padding:"10px 14px", maxWidth:190 }}>
                    <div style={{ fontWeight:700, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                    <div style={{ fontSize:"0.58rem", color:"#9CA3AF" }}>{c.projectName}</div>
                  </td>
                  <td style={{ padding:"10px 14px", color:"#374151" }}>{c.vendorName}</td>
                  <td style={{ padding:"10px 14px", whiteSpace:"nowrap" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, background:"rgba(197,160,89,0.1)", color:GOLD2, border:"1px solid rgba(197,160,89,0.22)", fontSize:"0.6rem", fontWeight:700 }}>
                      م{c.currentStage} {ds?.icon}
                    </span>
                  </td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ padding:"2px 10px", borderRadius:20, background:sc+"18", color:sc, fontSize:"0.6rem", fontWeight:800, border:`1px solid ${sc}30` }}>{sl}</span>
                  </td>
                  <td style={{ padding:"10px 14px", fontWeight:700, color:"#1F2937", whiteSpace:"nowrap" }}>{c.value?`${formatSAR(c.value)} ر.س`:"—"}</td>
                  <td style={{ padding:"10px 14px", color:"#9CA3AF", fontSize:"0.66rem", whiteSpace:"nowrap" }}>{new Date(c.createdAt).toLocaleDateString("ar-SA")}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ fontSize:"0.82rem", color:meta.accent, opacity:0.7 }}>←</span>
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
  const cActive   = contracts.filter(c => c.status==="active" && !c.rejectionReason).length;
  const cDone     = contracts.filter(c => c.status==="completed").length;
  const cRej      = contracts.filter(c => !!c.rejectionReason && c.status!=="completed").length;
  const completePct = total > 0 ? Math.round((cDone / total) * 100) : 0;

  const urgentCount = contracts.filter(c => c.status==="active" && daysSince(c.updatedAt) >= 7).length;
  const warnCount   = contracts.filter(c => c.status==="active" && daysSince(c.updatedAt) >= 3 && daysSince(c.updatedAt) < 7).length;
  const safeCount   = contracts.filter(c => c.status==="active" && daysSince(c.updatedAt) < 3).length;
  const completedThisWeek = contracts.filter(c => c.status==="completed" && daysSince(c.updatedAt) <= 7).length;
  const completedLastWeek = contracts.filter(c => c.status==="completed" && daysSince(c.updatedAt) > 7 && daysSince(c.updatedAt) <= 14).length;

  const avgCycle = useMemo(() => {
    const done = contracts.filter(c => c.status==="completed");
    if (!done.length) return 0;
    return Math.round(done.reduce((s,c) => s + Math.max(0, Math.floor((new Date(c.updatedAt).getTime()-new Date(c.createdAt).getTime())/86400000)), 0) / done.length);
  }, [contracts]);

  const myRoleInfo = ROLES.find(r => r.name===role);
  const maxCount = Math.max(...DASH_STAGES.map(s => contracts.filter(c => s.stageNums.includes(c.currentStage) && c.status==="active").length), 1);

  const pieData = [
    { name:"نشطة",   value:cActive, color:GOLD    },
    { name:"مكتملة", value:cDone,   color:GREEN_L },
    { name:"مرفوضة", value:cRej,    color:RED     },
  ].filter(d => d.value > 0);

  const areaData = [
    { name:"الأسبوع الماضي", مكتملة:completedLastWeek  },
    { name:"هذا الأسبوع",    مكتملة:completedThisWeek },
  ];

  const FOLDERS = [
    { key:"all"       as ViewMode, label:"إجمالي العقود",  sub:"جميع الحالات",     count:total,   icon:"📁", accent:BLUE  },
    { key:"active"    as ViewMode, label:"الطلبات النشطة", sub:"قيد التنفيذ الآن", count:cActive, icon:"⚡", accent:GOLD  },
    { key:"completed" as ViewMode, label:"العقود المكتملة", sub:"أُنجزت بنجاح",   count:cDone,   icon:"✅", accent:GREEN },
    { key:"rejected"  as ViewMode, label:"العقود المرفوضة", sub:"مرفوضة / معادة",  count:cRej,    icon:"↩", accent:RED   },
  ];

  /* reversed display: Final stage (11) → Base (1) */
  const reversedStages = [...DASH_STAGES].reverse();

  return (
    <div dir="rtl" style={{ background:"linear-gradient(165deg,#F7F9FC 0%,#F0F2F7 100%)", minHeight:"100%", fontFamily:"'Cairo','Tajawal',sans-serif" }}>
      <style>{`
        @keyframes rowFadeIn { from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes glowLogo  { 0%,100%{box-shadow:0 0 0 2px rgba(197,160,89,0.32),0 4px 20px rgba(0,0,0,0.16)} 50%{box-shadow:0 0 0 3.5px rgba(197,160,89,0.62),0 6px 30px rgba(197,160,89,0.24)} }
        @keyframes urgBlink  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes pulseWaveScroll { from{transform:translateX(0)} to{transform:translateX(-220px)} }
        @keyframes pulseDot  { 0%,100%{opacity:1;transform:translateY(-50%) scale(1)} 50%{opacity:0.6;transform:translateY(-50%) scale(1.5)} }
        @keyframes breatheNum{ 0%,100%{opacity:1;filter:drop-shadow(0 0 0px rgba(226,194,117,0))} 50%{opacity:0.82;filter:drop-shadow(0 0 10px rgba(226,194,117,0.55))} }
        @keyframes tooltipIn { from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)} }
        @keyframes cardBreath{ 0%,100%{box-shadow:0 4px 16px rgba(0,0,0,0.05)} 50%{box-shadow:0 6px 24px rgba(0,0,0,0.08)} }
      `}</style>

      {/* ═══ HEADER ══════════════════════════════════════════════ */}
      <div style={{
        background:"rgba(255,255,255,0.88)",
        backdropFilter:"blur(18px)",
        borderBottom:"1px solid rgba(220,220,220,0.6)",
        padding:"12px 28px",
        display:"flex", alignItems:"center", gap:14,
        boxShadow:"0 4px 24px rgba(0,0,0,0.06)",
        position:"sticky", top:0, zIndex:30,
      }}>
        {/* Floating logo */}
        <div style={{ width:48, height:48, borderRadius:15, overflow:"hidden", flexShrink:0, animation:"glowLogo 4s ease infinite" }}>
          <img src={logoImg} alt="الرواف" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        </div>
        <div>
          <div style={{ fontSize:"0.45rem", fontWeight:900, letterSpacing:"0.16em", color:GOLD2, marginBottom:1 }}>ALRAWAF CONTRACTING</div>
          <div style={{ fontSize:"1.18rem", fontWeight:900, letterSpacing:"-0.025em", background:`linear-gradient(120deg,#1A1A2E,#374151,${GOLD2})`, backgroundSize:"200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            لوحة القيادة التنفيذية
          </div>
          <div style={{ fontSize:"0.55rem", color:"#9CA3AF", marginTop:1 }}>
            {role ? `${actorName||role} · ${pendingContracts.length} عقد بانتظار قرارك` : "نظام إدارة العقود — الجيل الثالث"}
          </div>
        </div>

        <div style={{ marginRight:"auto", display:"flex", alignItems:"center", gap:12 }}>
          {urgentCount > 0 && (
            <div style={{ background:"#FEF2F2", border:"1px solid rgba(220,38,38,0.3)", borderRadius:20, padding:"5px 13px", fontSize:"0.6rem", fontWeight:900, color:RED, animation:"urgBlink 2.5s ease infinite" }}>
              ⚠️ {urgentCount} عاجل
            </div>
          )}
          <PulseWave pct={completePct} active={cActive} done={cDone} total={total}/>
        </div>
      </div>

      <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:18 }}>

        {viewMode !== "overview" ? (
          <ContractDataTable contracts={contracts} mode={viewMode} onOpenContract={onOpenContract} onBack={()=>setViewMode("overview")}/>
        ) : (
          <>
            {/* ── Smart Folder Cards ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, animation:"fadeUp 0.38s ease both" }}>
              {FOLDERS.map(f => (
                <FolderCard key={f.key} label={f.label} sub={f.sub} count={f.count} icon={f.icon} accent={f.accent} onClick={()=>setViewMode(f.key)}/>
              ))}
            </div>

            {/* ── Elite Workflow (Top authority → Bottom) ── */}
            <div style={{
              background:"rgba(255,255,255,0.88)", backdropFilter:"blur(12px)",
              border:"1px solid rgba(220,220,220,0.6)", borderRadius:24,
              boxShadow:"0 6px 32px rgba(0,0,0,0.07)",
              animation:"fadeUp 0.4s ease 0.06s both",
              position:"relative",
            }}>
              {/* Header */}
              <div style={{ padding:"16px 24px 13px", borderBottom:"1px solid rgba(0,0,0,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:4, height:32, borderRadius:2, background:`linear-gradient(180deg,${GOLD_END},${GOLD}60)` }}/>
                  <div>
                    <div style={{ fontSize:"0.95rem", fontWeight:900, color:"#111827" }}>الهيكل التنظيمي الوظيفي — مسار العقود</div>
                    <div style={{ fontSize:"0.56rem", color:"#B0B8C4", marginTop:1 }}>من الاعتماد النهائي إلى المستوى القاعدي · مرّر الفأرة لتفاصيل كل مرحلة</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {myRoleInfo && (
                    <div style={{ background:"rgba(197,160,89,0.09)", border:"1px solid rgba(197,160,89,0.22)", borderRadius:20, padding:"5px 14px", fontSize:"0.6rem", fontWeight:800, color:GOLD2 }}>
                      {myRoleInfo.icon} مرحلتك: {myRoleInfo.stage.map(s=>`م${s}`).join("، ")}
                    </div>
                  )}
                  <div style={{ background:"rgba(0,0,0,0.04)", borderRadius:20, padding:"5px 12px", fontSize:"0.58rem", color:"#6B7280", fontWeight:700 }}>{maxCount} أعلى عدد</div>
                </div>
              </div>
              {/* Rows */}
              <div style={{ padding:"8px 22px 14px" }}>
                {reversedStages.map((stage, idx) => (
                  <EliteStageRow
                    key={stage.stageNums[0]}
                    stage={stage}
                    contracts={contracts}
                    maxCount={maxCount}
                    isMine={stage.stageNums.some(n => myRoleInfo?.stage.includes(n) ?? false)}
                    onEnter={()=>onOpenStage(stage.stageNums[0])}
                    idx={idx}
                  />
                ))}
              </div>
            </div>

            {/* ── Analytics Row (side-by-side) ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, animation:"fadeUp 0.4s ease 0.1s both" }}>

              {/* Pie */}
              <div style={{ background:"rgba(255,255,255,0.88)", backdropFilter:"blur(10px)", border:"1px solid rgba(220,220,220,0.6)", borderRadius:22, overflow:"hidden", boxShadow:"0 4px 20px rgba(0,0,0,0.05)", animation:"cardBreath 6s ease infinite" }}>
                <div style={{ padding:"14px 20px 12px", borderBottom:"1px solid rgba(0,0,0,0.05)", display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:5, height:28, borderRadius:2, background:`linear-gradient(180deg,${GOLD},${GOLD_END})` }}/>
                  <div>
                    <div style={{ fontSize:"0.82rem", fontWeight:900, color:"#111827" }}>توزيع الحالات</div>
                    <div style={{ fontSize:"0.54rem", color:"#B0B8C4" }}>نسبة كل حالة من الإجمالي</div>
                  </div>
                </div>
                <div style={{ padding:"14px 20px", display:"flex", alignItems:"center", gap:18 }}>
                  <div style={{ width:100, height:100, flexShrink:0 }}>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={5} dataKey="value">
                            {pieData.map((d,i)=><Cell key={i} fill={d.color} stroke="none"/>)}
                          </Pie>
                          <Tooltip formatter={(v:unknown)=>[`${v} عقد`,""]} contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.7rem", direction:"rtl", borderRadius:12, border:"1px solid #E5E7EB" }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#D1D5DB", fontSize:"0.72rem" }}>لا بيانات</div>
                    )}
                  </div>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                    {[{label:"نشطة",count:cActive,color:GOLD},{label:"مكتملة",count:cDone,color:GREEN_L},{label:"مرفوضة",count:cRej,color:RED}].map((item,i)=>(
                      <div key={i}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:"0.76rem", fontWeight:900, color:item.color }}>{item.count}</span>
                          <span style={{ fontSize:"0.6rem", color:"#9CA3AF" }}>{item.label}</span>
                        </div>
                        <div style={{ height:5, background:"rgba(0,0,0,0.06)", borderRadius:99, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:total>0?`${Math.round(item.count/total*100)}%`:"0%", borderRadius:99, background:item.color, transition:"width 1s ease" }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weekly chart + priority */}
              <div style={{ background:"rgba(255,255,255,0.88)", backdropFilter:"blur(10px)", border:"1px solid rgba(220,220,220,0.6)", borderRadius:22, overflow:"hidden", boxShadow:"0 4px 20px rgba(0,0,0,0.05)", animation:"cardBreath 6s ease 2s infinite" }}>
                <div style={{ padding:"14px 20px 12px", borderBottom:"1px solid rgba(0,0,0,0.05)", display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:5, height:28, borderRadius:2, background:`linear-gradient(180deg,${GREEN_L},${GREEN})` }}/>
                  <div>
                    <div style={{ fontSize:"0.82rem", fontWeight:900, color:"#111827" }}>الأداء الأسبوعي</div>
                    <div style={{ fontSize:"0.54rem", color:"#B0B8C4" }}>عقود منجزة هذا الأسبوع مقارنةً بالسابق</div>
                  </div>
                </div>
                <div style={{ padding:"12px 18px", display:"flex", flexDirection:"column", gap:10 }}>
                  <ResponsiveContainer width="100%" height={62}>
                    <AreaChart data={areaData} margin={{top:2,right:4,left:-24,bottom:0}}>
                      <defs>
                        <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={GREEN_L} stopOpacity={0.32}/>
                          <stop offset="100%" stopColor={GREEN_L} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false}/>
                      <XAxis dataKey="name" tick={{fontSize:8,fill:"#9CA3AF",fontFamily:"'Cairo',sans-serif"}} axisLine={false} tickLine={false}/>
                      <Area type="monotone" dataKey="مكتملة" stroke={GREEN_L} strokeWidth={2.5} fill="url(#aGrad)" dot={{r:4,fill:GREEN,stroke:"#fff",strokeWidth:2.5}}/>
                      <Tooltip formatter={(v:unknown)=>[`${v} عقد`,""]} contentStyle={{fontFamily:"'Cairo',sans-serif",fontSize:"0.7rem",direction:"rtl",borderRadius:12,border:"1px solid #E5E7EB"}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ borderTop:"1px solid rgba(0,0,0,0.05)", paddingTop:10, display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ fontSize:"0.56rem", fontWeight:800, color:"#B0B8C4", marginBottom:2 }}>🚦 توزيع الأولوية الزمنية</div>
                    {[
                      {label:"عاجل ≥٧ أيام",  count:urgentCount, color:RED    },
                      {label:"تحذير ٣–٧ أيام", count:warnCount,   color:AMBER  },
                      {label:"طبيعي < ٣ أيام", count:safeCount,   color:GREEN_L},
                    ].map((item,i)=>(
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:"0.56rem", color:"#6B7280" }}>{item.label}</span>
                        <span style={{ minWidth:24, height:20, borderRadius:10, background:item.color+"18", color:item.color, fontSize:"0.62rem", fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 7px" }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Luxury dark KPI strip ── */}
            <div style={{
              background:`linear-gradient(130deg,${DARK} 0%,${DARK2} 45%,${DARK} 100%)`,
              borderRadius:22, padding:"15px 28px",
              display:"flex", alignItems:"center",
              border:"1px solid rgba(197,160,89,0.24)",
              boxShadow:"0 10px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(197,160,89,0.12)",
              animation:"fadeUp 0.4s ease 0.15s both",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:-60, right:"30%", width:200, height:180, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(197,160,89,0.06) 0%,transparent 70%)", pointerEvents:"none" }}/>
              {[
                { label:"متوسط زمن الإنجاز",   value: avgCycle>0 ? `${avgCycle} يوم` : "—",  icon:"⏱️" },
                { label:"الطلبات في المسار",    value:`${cActive} عقد`,                         icon:"⚡" },
                { label:"مكتملة هذا الأسبوع",   value:`${completedThisWeek} عقد`,               icon:"📈" },
                { label:"نسبة الإنجاز الكلية",  value:`${completePct}%`,                         icon:"🎯" },
              ].map((item,i,arr)=>(
                <div key={i} style={{ flex:1, textAlign:"center", borderLeft:i<arr.length-1?"1px solid rgba(197,160,89,0.14)":"none", padding:"0 8px" }}>
                  <div style={{ fontSize:"0.54rem", color:"rgba(226,194,117,0.48)", marginBottom:5 }}>{item.icon} {item.label}</div>
                  <div style={{ fontSize:"1.08rem", fontWeight:900, letterSpacing:"-0.02em", background:`linear-gradient(135deg,${GOLD_END},${GOLD})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", filter:`drop-shadow(0 0 6px rgba(197,160,89,0.35))` }}>
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
