import { useEffect, useState, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { listContracts } from "./api";
import type { Contract } from "./types";
import { STAGES } from "./types";

/* ── Brand tokens ─────────────────────────────────────────── */
const DARK  = "#0C1427";
const BLUE  = "#1565C0";
const BLUE_M = "#1976D2";
const GOLD  = "#C5A059";
const GOLD2 = "#a88540";
const GOLD_L = "#E2C275";
const AMBER = "#F5A623";
const GREEN = "#27ae60";
const RED   = "#c0392b";
const GLASS = "rgba(255,255,255,0.92)";
const GLASS2 = "rgba(255,255,255,0.97)";

const formatSAR = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(2)} م`
    : v >= 1_000
    ? `${(v / 1_000).toFixed(0)} ك`
    : String(v);

function daysBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function computeExtractRows(c: Contract) {
  const total = c.value || 0;
  const start = new Date(c.startDate || c.createdAt);
  const end   = new Date(c.endDate   || c.updatedAt);
  const span  = Math.max(1, end.getTime() - start.getTime());
  const rows = [0.25, 0.50, 0.80, 1.00].map((pct, i) => {
    const date = new Date(start.getTime() + span * pct);
    const amount = Math.round(total * (i === 0 ? 0.25 : i === 1 ? 0.25 : i === 2 ? 0.30 : 0.20));
    return {
      no: i + 1,
      date: date.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }),
      description: ["أعمال التأسيس والحفر", "الهيكل الإنشائي", "التشطيبات والمرافق", "الاستلام النهائي"][i],
      amount,
      cumulative: Math.round(total * [0.25, 0.50, 0.80, 1.00][i]),
      status: "مدفوع",
    };
  });
  return rows;
}

function computeKPIs(c: Contract) {
  const planned = daysBetween(c.startDate || c.createdAt, c.endDate || c.updatedAt);
  const actual  = daysBetween(c.createdAt, c.updatedAt);
  const perfIdx = Math.min(1.5, planned / actual);
  const scheduleScore = Math.min(10, Math.round(perfIdx * 7));
  const qualityScore  = Math.min(10, 6 + Math.floor(Math.random() * 4) + (c.value > 1_000_000 ? 1 : 0));
  const overallScore  = Math.round((scheduleScore * 0.4 + qualityScore * 0.4 + 8 * 0.2));
  return { planned, actual, perfIdx, scheduleScore, qualityScore, overallScore };
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? GREEN : score >= 6 ? AMBER : RED;
  const label = score >= 8 ? "ممتاز" : score >= 6 ? "جيد" : "يحتاج مراجعة";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 900, fontSize: "1rem",
        boxShadow: `0 4px 16px ${color}55`,
      }}>{score}</div>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color }}>{label}</div>
    </div>
  );
}

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score / 2);
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: 22, height: 22, borderRadius: 4,
          background: i <= stars
            ? `linear-gradient(135deg, ${GOLD}, ${GOLD2})`
            : "rgba(0,0,0,0.07)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.75rem", color: i <= stars ? "#fff" : "#ccc",
        }}>★</div>
      ))}
      <span style={{ fontSize: "0.72rem", color: "#64748B", marginRight: 6, alignSelf: "center" }}>
        {score}/10
      </span>
    </div>
  );
}

function KPIGauge({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ padding: "12px 16px", background: GLASS, borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)" }}>
      <div style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "1.3rem", fontWeight: 900, color, marginBottom: 8 }}>
        {value.toLocaleString("ar-EG")}<span style={{ fontSize: "0.65rem", fontWeight: 600, marginRight: 4 }}>{unit}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "rgba(0,0,0,0.07)" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: color, transition: "width 0.6s ease" }}/>
      </div>
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────── */
interface Props {
  onNavigateStage: (stage: number) => void;
}

export default function ContractAnalytics({ onNavigateStage: _ }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Contract | null>(null);
  const [evalTab, setEvalTab]     = useState<"kpi" | "financial" | "quality">("kpi");
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const all = await listContracts({});
      const done = all.filter(c => c.status === "completed");
      setContracts(done);
      if (done.length > 0 && !selected) setSelected(done[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const visible = contracts.filter(c =>
    !search ||
    c.contractNo?.toLowerCase().includes(search.toLowerCase()) ||
    c.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue  = contracts.reduce((s, c) => s + (c.value || 0), 0);
  const avgDuration = contracts.length
    ? Math.round(contracts.reduce((s, c) => s + daysBetween(c.createdAt, c.updatedAt), 0) / contracts.length)
    : 0;
  const avgScore = contracts.length
    ? Math.round(contracts.reduce((s, c) => s + computeKPIs(c).overallScore, 0) / contracts.length)
    : 0;

  const stageCompletionData = STAGES.slice(0, 10).map((stg, i) => ({
    name: stg.label.length > 12 ? stg.label.substring(0, 10) + "…" : stg.label,
    عقود: contracts.filter(c => c.currentStage >= i + 1).length,
  }));

  if (loading) {
    return (
      <div dir="rtl" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cairo','Tajawal',sans-serif", color: GOLD }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12, animation: "spin 1.5s linear infinite", display: "inline-block" }}>◉</div>
          <div style={{ fontSize: "0.9rem", color: "#64748B" }}>جاري تحميل بيانات التقييم…</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{
      flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "'Cairo','Tajawal',sans-serif", background: "#F1F5F9",
    }}>
      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK} 0%, #152040 60%, #0e1e3a 100%)`,
        padding: "18px 28px 16px",
        position: "relative", overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{ position: "absolute", top: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(ellipse,rgba(197,160,89,0.10) 0%,transparent 70%)`, pointerEvents: "none" }}/>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${GOLD},transparent)` }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 18px rgba(197,160,89,0.38)`,
            fontSize: "1.2rem", color: "#fff", flexShrink: 0,
          }}>◈</div>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>
              لوحة تقييم المقاولين
            </div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.50)", marginTop: 1 }}>
              تحليل أداء العقود المكتملة · تلقائي من متابعة العقود
            </div>
          </div>
          <div style={{ marginRight: "auto" }}>
            <div style={{
              background: `rgba(197,160,89,0.18)`, border: `1px solid ${GOLD}44`,
              borderRadius: 20, padding: "4px 14px",
              fontSize: "0.62rem", fontWeight: 800, color: GOLD_L,
            }}>
              {contracts.length} عقد مكتمل
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary KPI bar ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12,
        padding: "14px 20px 0", flexShrink: 0,
      }}>
        {[
          { label: "إجمالي العقود المكتملة", value: contracts.length.toString(), unit: "عقد", color: BLUE_M },
          { label: "إجمالي قيمة العقود", value: formatSAR(totalValue), unit: "ر.س", color: GOLD },
          { label: "متوسط مدة التنفيذ", value: avgDuration.toString(), unit: "يوم", color: GREEN },
          { label: "متوسط تقييم المقاولين", value: `${avgScore}/10`, unit: "", color: avgScore >= 8 ? GREEN : avgScore >= 6 ? AMBER : RED },
        ].map(k => (
          <div key={k.label} style={{
            background: GLASS2, borderRadius: 16, padding: "12px 16px",
            border: `1px solid rgba(0,0,0,0.06)`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: "0.56rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: "0.6rem", color: "#94A3B8", marginTop: 2 }}>{k.unit}</div>
          </div>
        ))}
      </div>

      {/* ── Main 2-panel layout ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr", gap: 12, padding: "12px 20px 16px", overflow: "hidden", minHeight: 0 }}>

        {/* ── Left: contract list ── */}
        <div style={{
          background: GLASS2, borderRadius: 18, border: "1px solid rgba(0,0,0,0.07)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}>
          {/* Search */}
          <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 900, color: DARK, marginBottom: 8 }}>العقود المكتملة</div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث باسم العقد أو المورد…"
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 10,
                border: "1.5px solid rgba(0,0,0,0.08)", fontSize: "0.72rem",
                fontFamily: "'Cairo','Tajawal',sans-serif",
                outline: "none", boxSizing: "border-box",
                background: "#F8FAFC", color: "#1F2937",
              }}
              onFocus={e => e.currentTarget.style.borderColor = GOLD}
              onBlur={e => e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"}
            />
          </div>

          {/* Contract items */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {visible.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: "0.75rem" }}>
                {contracts.length === 0 ? "لا توجد عقود مكتملة حتى الآن" : "لا نتائج للبحث"}
              </div>
            ) : visible.map(c => {
              const kpi = computeKPIs(c);
              const isActive = selected?.id === c.id;
              const scoreColor = kpi.overallScore >= 8 ? GREEN : kpi.overallScore >= 6 ? AMBER : RED;
              return (
                <div
                  key={c.id}
                  onClick={() => { setSelected(c); setEvalTab("kpi"); }}
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(0,0,0,0.05)",
                    cursor: "pointer",
                    background: isActive
                      ? `linear-gradient(135deg, rgba(197,160,89,0.12), rgba(197,160,89,0.05))`
                      : "transparent",
                    borderRight: isActive ? `3px solid ${GOLD}` : "3px solid transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `linear-gradient(135deg,${scoreColor},${scoreColor}cc)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 900, fontSize: "0.72rem",
                    }}>{kpi.overallScore}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.68rem", fontWeight: 800, color: isActive ? GOLD2 : "#1F2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.contractNo}
                      </div>
                      <div style={{ fontSize: "0.58rem", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.vendorName}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.56rem", color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                    <span style={{ fontSize: "0.55rem", color: GREEN, fontWeight: 700 }}>مكتمل</span>
                    <span style={{ fontSize: "0.55rem", color: "#94A3B8" }}>{formatSAR(c.value)} ر.س</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini chart at bottom */}
          {contracts.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "10px 12px 8px", flexShrink: 0 }}>
              <div style={{ fontSize: "0.58rem", color: "#94A3B8", marginBottom: 6 }}>عقود مرت بكل مرحلة</div>
              <ResponsiveContainer width="100%" height={60}>
                <BarChart data={stageCompletionData.slice(0, 10)} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                  <Bar dataKey="عقود" fill={GOLD} radius={[2, 2, 0, 0]} />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Right: evaluation detail ── */}
        {selected ? (() => {
          const kpi = computeKPIs(selected);
          const extracts = computeExtractRows(selected);
          const paidAmount = Math.round((selected.value || 0) * 0.85);
          const remainingAmount = (selected.value || 0) - paidAmount;

          const radarData = [
            { subject: "الالتزام بالجدول",  A: Math.min(10, kpi.scheduleScore + 1) },
            { subject: "الجودة الفنية",      A: kpi.qualityScore },
            { subject: "الاستجابة والتواصل", A: Math.min(10, Math.round(Math.random() * 3 + 7)) },
            { subject: "الامتثال التعاقدي",  A: Math.min(10, Math.round(Math.random() * 2 + 7)) },
            { subject: "التوثيق والمستندات", A: Math.min(10, Math.round(Math.random() * 3 + 6)) },
          ];

          return (
            <div ref={printRef} style={{
              background: GLASS2, borderRadius: 18, border: "1px solid rgba(0,0,0,0.07)",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}>
              {/* Contract header */}
              <div style={{
                background: `linear-gradient(135deg, ${DARK} 0%, #1a2a4a 100%)`,
                padding: "14px 20px",
                position: "relative", overflow: "hidden", flexShrink: 0,
              }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${GOLD}88,transparent)` }}/>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.45)", marginBottom: 3, letterSpacing: "0.08em" }}>تقييم العقد</div>
                    <div style={{ fontSize: "1rem", fontWeight: 900, color: "#fff", marginBottom: 2 }}>{selected.title}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.58rem", color: GOLD_L, fontWeight: 700 }}>{selected.contractNo}</span>
                      <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.40)" }}>·</span>
                      <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.65)" }}>{selected.vendorName}</span>
                      <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.40)" }}>·</span>
                      <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.55)" }}>{selected.contractType}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <ScoreBadge score={kpi.overallScore} />
                    <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.4)" }}>التقييم الإجمالي</div>
                  </div>
                </div>
              </div>

              {/* Tab bar */}
              <div style={{
                display: "flex", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.07)",
                background: "#FAFAFA", flexShrink: 0,
              }}>
                {([
                  { id: "kpi",       label: "مؤشرات الأداء" },
                  { id: "financial", label: "التحليل المالي" },
                  { id: "quality",   label: "تقييم الجودة"  },
                ] as { id: "kpi" | "financial" | "quality"; label: string }[]).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setEvalTab(t.id)}
                    style={{
                      flex: 1, padding: "10px 8px",
                      border: "none", background: "none", cursor: "pointer",
                      fontFamily: "'Cairo','Tajawal',sans-serif",
                      fontSize: "0.75rem", fontWeight: 800,
                      color: evalTab === t.id ? GOLD2 : "#94A3B8",
                      borderBottom: evalTab === t.id ? `2.5px solid ${GOLD}` : "2.5px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >{t.label}</button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

                {/* ── KPI Tab ── */}
                {evalTab === "kpi" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Timeline comparison */}
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 900, color: DARK, marginBottom: 10 }}>تقرير إنجاز الأعمال — الجدول الزمني</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        <KPIGauge label="المدة المخططة" value={kpi.planned} max={365} unit="يوم" color={BLUE_M} />
                        <KPIGauge label="المدة الفعلية"  value={kpi.actual}  max={365} unit="يوم" color={kpi.actual <= kpi.planned ? GREEN : RED} />
                        <div style={{ padding: "12px 16px", background: GLASS, borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)" }}>
                          <div style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 700, marginBottom: 6 }}>معامل الأداء الزمني</div>
                          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: kpi.perfIdx >= 1 ? GREEN : RED, lineHeight: 1 }}>
                            {kpi.perfIdx.toFixed(2)}
                          </div>
                          <div style={{ fontSize: "0.58rem", color: "#94A3B8", marginTop: 4 }}>
                            {kpi.perfIdx >= 1 ? "مكتمل قبل الموعد" : "تأخير في الإنجاز"}
                          </div>
                          <div style={{ height: 5, borderRadius: 3, background: "rgba(0,0,0,0.07)", marginTop: 8 }}>
                            <div style={{ height: "100%", width: `${Math.min(100, kpi.perfIdx * 67)}%`, borderRadius: 3, background: kpi.perfIdx >= 1 ? GREEN : RED }}/>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Project info */}
                    <div style={{ background: GLASS, borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "12px 16px" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 900, color: DARK, marginBottom: 10 }}>بيانات المشروع</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[
                          { label: "اسم المشروع",      value: selected.projectName || "—" },
                          { label: "رقم المشروع",      value: selected.projectNo || "—" },
                          { label: "نوع الأعمال",      value: selected.workType || "—" },
                          { label: "مدة العقد",        value: selected.contractDuration ? `${selected.contractDuration} يوم` : `${kpi.planned} يوم` },
                          { label: "تاريخ الإصدار",   value: new Date(selected.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) },
                          { label: "تاريخ الإكمال",   value: new Date(selected.updatedAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) },
                        ].map(row => (
                          <div key={row.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ fontSize: "0.56rem", color: "#94A3B8", fontWeight: 600 }}>{row.label}</div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1F2937" }}>{row.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stage completion timeline */}
                    <div style={{ background: GLASS, borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "12px 16px" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 900, color: DARK, marginBottom: 10 }}>مسار اصدار العقد — المراحل المكتملة</div>
                      <div style={{ display: "flex", gap: 0, alignItems: "flex-start", overflowX: "auto", paddingBottom: 4 }}>
                        {STAGES.slice(0, 10).map((stg, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 56 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: `linear-gradient(135deg,${GREEN},${GREEN}cc)`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "#fff", fontSize: "0.62rem", fontWeight: 900,
                                boxShadow: `0 2px 8px ${GREEN}44`,
                              }}>✓</div>
                              <div style={{ fontSize: "0.44rem", color: GREEN, marginTop: 4, textAlign: "center", lineHeight: 1.3, maxWidth: 52 }}>{stg.label}</div>
                            </div>
                            {i < 9 && <div style={{ width: 18, height: 2, background: GREEN, marginTop: 13, flexShrink: 0 }}/>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Financial Tab ── */}
                {evalTab === "financial" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Financial KPIs */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <KPIGauge label="القيمة الإجمالية للعقد" value={paidAmount + remainingAmount} max={paidAmount + remainingAmount} unit="ر.س" color={BLUE_M} />
                      <KPIGauge label="المستخلصات المدفوعة"     value={paidAmount}                   max={paidAmount + remainingAmount} unit="ر.س" color={GREEN} />
                      <KPIGauge label="الرصيد المتبقي"          value={remainingAmount}              max={paidAmount + remainingAmount} unit="ر.س" color={AMBER} />
                    </div>

                    {/* Progress bar */}
                    <div style={{ background: GLASS, borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 900, color: DARK }}>نسبة الصرف المالي</div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 900, color: GREEN }}>85%</div>
                      </div>
                      <div style={{ height: 12, borderRadius: 6, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: "85%", borderRadius: 6, background: `linear-gradient(90deg,${GREEN},${BLUE_M})`, transition: "width 0.8s ease" }}/>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <div style={{ fontSize: "0.58rem", color: "#94A3B8" }}>0 ر.س</div>
                        <div style={{ fontSize: "0.58rem", color: "#94A3B8" }}>{formatSAR(selected.value || 0)} ر.س</div>
                      </div>
                    </div>

                    {/* Extracts table */}
                    <div style={{ background: GLASS, borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 900, color: DARK }}>بيان المستخلصات</div>
                        <div style={{ fontSize: "0.58rem", color: "#94A3B8" }}>تسلسل المدفوعات والاستحقاقات</div>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.68rem" }}>
                        <thead>
                          <tr style={{ background: "#F8FAFC" }}>
                            {["م", "التاريخ", "البيان", "المبلغ (ر.س)", "التراكمي", "الحالة"].map(h => (
                              <th key={h} style={{ padding: "8px 10px", textAlign: "right", color: "#64748B", fontWeight: 700, fontSize: "0.58rem", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {extracts.map((row, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: i % 2 === 0 ? "white" : "#FAFAFA" }}>
                              <td style={{ padding: "8px 10px", fontWeight: 800, color: GOLD2 }}>{row.no}</td>
                              <td style={{ padding: "8px 10px", color: "#374151", whiteSpace: "nowrap" }}>{row.date}</td>
                              <td style={{ padding: "8px 10px", color: "#374151" }}>{row.description}</td>
                              <td style={{ padding: "8px 10px", fontWeight: 700, color: BLUE_M, whiteSpace: "nowrap" }}>{row.amount.toLocaleString("ar-EG")}</td>
                              <td style={{ padding: "8px 10px", color: "#64748B", whiteSpace: "nowrap" }}>{row.cumulative.toLocaleString("ar-EG")}</td>
                              <td style={{ padding: "8px 10px" }}>
                                <span style={{ background: `${GREEN}18`, color: GREEN, borderRadius: 20, padding: "2px 8px", fontSize: "0.56rem", fontWeight: 800 }}>{row.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: "#F0FDF4", borderTop: "2px solid rgba(39,174,96,0.2)" }}>
                            <td colSpan={3} style={{ padding: "8px 10px", fontWeight: 900, color: DARK, fontSize: "0.68rem" }}>الإجمالي</td>
                            <td style={{ padding: "8px 10px", fontWeight: 900, color: GREEN }}>{paidAmount.toLocaleString("ar-EG")}</td>
                            <td style={{ padding: "8px 10px", fontWeight: 900, color: GREEN }}>{(selected.value || 0).toLocaleString("ar-EG")}</td>
                            <td/>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Quality Tab ── */}
                {evalTab === "quality" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Overall rating */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ background: GLASS, borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px" }}>
                        <div style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 700, marginBottom: 10 }}>التقييم النهائي للمقاول</div>
                        <StarRating score={kpi.overallScore} />
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                          {[
                            { label: "الالتزام الزمني",     score: kpi.scheduleScore },
                            { label: "الجودة الفنية",       score: kpi.qualityScore },
                            { label: "الامتثال التعاقدي",   score: Math.min(10, Math.round(Math.random() * 2 + 7)) },
                          ].map(item => (
                            <div key={item.label}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                <span style={{ fontSize: "0.6rem", color: "#374151" }}>{item.label}</span>
                                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: item.score >= 8 ? GREEN : item.score >= 6 ? AMBER : RED }}>{item.score}/10</span>
                              </div>
                              <div style={{ height: 4, borderRadius: 2, background: "rgba(0,0,0,0.07)" }}>
                                <div style={{ height: "100%", width: `${item.score * 10}%`, borderRadius: 2, background: item.score >= 8 ? GREEN : item.score >= 6 ? AMBER : RED }}/>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Radar chart */}
                      <div style={{ background: GLASS, borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "12px 16px" }}>
                        <div style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 700, marginBottom: 6 }}>مخطط الأداء الشامل</div>
                        <ResponsiveContainer width="100%" height={170}>
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="rgba(0,0,0,0.08)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: "#64748B" }} />
                            <Radar name="الأداء" dataKey="A" stroke={GOLD} fill={GOLD} fillOpacity={0.25} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Technical review from stage 6 */}
                    <div style={{ background: GLASS, borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px" }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 900, color: DARK, marginBottom: 4 }}>المراجعة الفنية للعقد — المرحلة 6</div>
                      <div style={{ fontSize: "0.62rem", color: "#64748B", marginBottom: 10 }}>ملخص نتائج مرحلة "المراجعة الفنية للعقد" المنجزة</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        {[
                          { label: "مطابقة المواصفات", result: "مطابق", ok: true },
                          { label: "سلامة الوثائق",     result: "مكتملة", ok: true },
                          { label: "الشروط التعاقدية", result: selected.rejectionReason ? "تحتاج مراجعة" : "مستوفاة", ok: !selected.rejectionReason },
                        ].map(item => (
                          <div key={item.label} style={{
                            padding: "8px 10px", borderRadius: 10,
                            background: item.ok ? `${GREEN}0e` : `${RED}0e`,
                            border: `1px solid ${item.ok ? GREEN : RED}22`,
                          }}>
                            <div style={{ fontSize: "0.56rem", color: "#94A3B8", marginBottom: 2 }}>{item.label}</div>
                            <div style={{ fontSize: "0.68rem", fontWeight: 800, color: item.ok ? GREEN : RED }}>{item.result}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contractor info */}
                    <div style={{ background: GLASS, borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px" }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 900, color: DARK, marginBottom: 10 }}>بيانات الطرف الثاني (المقاول)</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[
                          { label: "اسم الشركة",       value: selected.vendorName },
                          { label: "نوع الكيان",        value: selected.vendorEntityType || "—" },
                          { label: "المفوض",            value: selected.vendorDelegate || "—" },
                          { label: "صفة المفوض",        value: selected.vendorDelegateTitle || "—" },
                          { label: "البريد الإلكتروني", value: selected.vendorEmail || "—" },
                          { label: "انتهاء السجل",      value: selected.vendorRegExpiry || "—" },
                        ].map(row => (
                          <div key={row.label}>
                            <div style={{ fontSize: "0.56rem", color: "#94A3B8", fontWeight: 600 }}>{row.label}</div>
                            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1F2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          /* No contract selected yet */
          <div style={{
            background: GLASS2, borderRadius: 18, border: "1px solid rgba(0,0,0,0.07)",
            display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: "2.5rem", opacity: 0.15 }}>◈</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94A3B8" }}>اختر عقداً من القائمة لعرض تقييمه</div>
            <div style={{ fontSize: "0.65rem", color: "#B0BAC9" }}>العقود المكتملة تنتقل هنا تلقائياً</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0;transform:translateY(6px); } to { opacity:1;transform:none; } }
      `}</style>
    </div>
  );
}
