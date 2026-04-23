import { useEffect, useState, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { listContracts, getContractStats, getRecentActivity } from "./api";
import type { ActivityEntry, AnalyticsFilters } from "./api";
import type { Contract, ContractStats } from "./types";
import { STAGES, GOLD, GOLD_BG, GOLD_BORDER } from "./types";

const GOLD2 = "#a88540";
const GOLD_GRAD_START = "#C5A059";
const GOLD_GRAD_END   = "#8B6914";
const GREEN  = "#27ae60";
const YELLOW = "#f39c12";
const RED    = "#c0392b";

const STAGE_SHORT = [
  "إنشاء", "اعتماد قطاع", "PMO", "قانوني",
  "صياغة", "مسودة", "مدير إدارة", "نائب رئيس",
  "رئيس تنفيذي", "توقيعات", "مكتمل",
];

interface Props {
  onNavigateStage: (stage: number) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "الآن";
  if (mins  < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
}

function numberToArabic(n: number): string {
  const map: Record<number, string> = {0:"٠",1:"١",2:"٢",3:"٣",4:"٤",5:"٥",6:"٦",7:"٧",8:"٨",9:"٩"};
  return String(n).split("").map(d => map[parseInt(d)] ?? d).join("");
}

const PIE_COLORS = [GREEN, GOLD, RED, "#3498db"];

type DatePreset = "all" | "thisMonth" | "thisQuarter" | "thisYear" | "custom";

function getPresetRange(preset: DatePreset, customFrom: string, customTo: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (preset === "thisMonth") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() };
  }
  if (preset === "thisQuarter") {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3, 1);
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() };
  }
  if (preset === "thisYear") {
    const from = new Date(now.getFullYear(), 0, 1);
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() };
  }
  if (preset === "custom") {
    return {
      dateFrom: customFrom ? new Date(customFrom).toISOString() : undefined,
      dateTo:   customTo   ? new Date(customTo + "T23:59:59").toISOString() : undefined,
    };
  }
  return {};
}

export default function ContractAnalytics({ onNavigateStage }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats]         = useState<ContractStats | null>(null);
  const [activity, setActivity]   = useState<ActivityEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const [datePreset, setDatePreset]     = useState<DatePreset>("all");
  const [customDateFrom, setCustomFrom] = useState("");
  const [customDateTo, setCustomTo]     = useState("");
  const [valueMin, setValueMin]         = useState("");
  const [valueMax, setValueMax]         = useState("");

  const load = useCallback(async () => {
    const { dateFrom, dateTo } = getPresetRange(datePreset, customDateFrom, customDateTo);
    const filters: AnalyticsFilters = {
      dateFrom,
      dateTo,
      valueMin: valueMin ? parseInt(valueMin, 10) : undefined,
      valueMax: valueMax ? parseInt(valueMax, 10) : undefined,
    };
    try {
      const [c, s, a] = await Promise.all([
        listContracts(filters),
        getContractStats(filters),
        getRecentActivity({ dateFrom, dateTo }),
      ]);
      setContracts(c);
      setStats(s);
      setActivity(a);
    } finally {
      setLoading(false);
    }
  }, [datePreset, customDateFrom, customDateTo, valueMin, valueMax]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const stageData = STAGE_SHORT.map((name, i) => ({
    name,
    fullName: STAGES[i]?.label ?? name,
    stage: i + 1,
    count: contracts.filter(c => c.currentStage === i + 1).length,
  }));

  const rejected = contracts.filter(c => c.rejectionReason && c.status !== "completed").length;
  const completed = contracts.filter(c => c.status === "completed").length;
  const inProgress = contracts.filter(c => c.status === "active" && c.currentStage >= 2 && c.currentStage <= 9).length;
  const pending = contracts.filter(c => c.status === "active" && c.currentStage <= 1).length;

  const pieData = [
    { name: "مكتملة", value: completed || 0 },
    { name: "قيد الإجراء", value: inProgress || 0 },
    { name: "مُعادة", value: rejected || 0 },
    { name: "جديدة", value: pending || 0 },
  ].filter(d => d.value > 0);

  const senior = contracts.filter(c => c.status === "active" && (c.currentStage === 8 || c.currentStage === 9)).length;
  const review = contracts.filter(c => c.status === "active" && c.currentStage >= 1 && c.currentStage <= 7).length;
  const signed = contracts.filter(c => c.status === "completed").length;

  function handleExportPDF() {
    const style = document.createElement("style");
    style.id = "print-analytics-style";
    style.textContent = `
      @media print {
        body > *:not(#analytics-print-root) { display: none !important; }
        #analytics-print-root { display: block !important; position: static !important; }
        .no-print { display: none !important; }
        .recharts-wrapper { page-break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
    if (printRef.current) {
      printRef.current.id = "analytics-print-root";
    }
    window.print();
    setTimeout(() => {
      document.head.removeChild(style);
      if (printRef.current) printRef.current.removeAttribute("id");
    }, 1000);
  }

  const kpiCards = [
    {
      label: "إجمالي العقود",
      value: stats?.total ?? contracts.length,
      icon: "📁",
      sub: "جميع العقود في النظام",
      color: GOLD,
      bg: "linear-gradient(135deg, rgba(197,160,89,0.12), rgba(197,160,89,0.04))",
      arrow: true,
    },
    {
      label: "قيد المراجعة",
      value: review,
      icon: "🔄",
      sub: "المراحل من 1 إلى 7",
      color: YELLOW,
      bg: "linear-gradient(135deg, rgba(243,156,18,0.10), rgba(243,156,18,0.03))",
    },
    {
      label: "اعتماد الإدارة العليا",
      value: senior,
      icon: "👑",
      sub: "المرحلتان 8 و9",
      color: "#9b59b6",
      bg: "linear-gradient(135deg, rgba(155,89,182,0.10), rgba(155,89,182,0.03))",
    },
    {
      label: "مكتملة وموقعة",
      value: signed,
      icon: "✅",
      sub: "تم الإغلاق والأرشفة",
      color: GREEN,
      bg: "linear-gradient(135deg, rgba(39,174,96,0.10), rgba(39,174,96,0.03))",
    },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
        <div style={{ textAlign: "center", color: "#9b8060" }}>
          <div style={{ fontSize: "2rem", marginBottom: 10 }}>📊</div>
          <div>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={printRef} dir="rtl" style={{ padding: "24px 28px", background: "#F9F9F9", minHeight: "100vh", fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; color-adjust: exact; }
          .no-print { display: none !important; }
          .print-header { display: block !important; }
        }
        .analytics-bar:hover { filter: brightness(1.15); cursor: pointer; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#1a1206", marginBottom: 4 }}>
            📊 لوحة التحليلات والتقارير
          </h2>
          <p style={{ color: "#9b8060", fontSize: "0.8rem" }}>
            رسوم بيانية تفاعلية وإحصائيات شاملة — تُحدَّث كل 30 ثانية
          </p>
        </div>
        <button
          className="no-print"
          onClick={handleExportPDF}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
            color: "#fff", fontWeight: 800, fontSize: "0.82rem",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            cursor: "pointer", boxShadow: "0 4px 16px rgba(197,160,89,0.4)",
            transition: "all 0.2s",
          }}
        >
          <span>📄</span>
          تصدير تقرير PDF
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="no-print" style={{
        background: "#fff", border: `1px solid ${GOLD_BORDER}`,
        borderRadius: 12, padding: "14px 18px", marginBottom: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Date preset buttons */}
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#8B6914", whiteSpace: "nowrap" }}>
            📅 الفترة الزمنية:
          </span>
          {(["all", "thisMonth", "thisQuarter", "thisYear", "custom"] as DatePreset[]).map(preset => {
            const labels: Record<DatePreset, string> = {
              all: "الكل", thisMonth: "هذا الشهر",
              thisQuarter: "هذا الربع", thisYear: "هذه السنة", custom: "مخصص",
            };
            const active = datePreset === preset;
            return (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                style={{
                  padding: "5px 12px", borderRadius: 7, border: `1px solid ${active ? GOLD : GOLD_BORDER}`,
                  background: active ? `linear-gradient(135deg, ${GOLD}, ${GOLD2})` : GOLD_BG,
                  color: active ? "#fff" : "#8B6914",
                  fontSize: "0.72rem", fontWeight: 700,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: active ? "0 2px 8px rgba(197,160,89,0.35)" : "none",
                }}
              >
                {labels[preset]}
              </button>
            );
          })}

          {/* Custom date pickers */}
          {datePreset === "custom" && (
            <>
              <span style={{ fontSize: "0.7rem", color: "#9b8060", marginRight: 4 }}>من:</span>
              <input
                type="date"
                value={customDateFrom}
                onChange={e => setCustomFrom(e.target.value)}
                style={{
                  padding: "4px 8px", borderRadius: 7, border: `1px solid ${GOLD_BORDER}`,
                  background: GOLD_BG, color: "#4a3520", fontSize: "0.72rem",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                }}
              />
              <span style={{ fontSize: "0.7rem", color: "#9b8060" }}>إلى:</span>
              <input
                type="date"
                value={customDateTo}
                onChange={e => setCustomTo(e.target.value)}
                style={{
                  padding: "4px 8px", borderRadius: 7, border: `1px solid ${GOLD_BORDER}`,
                  background: GOLD_BG, color: "#4a3520", fontSize: "0.72rem",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                }}
              />
            </>
          )}

          {/* Value range */}
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#8B6914", marginRight: 8, whiteSpace: "nowrap" }}>
            💰 القيمة (ر.س):
          </span>
          <input
            type="number"
            placeholder="الحد الأدنى"
            value={valueMin}
            onChange={e => setValueMin(e.target.value)}
            min={0}
            style={{
              width: 110, padding: "4px 8px", borderRadius: 7, border: `1px solid ${GOLD_BORDER}`,
              background: GOLD_BG, color: "#4a3520", fontSize: "0.72rem",
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
            }}
          />
          <span style={{ fontSize: "0.7rem", color: "#9b8060" }}>—</span>
          <input
            type="number"
            placeholder="الحد الأقصى"
            value={valueMax}
            onChange={e => setValueMax(e.target.value)}
            min={0}
            style={{
              width: 110, padding: "4px 8px", borderRadius: 7, border: `1px solid ${GOLD_BORDER}`,
              background: GOLD_BG, color: "#4a3520", fontSize: "0.72rem",
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
            }}
          />

          {/* Reset button */}
          {(datePreset !== "all" || valueMin || valueMax) && (
            <button
              onClick={() => {
                setDatePreset("all");
                setCustomFrom("");
                setCustomTo("");
                setValueMin("");
                setValueMax("");
              }}
              style={{
                padding: "5px 10px", borderRadius: 7,
                border: "1px solid rgba(192,57,43,0.3)",
                background: "rgba(192,57,43,0.07)",
                color: "#c0392b", fontSize: "0.7rem", fontWeight: 700,
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                cursor: "pointer",
              }}
            >
              ✕ مسح الفلاتر
            </button>
          )}
        </div>

        {/* Active filter summary */}
        {(datePreset !== "all" || valueMin || valueMax) && (
          <div style={{ marginTop: 8, fontSize: "0.68rem", color: "#9b8060", display: "flex", gap: 12, flexWrap: "wrap" }}>
            {datePreset !== "all" && (() => {
              const { dateFrom, dateTo } = getPresetRange(datePreset, customDateFrom, customDateTo);
              const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) : "—";
              return <span>📅 {fmt(dateFrom)} ← {fmt(dateTo)}</span>;
            })()}
            {valueMin && <span>💰 من {parseInt(valueMin).toLocaleString("ar-SA")} ر.س</span>}
            {valueMax && <span>حتى {parseInt(valueMax).toLocaleString("ar-SA")} ر.س</span>}
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {kpiCards.map((card, i) => (
          <div key={i} style={{
            background: card.bg,
            border: `1px solid rgba(0,0,0,0.08)`,
            borderTop: `3px solid ${card.color}`,
            borderRadius: 14,
            padding: "18px 20px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.7)",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 12, left: 14, fontSize: "1.6rem", opacity: 0.12 }}>
              {card.icon}
            </div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: card.color, marginBottom: 6, letterSpacing: "0.03em" }}>
              {card.icon} {card.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: "2.2rem", fontWeight: 900, color: "#1a1206", lineHeight: 1 }}>
                {numberToArabic(card.value)}
              </span>
              {card.arrow && (
                <span style={{ fontSize: "0.75rem", color: GREEN, fontWeight: 700 }}>▲ نشط</span>
              )}
            </div>
            <div style={{ fontSize: "0.68rem", color: "#9b8060", marginTop: 4 }}>{card.sub}</div>
            <div style={{
              position: "absolute", bottom: 0, right: 0, left: 0,
              height: 3,
              background: `linear-gradient(90deg, ${card.color}, transparent)`,
              opacity: 0.4,
            }} />
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18, marginBottom: 20 }}>

        {/* Bar Chart */}
        <div style={{
          background: "#fff", border: `1px solid ${GOLD_BORDER}`,
          borderRadius: 14, padding: "22px 20px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1a1206", marginBottom: 2 }}>
              توزيع العقود على المراحل الـ11
            </div>
            <div style={{ fontSize: "0.7rem", color: "#9b8060" }}>
              انقر على أي عمود لعرض العقود في تلك المرحلة
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={stageData}
              margin={{ top: 5, right: 5, left: -20, bottom: 50 }}
              onClick={(data) => {
                if (data && data.activePayload?.[0]) {
                  const payload = data.activePayload[0].payload as { stage: number };
                  onNavigateStage(payload.stage);
                }
              }}
            >
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD_GRAD_START} stopOpacity={1} />
                  <stop offset="100%" stopColor={GOLD_GRAD_END} stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: "#6b6360", fontFamily: "'Cairo', sans-serif" }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={55}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9b8060" }}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value: unknown) => [`${value} عقد`, "العدد"]}
                labelFormatter={(label: unknown) => {
                  const item = stageData.find(d => d.name === label);
                  return item ? item.fullName : String(label);
                }}
                contentStyle={{
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  fontSize: "0.78rem",
                  direction: "rtl",
                  border: `1px solid ${GOLD_BORDER}`,
                  borderRadius: 8,
                }}
                cursor={{ fill: "rgba(197,160,89,0.08)" }}
              />
              <Bar
                dataKey="count"
                fill="url(#goldGradient)"
                radius={[4, 4, 0, 0]}
                maxBarSize={38}
                className="analytics-bar"
                shape={(props: unknown) => {
                  const p = props as Record<string, unknown>;
                  const h = typeof p.height === "number" ? p.height : 0;
                  const x = typeof p.x === "number" ? p.x : 0;
                  const y = typeof p.y === "number" ? p.y : 0;
                  const w = typeof p.width === "number" ? p.width : 0;
                  if (h <= 0) return <rect x={x} y={y} width={w} height={0} />;
                  return (
                    <g>
                      <defs>
                        <linearGradient id={`bar-${x}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={GOLD_GRAD_START} />
                          <stop offset="100%" stopColor={GOLD_GRAD_END} />
                        </linearGradient>
                      </defs>
                      <rect x={x} y={y} width={w} height={h} fill={`url(#bar-${x})`} rx={4} style={{ cursor: "pointer" }} />
                    </g>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart */}
        <div style={{
          background: "#fff", border: `1px solid ${GOLD_BORDER}`,
          borderRadius: 14, padding: "22px 20px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1a1206", marginBottom: 2 }}>
            توزيع حالة العقود
          </div>
          <div style={{ fontSize: "0.7rem", color: "#9b8060", marginBottom: 8 }}>
            نسبة الإنجاز العامة
          </div>

          {pieData.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9b8060", fontSize: "0.8rem" }}>
              لا توجد عقود بعد
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => [`${value} عقد`, ""]}
                  contentStyle={{
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    fontSize: "0.78rem",
                    direction: "rtl",
                    border: `1px solid ${GOLD_BORDER}`,
                    borderRadius: 8,
                  }}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: "0.72rem", fontFamily: "'Cairo', sans-serif", color: "#4a3520" }}>{value}</span>}
                  iconSize={10}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Completion % */}
          {contracts.length > 0 && (
            <div style={{
              marginTop: "auto", background: GOLD_BG, border: `1px solid ${GOLD_BORDER}`,
              borderRadius: 8, padding: "8px 12px", textAlign: "center",
            }}>
              <span style={{ fontSize: "0.68rem", color: "#9b8060" }}>نسبة الإنجاز الإجمالية: </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "#8B6914" }}>
                {numberToArabic(Math.round((completed / contracts.length) * 100))}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Live Activity Feed ── */}
      <div style={{
        background: "#fff", border: `1px solid ${GOLD_BORDER}`,
        borderRadius: 14, overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
      }}>
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${GOLD_BORDER}`,
          background: "linear-gradient(135deg, #faf9f5, #f5f0e8)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1a1206" }}>
              ⚡ السجل اللحظي
            </div>
            <div style={{ fontSize: "0.68rem", color: "#9b8060" }}>آخر العمليات المُنجزة في النظام</div>
          </div>
          <button
            className="no-print"
            onClick={load}
            style={{
              padding: "6px 12px", borderRadius: 7,
              border: `1px solid ${GOLD_BORDER}`,
              background: GOLD_BG, color: "#8B6914",
              fontSize: "0.72rem", fontWeight: 700,
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              cursor: "pointer",
            }}
          >
            🔄 تحديث
          </button>
        </div>

        {activity.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#9b8060", fontSize: "0.82rem" }}>
            لا توجد عمليات مسجلة بعد
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#faf9f5" }}>
                {["اسم العقد", "المرحلة", "الإجراء", "المسؤول", "الوقت"].map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "right",
                    fontSize: "0.72rem", fontWeight: 700, color: "#8B6914",
                    borderBottom: `1px solid ${GOLD_BORDER}`,
                    letterSpacing: "0.03em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activity.slice(0, 8).map((a, i) => (
                <tr key={a.logId} style={{
                  borderBottom: `1px solid rgba(0,0,0,0.04)`,
                  background: i % 2 === 0 ? "#fff" : "#fdfcfa",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = GOLD_BG)}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fdfcfa")}
                >
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1a1206" }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "#9b8060" }}>{a.contractNo}</div>
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 9px", borderRadius: 6,
                      background: GOLD_BG, border: `1px solid ${GOLD_BORDER}`,
                      fontSize: "0.7rem", fontWeight: 700, color: "#8B6914",
                    }}>
                      م{a.stage} — {STAGES[a.stage - 1]?.label?.substring(0, 12) ?? ""}
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 9px", borderRadius: 6,
                      background: a.action === "advance"
                        ? "rgba(39,174,96,0.10)"
                        : "rgba(192,57,43,0.10)",
                      border: a.action === "advance"
                        ? "1px solid rgba(39,174,96,0.25)"
                        : "1px solid rgba(192,57,43,0.25)",
                      fontSize: "0.7rem", fontWeight: 700,
                      color: a.action === "advance" ? GREEN : RED,
                    }}>
                      {a.action === "advance" ? "✓ اعتماد" : "↩ إرجاع"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#3a3632" }}>
                      {a.actorName}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "#9b8060" }}>{a.actorRole}</div>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: "0.72rem", color: "#9b8060", whiteSpace: "nowrap" }}>
                    {timeAgo(a.logCreatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Print Header (only shows in print) ── */}
      <div style={{ display: "none" }} className="print-header">
        <div style={{ textAlign: "center", marginBottom: 24, borderBottom: `2px solid ${GOLD}`, paddingBottom: 16 }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#1a1206" }}>
            🏛️ شركة الرواف للمقاولات
          </div>
          <div style={{ fontSize: "0.9rem", color: "#8B6914", marginTop: 4 }}>
            تقرير إحصائيات نظام إدارة العقود
          </div>
          <div style={{ fontSize: "0.75rem", color: "#9b8060", marginTop: 4 }}>
            تاريخ التقرير: {new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
          </div>
          {(() => {
            const fmtDate = (d?: string) =>
              d ? new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }) : "—";
            const periodLabels: Record<DatePreset, string> = {
              all: "", thisMonth: "هذا الشهر", thisQuarter: "هذا الربع", thisYear: "هذه السنة", custom: "مخصص",
            };
            const parts: string[] = [];
            if (datePreset !== "all") {
              const { dateFrom, dateTo } = getPresetRange(datePreset, customDateFrom, customDateTo);
              if (datePreset !== "custom" || dateFrom || dateTo) {
                parts.push(`الفترة: ${periodLabels[datePreset]} (${fmtDate(dateFrom)} — ${fmtDate(dateTo)})`);
              }
            }
            if (valueMin && valueMax) {
              parts.push(`القيمة: من ${parseInt(valueMin).toLocaleString("ar-SA")} ر.س إلى ${parseInt(valueMax).toLocaleString("ar-SA")} ر.س`);
            } else if (valueMin) {
              parts.push(`القيمة: من ${parseInt(valueMin).toLocaleString("ar-SA")} ر.س فأكثر`);
            } else if (valueMax) {
              parts.push(`القيمة: حتى ${parseInt(valueMax).toLocaleString("ar-SA")} ر.س`);
            }
            if (parts.length === 0) return null;
            return (
              <div style={{
                marginTop: 10, display: "inline-block",
                background: "rgba(197,160,89,0.10)", border: `1px solid ${GOLD_BORDER}`,
                borderRadius: 8, padding: "6px 18px",
              }}>
                {parts.map((p, i) => (
                  <div key={i} style={{ fontSize: "0.78rem", color: "#8B6914", fontWeight: 700 }}>
                    {p}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

    </div>
  );
}
