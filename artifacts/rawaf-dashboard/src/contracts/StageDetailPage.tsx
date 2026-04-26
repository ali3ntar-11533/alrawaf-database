import { useEffect, useState } from "react";
import { listContracts } from "./api";
import { STAGES } from "./types";
import type { Contract } from "./types";
import logoImg from "@assets/logo_1776506524686.jpg";

const GOLD      = "#C5A059";
const GOLD2     = "#a88540";
const GOLD_END  = "#E2C275";
const GOLD_GLOW = "rgba(197,160,89,0.45)";
const GOLD_BOR  = "rgba(197,160,89,0.22)";
const GREEN     = "#22c55e";
const AMBER     = "#f59e0b";
const RED       = "#ef4444";
const DARK      = "#0C1427";
const DARK2     = "#152040";
const BLUE_L    = "#4A90D9";

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function hoursSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
}
function formatDuration(iso: string): { label: string; color: string } {
  const h = hoursSince(iso);
  const d = daysSince(iso);
  const color = d >= 7 ? RED : d >= 3 ? AMBER : GREEN;
  if (h < 24) return { label: `${h} ساعة`, color };
  if (d < 30)  return { label: `${d} يوم`,  color };
  return { label: `${Math.floor(d / 30)} شهر`, color };
}
function formatSAR(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م ر.س`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ألف ر.س`;
  return `${n} ر.س`;
}

interface Props {
  stageNum: number;
  role: string;
  actorName: string;
  onBack: () => void;
  onOpenContract: (id: number) => void;
}

export default function StageDetailPage({ stageNum, role, actorName, onBack, onOpenContract }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [sortBy, setSortBy]       = useState<"stageAge" | "totalAge" | "value">("stageAge");

  const stage = STAGES[stageNum - 1];

  useEffect(() => {
    setLoading(true);
    listContracts({ stage: stageNum })
      .then(data => setContracts(data.filter(c => c.status !== "completed")))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [stageNum]);

  const filtered = contracts
    .filter(c => !search || c.title.includes(search) || c.contractNo.includes(search) || c.vendorName?.includes(search))
    .sort((a, b) => {
      if (sortBy === "stageAge")  return daysSince(b.updatedAt)  - daysSince(a.updatedAt);
      if (sortBy === "totalAge")  return daysSince(b.createdAt)  - daysSince(a.createdAt);
      if (sortBy === "value")     return (b.value || 0)          - (a.value || 0);
      return 0;
    });

  const avgStageWait = contracts.length > 0
    ? Math.round(contracts.reduce((s, c) => s + daysSince(c.updatedAt), 0) / contracts.length)
    : 0;
  const urgent = contracts.filter(c => daysSince(c.updatedAt) >= 7).length;
  const totalVal = contracts.reduce((s, c) => s + (c.value || 0), 0);

  return (
    <div dir="rtl" style={{
      minHeight: "100%",
      background: "#F0F2F8",
      fontFamily: "'Cairo','Tajawal',sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @keyframes fade-in {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .detail-row { transition: background 0.15s; }
        .detail-row:hover { background: rgba(197,160,89,0.05) !important; }
        .sort-btn { transition: all 0.15s; cursor: pointer; }
        .sort-btn:hover { background: rgba(197,160,89,0.1) !important; }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK} 0%, ${DARK2} 60%, ${DARK} 100%)`,
        borderBottom: `2px solid rgba(197,160,89,0.28)`,
        padding: "14px 28px",
        display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 50,
        flexShrink: 0,
        boxShadow: "0 4px 24px rgba(12,20,39,0.28)",
      }}>
        {/* Blue+Gold top line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${BLUE_L},${GOLD},${BLUE_L})`, opacity: 0.7 }}/>

        {/* Back */}
        <button
          onClick={onBack}
          style={{
            padding: "8px 16px", borderRadius: 10, flexShrink: 0,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(197,160,89,0.28)",
            color: GOLD_END, fontSize: "0.76rem", fontWeight: 700, cursor: "pointer",
            fontFamily: "'Cairo','Tajawal',sans-serif",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
        >رجوع</button>

        {/* Logo */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, overflow: "hidden", flexShrink: 0,
          boxShadow: `0 0 0 2px rgba(197,160,89,0.4), 0 4px 16px rgba(0,0,0,0.4)`,
        }}>
          <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 36, background: "rgba(197,160,89,0.18)", flexShrink: 0 }}/>

        {/* Stage info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.5rem", fontWeight: 900, letterSpacing: "0.12em", color: BLUE_L, marginBottom: 3, textTransform: "uppercase" }}>
            المرحلة {stageNum} من {STAGES.length} · نظام إدارة العقود
          </div>
          <div style={{ fontSize: "1.12rem", fontWeight: 900, color: GOLD_END, letterSpacing: "-0.02em" }}>
            {stage?.label}
          </div>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.42)", marginTop: 2 }}>
            {role ? `${actorName || role} · المسؤول: ${stage?.role}` : `المسؤول: ${stage?.role}`}
          </div>
        </div>

        {/* Quick stats strip */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[
            { label: "إجمالي الطلبات", value: contracts.length, color: GOLD_END },
            { label: "متوسط الانتظار", value: `${avgStageWait} يوم`, color: avgStageWait >= 7 ? "#FCA5A5" : avgStageWait >= 3 ? "#FCD34D" : "#86EFAC" },
            { label: "عاجل", value: urgent, color: "#FCA5A5" },
            { label: "إجمالي القيمة", value: formatSAR(totalVal), color: GOLD_END },
          ].map((s, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(197,160,89,0.15)",
              borderRadius: 11, padding: "7px 13px", textAlign: "center",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: "0.53rem", color: "rgba(255,255,255,0.38)", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: "0.86rem", fontWeight: 900, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search + Sort bar ────────────────────────────────────── */}
      <div style={{
        padding: "14px 28px",
        background: "#FAFAFA",
        borderBottom: "1px solid #F0F0F0",
        display: "flex", gap: 12, alignItems: "center",
        flexShrink: 0,
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث برقم العقد أو العنوان أو المورد…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#fff", border: "1px solid #E8E8E8",
              borderRadius: 10, padding: "9px 36px 9px 14px",
              fontFamily: "'Cairo','Tajawal',sans-serif",
              fontSize: "0.78rem", color: "#1A1A1A", outline: "none",
              direction: "rtl",
            }}
          />
        </div>
        {/* Sort */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: "0.65rem", color: "#999", fontWeight: 700 }}>ترتيب حسب:</span>
          {[
            { key: "stageAge" as const, label: "زمن المرحلة" },
            { key: "totalAge" as const, label: "عمر الطلب" },
            { key: "value"    as const, label: "القيمة" },
          ].map(opt => (
            <button
              key={opt.key}
              className="sort-btn"
              onClick={() => setSortBy(opt.key)}
              style={{
                padding: "5px 12px", borderRadius: 8, fontSize: "0.65rem", fontWeight: 700,
                border: sortBy === opt.key ? `1.5px solid ${GOLD_BOR}` : "1px solid #E8E8E8",
                background: sortBy === opt.key ? `rgba(197,160,89,0.08)` : "#fff",
                color: sortBy === opt.key ? GOLD2 : "#666",
                boxShadow: sortBy === opt.key ? `0 2px 8px rgba(197,160,89,0.15)` : "none",
              }}
            >{opt.label}</button>
          ))}
        </div>
        <div style={{ marginRight: "auto", fontSize: "0.65rem", color: "#AAA", fontWeight: 700 }}>
          {filtered.length} طلب
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 30px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#CCC" }}>
            <div style={{ fontSize: "0.8rem" }}>جاري تحميل البيانات…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#CCC" }}>
            <span style={{ fontSize: "0.85rem" }}>لا طلبات في هذه المرحلة</span>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "#FAFAFA", borderBottom: "2px solid #F0F0F0" }}>
                {[
                  { label: "#",            width: 44 },
                  { label: "رقم العقد",    width: 100 },
                  { label: "العنوان",      width: undefined },
                  { label: "المورد",       width: 130 },
                  { label: "القيمة",       width: 120 },
                  { label: "زمن المرحلة", width: 120, note: "منذ آخر تحديث" },
                  { label: "عمر الطلب",  width: 110, note: "منذ الإنشاء" },
                ].map((col, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "11px 14px", textAlign: "right",
                      fontSize: "0.62rem", fontWeight: 900,
                      color: col.label.includes("زمن") || col.label.includes("عمر") ? GOLD2 : "#777",
                      background: "transparent", borderBottom: "2px solid #F0F0F0",
                      width: col.width, whiteSpace: "nowrap",
                    }}
                  >
                    {col.label}
                    {col.note && <div style={{ fontSize: "0.5rem", color: "#BBBBBB", fontWeight: 600, marginTop: 1 }}>{col.note}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => {
                const stageWait = formatDuration(c.updatedAt);
                const totalAge  = formatDuration(c.createdAt);
                const isUrgent  = daysSince(c.updatedAt) >= 7;
                const isWarn    = !isUrgent && daysSince(c.updatedAt) >= 3;

                return (
                  <tr
                    key={c.id}
                    className="detail-row"
                    onClick={() => onOpenContract(c.id)}
                    style={{
                      borderBottom: "1px solid #F8F8F8",
                      background: isUrgent ? "rgba(239,68,68,0.02)" : "transparent",
                      animation: `fade-in 0.25s ease ${Math.min(idx * 0.04, 0.4)}s both`,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(197,160,89,0.06)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isUrgent ? "rgba(239,68,68,0.02)" : "transparent"; }}
                  >
                    {/* # */}
                    <td style={{ padding: "13px 14px", fontSize: "0.62rem", color: "#BBBBBB", fontWeight: 700 }}>
                      {idx + 1}
                    </td>

                    {/* رقم العقد */}
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{
                        fontSize: "0.68rem", fontWeight: 800,
                        color: GOLD2, letterSpacing: "0.02em",
                        background: `rgba(197,160,89,0.08)`,
                        border: `1px solid ${GOLD_BOR}`,
                        borderRadius: 7, padding: "3px 8px",
                        display: "inline-block",
                      }}>{c.contractNo}</div>
                    </td>

                    {/* العنوان */}
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1A1A1A", marginBottom: 2 }}>
                        {c.title}
                      </div>
                      {c.rejectionReason && (
                        <div style={{ fontSize: "0.58rem", color: RED, display: "flex", gap: 4 }}>
                          <span style={{ fontWeight: 700 }}>سبب الإعادة:</span><span style={{ marginRight: 4 }}>{c.rejectionReason}</span>
                        </div>
                      )}
                      {c.projectName && (
                        <div style={{ fontSize: "0.58rem", color: "#AAAAAA" }}>{c.projectName}</div>
                      )}
                    </td>

                    {/* المورد */}
                    <td style={{ padding: "13px 14px", fontSize: "0.72rem", color: "#555" }}>
                      {c.vendorName || "—"}
                    </td>

                    {/* القيمة */}
                    <td style={{ padding: "13px 14px", fontSize: "0.72rem", fontWeight: 700, color: "#1A1A1A", whiteSpace: "nowrap" }}>
                      {formatSAR(c.value)}
                    </td>

                    {/* زمن المرحلة */}
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: `${stageWait.color}12`,
                        border: `1px solid ${stageWait.color}25`,
                        borderRadius: 20, padding: "5px 12px",
                      }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: "50%",
                          background: stageWait.color,
                          boxShadow: `0 0 6px ${stageWait.color}80`,
                          flexShrink: 0,
                        }}/>
                        <span style={{ fontSize: "0.7rem", fontWeight: 900, color: stageWait.color }}>
                          {stageWait.label}
                        </span>
                        {isUrgent && <span style={{ fontSize: "0.46rem", color: RED, fontWeight: 800, background: "rgba(220,38,38,0.1)", borderRadius: 4, padding: "1px 4px" }}>عاجل</span>}
                        {isWarn && !isUrgent && <span style={{ fontSize: "0.46rem", color: AMBER, fontWeight: 800, background: "rgba(217,119,6,0.1)", borderRadius: 4, padding: "1px 4px" }}>تنبيه</span>}
                      </div>
                    </td>

                    {/* عمر الطلب */}
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "rgba(0,0,0,0.03)", border: "1px solid #EBEBEB",
                        borderRadius: 20, padding: "5px 12px",
                      }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#555" }}>
                          {totalAge.label}
                        </span>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer summary ──────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{
          padding: "12px 28px",
          background: "linear-gradient(90deg, #1C1810, #2A2010, #1C1810)",
          display: "flex", gap: 0, flexShrink: 0,
          borderTop: `2px solid ${GOLD_BOR}`,
        }}>
          {[
            { label: "عدد الطلبات في الجدول", value: filtered.length },
            { label: "متوسط زمن المرحلة",      value: `${avgStageWait} يوم` },
            { label: "عاجل (≥ ٧ أيام)",        value: urgent },
            { label: "إجمالي القيمة",           value: formatSAR(totalVal) },
          ].map((item, i, arr) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderLeft: i < arr.length - 1 ? "1px solid rgba(197,160,89,0.15)" : "none" }}>
              <div style={{ fontSize: "0.55rem", color: "rgba(226,194,117,0.55)", marginBottom: 2 }}>{item.label}</div>
              <div style={{
                fontSize: "0.95rem", fontWeight: 900,
                background: `linear-gradient(135deg, ${GOLD_END}, ${GOLD})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
