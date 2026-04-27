import { useEffect, useRef, useState } from "react";
import { listContracts, createContract } from "./api";
import { STAGES } from "./types";
import type { Contract } from "./types";
import logoImg from "@assets/logo_1776506524686.jpg";

const PM_ROLE = "مدير المشروع";
const CONTRACT_TYPES = ["خدمات", "مستلزمات", "إنشاءات", "استشارات", "ملحق عقد", "أخرى"];
const EMPTY_REQ = { title: "", vendorName: "", vendorContact: "", value: "", startDate: "", endDate: "", contractType: "خدمات", projectName: "" };

const GOLD      = "#C5A059";
const GOLD2     = "#a88540";
const GOLD_END  = "#E2C275";
const GOLD_GLOW = "rgba(197,160,89,0.45)";
const GOLD_BOR  = "rgba(197,160,89,0.22)";
const GREEN     = "#22c55e";
const AMBER     = "#F5A623";
const RED       = "#ef4444";
const DARK      = "#0C1427";
const DARK2     = "#152040";
const BLUE      = "#1565C0";
const BLUE_M    = "#1976D2";
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
  stageNum?: number;        // single stage (original behaviour)
  stageNums?: number[];     // multiple stages (tab mode)
  hideBack?: boolean;       // hide back button when embedded in tab
  role: string;
  actorName: string;
  onBack: () => void;
  onOpenContract: (id: number) => void;
}

export default function StageDetailPage({ stageNum, stageNums, hideBack, role, actorName, onBack, onOpenContract }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [sortBy, setSortBy]       = useState<"stageAge" | "totalAge" | "value">("stageAge");

  // ── "إنشاء الطلب" panel state (PM only) ──
  const [showNewReq, setShowNewReq]     = useState(false);
  const [reqForm, setReqForm]           = useState({ ...EMPTY_REQ });
  const [reqSaving, setReqSaving]       = useState(false);
  const [reqErr, setReqErr]             = useState("");
  const [reqSuccess, setReqSuccess]     = useState(false);

  // ── "إنشاء ملحق للعقد" panel state (PM only) ──
  const [showAddendum, setShowAddendum]         = useState(false);
  const [addNoQuery, setAddNoQuery]             = useState("");
  const [addContract, setAddContract]           = useState<Contract | null>(null);
  const [addSearching, setAddSearching]         = useState(false);
  const [addErr, setAddErr]                     = useState("");
  const [addNotes, setAddNotes]                 = useState("");
  const [addValue, setAddValue]                 = useState("");
  const [addReason, setAddReason]               = useState("");
  const [addSaving, setAddSaving]               = useState(false);
  const [addSuccess, setAddSuccess]             = useState(false);
  const allContractsRef                         = useRef<Contract[]>([]);

  // Resolved stage numbers list
  const resolvedStages: number[] = stageNums?.length
    ? stageNums
    : stageNum != null ? [stageNum] : [];

  const stage = stageNum != null ? STAGES[stageNum - 1] : undefined;

  useEffect(() => {
    if (resolvedStages.length === 0) { setLoading(false); return; }
    setLoading(true);
    Promise.all(resolvedStages.map(n => listContracts({ stage: n })))
      .then(results => {
        const all = results.flat().filter(c => c.status !== "completed");
        // de-duplicate by id
        const seen = new Set<number>();
        setContracts(all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; }));
      })
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [resolvedStages.join(",")]);

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
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${BLUE_M},${BLUE_L},${AMBER})` }}/>

        {/* Back — hidden in tab mode */}
        {!hideBack && (
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
        )}

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
            {stage
              ? `المرحلة ${stageNum} من ${STAGES.length} · نظام إدارة العقود`
              : `طلبات العقود · نظام إدارة العقود`}
          </div>
          <div style={{ fontSize: "1.12rem", fontWeight: 900, color: GOLD_END, letterSpacing: "-0.02em" }}>
            {stage
              ? stage.label
              : resolvedStages.length === 1
                ? STAGES[resolvedStages[0] - 1]?.label
                : (actorName || role || "طلباتك")}
          </div>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.42)", marginTop: 2 }}>
            {stage
              ? (role ? `${actorName || role} · المسؤول: ${stage.role}` : `المسؤول: ${stage.role}`)
              : resolvedStages.map(n => STAGES[n - 1]?.label).filter(Boolean).join(" · ")}
          </div>
        </div>

        {/* Quick stats strip */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Always-visible stat cards */}
          {[
            { label: "إجمالي الطلبات", value: contracts.length, color: GOLD_END },
            { label: "متوسط الانتظار", value: `${avgStageWait} يوم`, color: avgStageWait >= 7 ? "#FCA5A5" : avgStageWait >= 3 ? "#FCD34D" : "#86EFAC" },
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

          {/* "عاجل" → action button for PM, stat card for others */}
          {role === PM_ROLE ? (
            <button
              onClick={() => { setShowAddendum(p => !p); setShowNewReq(false); setAddContract(null); setAddNoQuery(""); setAddErr(""); setAddSuccess(false); }}
              style={{
                padding: "7px 14px", borderRadius: 11, cursor: "pointer",
                background: showAddendum ? GOLD : "rgba(197,160,89,0.15)",
                border: `1.5px solid ${showAddendum ? GOLD : "rgba(197,160,89,0.35)"}`,
                color: showAddendum ? DARK : GOLD_END,
                fontSize: "0.72rem", fontWeight: 700,
                fontFamily: "'Cairo','Tajawal',sans-serif",
                whiteSpace: "nowrap", transition: "all 0.18s",
                boxShadow: showAddendum ? "0 2px 10px rgba(197,160,89,0.4)" : "none",
              }}
            >
              {showAddendum ? "✕ إغلاق" : "+ إنشاء ملحق للعقد"}
            </button>
          ) : (
            <div style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(197,160,89,0.15)",
              borderRadius: 11, padding: "7px 13px", textAlign: "center",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: "0.53rem", color: "rgba(255,255,255,0.38)", marginBottom: 2 }}>عاجل</div>
              <div style={{ fontSize: "0.86rem", fontWeight: 900, color: "#FCA5A5" }}>{urgent}</div>
            </div>
          )}

          {/* "إجمالي القيمة" → action button for PM, stat card for others */}
          {role === PM_ROLE ? (
            <button
              onClick={() => { setShowNewReq(p => !p); setShowAddendum(false); setReqForm({ ...EMPTY_REQ }); setReqErr(""); setReqSuccess(false); }}
              style={{
                padding: "7px 16px", borderRadius: 11, cursor: "pointer",
                background: showNewReq ? BLUE_M : "rgba(25,118,210,0.18)",
                border: `1.5px solid ${showNewReq ? BLUE_M : "rgba(25,118,210,0.45)"}`,
                color: "#fff",
                fontSize: "0.72rem", fontWeight: 700,
                fontFamily: "'Cairo','Tajawal',sans-serif",
                whiteSpace: "nowrap", transition: "all 0.18s",
                boxShadow: showNewReq ? "0 2px 10px rgba(25,118,210,0.5)" : "none",
              }}
            >
              {showNewReq ? "✕ إغلاق" : "+ إنشاء الطلب"}
            </button>
          ) : (
            <div style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(197,160,89,0.15)",
              borderRadius: 11, padding: "7px 13px", textAlign: "center",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: "0.53rem", color: "rgba(255,255,255,0.38)", marginBottom: 2 }}>إجمالي القيمة</div>
              <div style={{ fontSize: "0.86rem", fontWeight: 900, color: GOLD_END }}>{formatSAR(totalVal)}</div>
            </div>
          )}
        </div>
      </div>

      {/* ══ "إنشاء الطلب" inline panel — PM only ══════════════════ */}
      {showNewReq && role === PM_ROLE && (
        <div style={{
          background: "#fff",
          borderBottom: `3px solid ${BLUE_M}`,
          padding: "22px 28px",
          boxShadow: "0 6px 30px rgba(25,118,210,0.12)",
          flexShrink: 0,
          animation: "fade-in 0.22s ease both",
        }}>
          <div style={{ fontSize: "1rem", fontWeight: 900, color: DARK, marginBottom: 16, borderRight: `4px solid ${BLUE_M}`, paddingRight: 10 }}>
            إنشاء طلب عقد جديد
          </div>

          {reqSuccess ? (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "16px 20px", color: "#15803D", fontWeight: 700, fontSize: "0.88rem" }}>
              تم إنشاء الطلب بنجاح — سيظهر في قائمة العقود خلال لحظات.
              <button onClick={() => { setShowNewReq(false); setReqSuccess(false); }} style={{ marginRight: 16, background: "none", border: "none", color: BLUE_M, cursor: "pointer", fontWeight: 700 }}>إغلاق</button>
            </div>
          ) : (
            <form
              onSubmit={async e => {
                e.preventDefault();
                if (!reqForm.title.trim()) { setReqErr("العنوان مطلوب"); return; }
                if (!reqForm.vendorName.trim()) { setReqErr("اسم المورد مطلوب"); return; }
                if (!reqForm.startDate || !reqForm.endDate) { setReqErr("تاريخا البداية والنهاية مطلوبان"); return; }
                setReqSaving(true); setReqErr("");
                try {
                  await createContract({
                    title: reqForm.title.trim(),
                    vendorName: reqForm.vendorName.trim(),
                    vendorContact: reqForm.vendorContact.trim(),
                    value: parseFloat(reqForm.value) || 0,
                    startDate: reqForm.startDate,
                    endDate: reqForm.endDate,
                    contractType: reqForm.contractType,
                    projectName: reqForm.projectName.trim(),
                    createdBy: actorName || role,
                  });
                  setReqSuccess(true);
                } catch { setReqErr("حدث خطأ أثناء الحفظ — يرجى المحاولة مجدداً"); }
                finally { setReqSaving(false); }
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "12px 16px" }}>
                {([
                  { key: "title",          label: "عنوان العقد",        placeholder: "مثال: عقد صيانة الإنارة",       type: "text" },
                  { key: "projectName",    label: "اسم المشروع",         placeholder: "اسم المشروع",                    type: "text" },
                  { key: "vendorName",     label: "اسم المورد / المقاول", placeholder: "اسم الشركة أو المورد",           type: "text" },
                  { key: "vendorContact",  label: "جهة الاتصال",          placeholder: "رقم الهاتف أو البريد",          type: "text" },
                  { key: "value",          label: "قيمة العقد (ر.س)",    placeholder: "0",                              type: "number" },
                  { key: "startDate",      label: "تاريخ البداية",        placeholder: "",                               type: "date" },
                  { key: "endDate",        label: "تاريخ النهاية",        placeholder: "",                               type: "date" },
                ] as const).map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: "#64748B", marginBottom: 5 }}>{f.label}</label>
                    <input
                      type={f.type}
                      value={(reqForm as Record<string, string>)[f.key]}
                      onChange={e => setReqForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      required={["title","vendorName","startDate","endDate"].includes(f.key)}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "8px 12px", borderRadius: 8,
                        border: "1.5px solid #E2E8F0", fontSize: "0.82rem",
                        fontFamily: "'Cairo','Tajawal',sans-serif",
                        outline: "none",
                      }}
                    />
                  </div>
                ))}

                <div>
                  <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: "#64748B", marginBottom: 5 }}>نوع العقد</label>
                  <select
                    value={reqForm.contractType}
                    onChange={e => setReqForm(p => ({ ...p, contractType: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.82rem", fontFamily: "'Cairo','Tajawal',sans-serif", background: "#fff" }}
                  >
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {reqErr && <div style={{ marginTop: 10, color: "#DC2626", fontSize: "0.75rem", fontWeight: 600 }}>{reqErr}</div>}

              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button type="submit" disabled={reqSaving} style={{
                  padding: "9px 24px", borderRadius: 9, border: "none", cursor: reqSaving ? "not-allowed" : "pointer",
                  background: reqSaving ? "#93C5FD" : BLUE_M, color: "#fff",
                  fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif",
                }}>
                  {reqSaving ? "جارٍ الحفظ…" : "حفظ وإرسال الطلب"}
                </button>
                <button type="button" onClick={() => setShowNewReq(false)} style={{
                  padding: "9px 18px", borderRadius: 9, border: "1px solid #E2E8F0", cursor: "pointer",
                  background: "#F8FAFC", color: "#64748B", fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif",
                }}>إلغاء</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ══ "إنشاء ملحق للعقد" inline panel — PM only ═════════════ */}
      {showAddendum && role === PM_ROLE && (
        <div style={{
          background: "#fff",
          borderBottom: `3px solid ${GOLD}`,
          padding: "22px 28px",
          boxShadow: "0 6px 30px rgba(197,160,89,0.14)",
          flexShrink: 0,
          animation: "fade-in 0.22s ease both",
        }}>
          <div style={{ fontSize: "1rem", fontWeight: 900, color: DARK, marginBottom: 16, borderRight: `4px solid ${GOLD}`, paddingRight: 10 }}>
            إنشاء ملحق لعقد قائم
          </div>

          {addSuccess ? (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "16px 20px", color: "#15803D", fontWeight: 700, fontSize: "0.88rem" }}>
              تم إنشاء الملحق بنجاح وإضافته للنظام.
              <button onClick={() => { setShowAddendum(false); setAddSuccess(false); setAddContract(null); }} style={{ marginRight: 16, background: "none", border: "none", color: BLUE_M, cursor: "pointer", fontWeight: 700 }}>إغلاق</button>
            </div>
          ) : (
            <>
              {/* Step 1: Search by contract number */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: "#64748B", marginBottom: 6 }}>رقم العقد الأصلي</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={addNoQuery}
                    onChange={e => { setAddNoQuery(e.target.value); setAddContract(null); setAddErr(""); }}
                    placeholder="أدخل رقم العقد مثال: CT-2024-001"
                    style={{
                      flex: 1, padding: "9px 14px", borderRadius: 9,
                      border: `1.5px solid ${addContract ? GOLD : "#E2E8F0"}`,
                      fontSize: "0.82rem", fontFamily: "'Cairo','Tajawal',sans-serif", outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    disabled={!addNoQuery.trim() || addSearching}
                    onClick={async () => {
                      if (!addNoQuery.trim()) return;
                      setAddSearching(true); setAddErr(""); setAddContract(null);
                      try {
                        const all = await listContracts({});
                        allContractsRef.current = all;
                        const found = all.find(c => c.contractNo.trim().toLowerCase() === addNoQuery.trim().toLowerCase());
                        if (found) { setAddContract(found); setAddValue(String(found.value || "")); }
                        else setAddErr(`لم يُعثر على عقد برقم "${addNoQuery}" — تحقق من الرقم وحاول مجدداً`);
                      } catch { setAddErr("تعذّر الاتصال بالخادم — حاول مرة أخرى"); }
                      finally { setAddSearching(false); }
                    }}
                    style={{
                      padding: "9px 18px", borderRadius: 9, border: "none", cursor: addSearching ? "not-allowed" : "pointer",
                      background: addSearching ? "#D1D5DB" : GOLD, color: DARK,
                      fontSize: "0.8rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif", whiteSpace: "nowrap",
                    }}
                  >
                    {addSearching ? "جارٍ البحث…" : "استعلام"}
                  </button>
                </div>
                {addErr && <div style={{ marginTop: 6, color: "#DC2626", fontSize: "0.73rem", fontWeight: 600 }}>{addErr}</div>}
              </div>

              {/* Step 2: Show fetched contract data (editable) */}
              {addContract && (
                <div style={{
                  background: "#FAFAFA", border: `1px solid rgba(197,160,89,0.28)`,
                  borderRadius: 12, padding: "16px 18px", marginBottom: 16,
                }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: GOLD2, marginBottom: 10 }}>
                    بيانات العقد الأصلي
                    <span style={{ marginRight: 8, fontSize: "0.65rem", color: "#94A3B8", fontWeight: 500 }}>(للعرض فقط)</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "8px 16px" }}>
                    {[
                      { label: "رقم العقد",    value: addContract.contractNo },
                      { label: "العنوان",       value: addContract.title },
                      { label: "المورد",        value: addContract.vendorName },
                      { label: "المشروع",       value: addContract.projectName || "—" },
                      { label: "نوع العقد",    value: addContract.contractType || "—" },
                      { label: "القيمة (ر.س)", value: addContract.value?.toLocaleString("ar-SA") || "—" },
                      { label: "تاريخ البداية", value: addContract.startDate || "—" },
                      { label: "تاريخ النهاية", value: addContract.endDate || "—" },
                    ].map(f => (
                      <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: "0.6rem", color: "#94A3B8", fontWeight: 700 }}>{f.label}</span>
                        <span style={{ fontSize: "0.8rem", color: DARK, fontWeight: 600 }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Addendum form */}
              {addContract && (
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    if (!addReason.trim()) { setAddErr("سبب الملحق مطلوب"); return; }
                    setAddSaving(true); setAddErr("");
                    try {
                      const addendumTitle = `ملحق [${addContract.contractNo}]: ${addReason.trim().slice(0, 60)}`;
                      await createContract({
                        title: addendumTitle,
                        vendorName: addContract.vendorName,
                        vendorContact: addContract.vendorContact || "",
                        value: parseFloat(addValue) || addContract.value || 0,
                        startDate: addContract.startDate || "",
                        endDate: addContract.endDate || "",
                        contractType: "ملحق عقد",
                        projectName: addContract.projectName || "",
                        createdBy: actorName || role,
                      });
                      setAddSuccess(true);
                    } catch { setAddErr("حدث خطأ أثناء الحفظ — يرجى المحاولة مجدداً"); }
                    finally { setAddSaving(false); }
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "12px 16px", marginBottom: 14 }}>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: "#64748B", marginBottom: 5 }}>سبب إنشاء الملحق</label>
                      <textarea
                        rows={2}
                        value={addReason}
                        onChange={e => setAddReason(e.target.value)}
                        placeholder="مثال: زيادة نطاق الأعمال — إضافة بند إنشائي جديد..."
                        required
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.82rem", fontFamily: "'Cairo','Tajawal',sans-serif", resize: "vertical" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: "#64748B", marginBottom: 5 }}>قيمة الملحق (ر.س)</label>
                      <input
                        type="number"
                        value={addValue}
                        onChange={e => setAddValue(e.target.value)}
                        placeholder="0"
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.82rem", fontFamily: "'Cairo','Tajawal',sans-serif" }}
                      />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: "#64748B", marginBottom: 5 }}>ملاحظات إضافية</label>
                      <textarea
                        rows={2}
                        value={addNotes}
                        onChange={e => setAddNotes(e.target.value)}
                        placeholder="أي ملاحظات تكميلية…"
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.82rem", fontFamily: "'Cairo','Tajawal',sans-serif", resize: "vertical" }}
                      />
                    </div>
                  </div>

                  {addErr && <div style={{ marginBottom: 10, color: "#DC2626", fontSize: "0.75rem", fontWeight: 600 }}>{addErr}</div>}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="submit" disabled={addSaving} style={{
                      padding: "9px 24px", borderRadius: 9, border: "none", cursor: addSaving ? "not-allowed" : "pointer",
                      background: addSaving ? "#FCD34D" : GOLD, color: DARK,
                      fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif",
                    }}>
                      {addSaving ? "جارٍ الحفظ…" : "إنشاء الملحق"}
                    </button>
                    <button type="button" onClick={() => setShowAddendum(false)} style={{
                      padding: "9px 18px", borderRadius: 9, border: "1px solid #E2E8F0", cursor: "pointer",
                      background: "#F8FAFC", color: "#64748B", fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif",
                    }}>إلغاء</button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}

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
                  { label: "رقم الطلب",         width: 52 },
                  { label: "رقم العقد",          width: 110 },
                  { label: "اسم الطرف الثاني",   width: 140 },
                  { label: "رقم واسم المشروع",   width: undefined },
                  { label: "المحفظة",            width: 110 },
                  { label: "زمن المرحلة",        width: 130, note: "منذ آخر تحديث" },
                  { label: "عمر الطلب",          width: 110, note: "منذ الإنشاء" },
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

                    {/* اسم الطرف الثاني */}
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#1A1A1A", marginBottom: 2 }}>
                        {c.vendorName || "—"}
                      </div>
                      {c.rejectionReason && (
                        <div style={{ fontSize: "0.58rem", color: RED, display: "flex", gap: 4 }}>
                          <span style={{ fontWeight: 700 }}>سبب الإعادة:</span><span style={{ marginRight: 4 }}>{c.rejectionReason}</span>
                        </div>
                      )}
                    </td>

                    {/* رقم واسم المشروع */}
                    <td style={{ padding: "13px 14px" }}>
                      {(c.projectNo || c.projectName) ? (
                        <div>
                          {c.projectNo && (
                            <div style={{
                              fontSize: "0.62rem", fontWeight: 800, color: GOLD2,
                              background: `rgba(197,160,89,0.07)`, border: `1px solid ${GOLD_BOR}`,
                              borderRadius: 6, padding: "2px 7px", display: "inline-block", marginBottom: 3,
                            }}>{c.projectNo}</div>
                          )}
                          {c.projectName && (
                            <div style={{ fontSize: "0.7rem", color: "#444", fontWeight: 600 }}>{c.projectName}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#ccc", fontSize: "0.7rem" }}>—</span>
                      )}
                    </td>

                    {/* المحفظة */}
                    <td style={{ padding: "13px 14px" }}>
                      {(c.contractType || c.workType) ? (
                        <div style={{
                          fontSize: "0.65rem", fontWeight: 700, color: "#555",
                          background: "rgba(0,0,0,0.04)", border: "1px solid #E8E8E8",
                          borderRadius: 6, padding: "3px 8px", display: "inline-block",
                        }}>
                          {c.contractType || c.workType}
                        </div>
                      ) : (
                        <span style={{ color: "#ccc", fontSize: "0.7rem" }}>—</span>
                      )}
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
