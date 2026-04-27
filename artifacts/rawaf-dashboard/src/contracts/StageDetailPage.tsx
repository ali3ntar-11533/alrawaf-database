import { useEffect, useRef, useState } from "react";
import { listContracts, createContract, updateContract } from "./api";
import { STAGES } from "./types";
import type { Contract } from "./types";
import logoImg from "@assets/logo_1776506524686.jpg";

const PM_ROLE = "مدير المشروع";
const CONTRACT_TYPES = ["خدمات", "مستلزمات", "إنشاءات", "استشارات", "ملحق عقد", "أخرى"];
const WORK_TYPES    = ["مدني", "كهربائي", "ميكانيكي", "تقنية معلومات", "استشاري", "أمني", "أخرى"];

const EMPTY_FORM = {
  /* بيانات المشروع */
  title: "", projectName: "", projectNo: "", issuerEntity: "", workType: "",
  contractType: "خدمات", value: "", startDate: "", endDate: "",
  contractDuration: "", priceAnalysisStatus: "", costEstimationDept: "",
  /* بيانات الطرف الثاني */
  vendorName: "", vendorContact: "", vendorIban: "", vendorTaxNo: "",
  vendorDelegate: "", vendorDelegateTitle: "", vendorDelegateId: "",
  vendorEmail: "", vendorAddress: "", vendorPostalCode: "",
  vendorRegExpiry: "", vendorEntityType: "",
};
type FormData = typeof EMPTY_FORM;

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

  // ── إنشاء / تعديل الطلب — panel state (PM only) ──
  const [showNewReq, setShowNewReq]     = useState(false);
  const [editTarget, setEditTarget]     = useState<Contract | null>(null);
  const [form, setForm]                 = useState<FormData>({ ...EMPTY_FORM });
  const [formTab, setFormTab]           = useState<"project" | "vendor">("project");
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
  const [addFormTab, setAddFormTab]             = useState<"project" | "vendor">("project");
  const [addEditForm, setAddEditForm]           = useState<FormData>({ ...EMPTY_FORM });
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
              onClick={() => { setShowNewReq(p => !p); setShowAddendum(false); setEditTarget(null); setForm({ ...EMPTY_FORM }); setFormTab("project"); setReqErr(""); setReqSuccess(false); }}
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

      {/* ══ نموذج إنشاء / تعديل الطلب — PM only ═══════════════════ */}
      {showNewReq && role === PM_ROLE && (() => {
        const isEdit = editTarget !== null;
        const fld = (key: keyof FormData) => form[key] as string;
        const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
          setForm(p => ({ ...p, [key]: e.target.value }));
        const FilePill = ({ label }: { label: string }) => (
          <div>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94A3B8", marginBottom: 4 }}>{label}</div>
            <button type="button" style={{
              padding: "6px 14px", borderRadius: 8,
              background: "#F8FAFC", border: "1.5px dashed #CBD5E1",
              fontSize: "0.68rem", color: "#94A3B8", cursor: "default",
              fontFamily: "'Cairo','Tajawal',sans-serif",
            }}>رقم ملف</button>
          </div>
        );
        const Field = ({ label, fkey, type = "text", placeholder = "", required = false, cols = 1 }: {
          label: string; fkey: keyof FormData; type?: string; placeholder?: string; required?: boolean; cols?: number;
        }) => (
          <div style={{ gridColumn: cols > 1 ? `span ${cols}` : undefined }}>
            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "#64748B", marginBottom: 4 }}>
              {label}{required && <span style={{ color: "#EF4444", marginRight: 3 }}>*</span>}
            </label>
            <input
              type={type}
              value={fld(fkey)}
              onChange={set(fkey)}
              placeholder={placeholder}
              required={required}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "8px 11px", borderRadius: 8,
                border: "1.5px solid #E2E8F0", fontSize: "0.79rem",
                fontFamily: "'Cairo','Tajawal',sans-serif", outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = BLUE_M; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
            />
          </div>
        );
        const SelectField = ({ label, fkey, options, required = false }: {
          label: string; fkey: keyof FormData; options: string[]; required?: boolean;
        }) => (
          <div>
            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "#64748B", marginBottom: 4 }}>
              {label}{required && <span style={{ color: "#EF4444", marginRight: 3 }}>*</span>}
            </label>
            <select
              value={fld(fkey)}
              onChange={set(fkey)}
              required={required}
              style={{ width: "100%", padding: "8px 11px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.79rem", fontFamily: "'Cairo','Tajawal',sans-serif", background: "#fff" }}
            >
              <option value="">— اختر —</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        );
        return (
          <div style={{
            background: "#fff", borderBottom: `3px solid ${BLUE_M}`,
            boxShadow: "0 6px 30px rgba(25,118,210,0.12)",
            flexShrink: 0, animation: "fade-in 0.22s ease both",
          }}>
            {/* Panel header */}
            <div style={{
              background: `linear-gradient(135deg, ${BLUE_M}, ${BLUE})`,
              padding: "14px 28px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: "0.95rem" }}>
                {isEdit ? `تعديل الطلب — ${editTarget!.contractNo}` : "إنشاء طلب عقد جديد"}
              </div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.7)" }}>
                {isEdit ? "التعديل متاح للطلبات في المرحلة الأولى فقط" : `تاريخ الطلب: ${new Date().toLocaleDateString("ar-SA")}`}
              </div>
            </div>

            {reqSuccess ? (
              <div style={{ padding: "24px 28px" }}>
                <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "16px 20px", color: "#15803D", fontWeight: 700, fontSize: "0.88rem" }}>
                  {isEdit ? "تم حفظ التعديلات بنجاح." : "تم إنشاء الطلب بنجاح — سيظهر في القائمة خلال لحظات."}
                  <button onClick={() => { setShowNewReq(false); setReqSuccess(false); setEditTarget(null); }} style={{ marginRight: 16, background: "none", border: "none", color: BLUE_M, cursor: "pointer", fontWeight: 700 }}>إغلاق</button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  if (!form.title.trim()) { setReqErr("عنوان العقد مطلوب"); setFormTab("project"); return; }
                  if (!form.vendorName.trim()) { setReqErr("اسم الطرف الثاني مطلوب"); setFormTab("vendor"); return; }
                  setReqSaving(true); setReqErr("");
                  try {
                    const payload = {
                      title: form.title.trim(), projectName: form.projectName.trim(),
                      projectNo: form.projectNo.trim(), issuerEntity: form.issuerEntity.trim(),
                      workType: form.workType, contractType: form.contractType || "خدمات",
                      value: parseFloat(form.value) || 0,
                      startDate: form.startDate, endDate: form.endDate,
                      contractDuration: form.contractDuration.trim(),
                      priceAnalysisStatus: form.priceAnalysisStatus.trim(),
                      costEstimationDept: form.costEstimationDept.trim(),
                      vendorName: form.vendorName.trim(), vendorContact: form.vendorContact.trim(),
                      vendorIban: form.vendorIban.trim(), vendorTaxNo: form.vendorTaxNo.trim(),
                      vendorDelegate: form.vendorDelegate.trim(), vendorDelegateTitle: form.vendorDelegateTitle.trim(),
                      vendorDelegateId: form.vendorDelegateId.trim(), vendorEmail: form.vendorEmail.trim(),
                      vendorAddress: form.vendorAddress.trim(), vendorPostalCode: form.vendorPostalCode.trim(),
                      vendorRegExpiry: form.vendorRegExpiry, vendorEntityType: form.vendorEntityType.trim(),
                    };
                    if (isEdit) {
                      await updateContract(editTarget!.id, payload);
                    } else {
                      await createContract({ ...payload, createdBy: actorName || role });
                    }
                    setReqSuccess(true);
                    setContracts(prev => isEdit
                      ? prev.map(c => c.id === editTarget!.id ? { ...c, ...payload } : c)
                      : prev
                    );
                  } catch { setReqErr("حدث خطأ أثناء الحفظ — يرجى المحاولة مجدداً"); }
                  finally { setReqSaving(false); }
                }}
              >
                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "2px solid #F1F5F9", padding: "0 28px" }}>
                  {([
                    { key: "project" as const, label: "بيانات المشروع" },
                    { key: "vendor"  as const, label: "بيانات الطرف الثاني" },
                  ]).map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setFormTab(t.key)}
                      style={{
                        padding: "12px 20px", border: "none", cursor: "pointer",
                        background: "none", fontFamily: "'Cairo','Tajawal',sans-serif",
                        fontSize: "0.8rem", fontWeight: 700,
                        color: formTab === t.key ? BLUE_M : "#94A3B8",
                        borderBottom: formTab === t.key ? `3px solid ${BLUE_M}` : "3px solid transparent",
                        marginBottom: -2, transition: "all 0.15s",
                      }}
                    >{t.label}</button>
                  ))}
                </div>

                <div style={{ padding: "20px 28px" }}>
                  {/* ─── Tab: بيانات المشروع ─── */}
                  {formTab === "project" && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: "14px 18px" }}>
                      <Field label="عنوان العقد / موضوع العقد" fkey="title" placeholder="مثال: عقد صيانة الإنارة الخارجية" required />
                      <Field label="اسم المشروع" fkey="projectName" placeholder="مثال: مشروع أتمتة المنشآت" />
                      <Field label="رقم المشروع" fkey="projectNo" placeholder="مثال: PRJ-2024-001" />
                      <Field label="جهة إصدار الطلب" fkey="issuerEntity" placeholder="الجهة المُصدِرة" />
                      <SelectField label="نوع الأعمال" fkey="workType" options={WORK_TYPES} />
                      <SelectField label="نوع العقد" fkey="contractType" options={CONTRACT_TYPES} required />
                      <Field label="قيمة العقد (ريال)" fkey="value" type="number" placeholder="0" />
                      <Field label="مدة العقد" fkey="contractDuration" placeholder="مثال: 12 شهراً" />
                      <Field label="تاريخ البداية" fkey="startDate" type="date" />
                      <Field label="تاريخ النهاية"  fkey="endDate"   type="date" />
                      <Field label="حالة تحليل السعر" fkey="priceAnalysisStatus" placeholder="مثال: معتمد / قيد المراجعة" />
                      <Field label="القسم المرجعي (تقدير التكلفة)" fkey="costEstimationDept" placeholder="القسم الهندسي / المشتريات" />
                      {/* File placeholders */}
                      <FilePill label="مقارنة مالية وفنية" />
                      <FilePill label="عقد مماثل" />
                      <FilePill label="المخططات" />
                      <FilePill label="توصيفات" />
                      <FilePill label="طلب إصدار العقد — BOQ" />
                    </div>
                  )}

                  {/* ─── Tab: بيانات الطرف الثاني ─── */}
                  {formTab === "vendor" && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: "14px 18px" }}>
                      <Field label="اسم الطرف الثاني" fkey="vendorName" placeholder="اسم الشركة أو المورد" required />
                      <Field label="جهة الاتصال" fkey="vendorContact" placeholder="رقم الهاتف أو اسم المسؤول" />
                      <Field label="رقم الأيبان (IBAN)" fkey="vendorIban" placeholder="SA00 0000 0000 0000 0000 0000" />
                      <Field label="رقم / شهادة ضريبة القيمة المضافة" fkey="vendorTaxNo" placeholder="رقم التسجيل الضريبي" />
                      <Field label="ممثل الطرف الثاني" fkey="vendorDelegate" placeholder="الاسم الكامل للممثل" />
                      <Field label="صفته (المسمى الوظيفي)" fkey="vendorDelegateTitle" placeholder="المدير العام / المفوض..." />
                      <Field label="رقم الهوية / الإقامة للمفوض" fkey="vendorDelegateId" placeholder="رقم الهوية الوطنية أو الإقامة" />
                      <Field label="البريد الإلكتروني الرسمي للمنشأة" fkey="vendorEmail" type="email" placeholder="info@company.com" />
                      <Field label="العنوان الوطني" fkey="vendorAddress" placeholder="المدينة، الحي، الشارع" />
                      <Field label="الرمز البريدي" fkey="vendorPostalCode" placeholder="00000" />
                      <Field label="نوع المنشأة" fkey="vendorEntityType" placeholder="شركة ذ.م.م / مؤسسة فردية..." />
                      <Field label="انتهاء السجل التجاري" fkey="vendorRegExpiry" type="date" />
                      {/* File placeholders */}
                      <FilePill label="السجل التجاري" />
                      <FilePill label="عقد التأسيس" />
                      <FilePill label="العرض المالي والفني للمنشأة" />
                      <FilePill label="طلب أسعار مماثلة — عرض 1" />
                      <FilePill label="طلب أسعار مماثلة — عرض 2" />
                      <FilePill label="طلب أسعار مماثلة — عرض 3" />
                    </div>
                  )}

                  {reqErr && <div style={{ marginTop: 12, color: "#DC2626", fontSize: "0.75rem", fontWeight: 600 }}>{reqErr}</div>}

                  <div style={{ marginTop: 18, display: "flex", gap: 10, borderTop: "1px solid #F1F5F9", paddingTop: 16 }}>
                    <button type="submit" disabled={reqSaving} style={{
                      padding: "9px 28px", borderRadius: 9, border: "none", cursor: reqSaving ? "not-allowed" : "pointer",
                      background: reqSaving ? "#93C5FD" : BLUE_M, color: "#fff",
                      fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif",
                    }}>
                      {reqSaving ? "جارٍ الحفظ…" : isEdit ? "حفظ التعديلات" : "حفظ وإرسال الطلب"}
                    </button>
                    {!isEdit && formTab === "project" && (
                      <button type="button" onClick={() => setFormTab("vendor")} style={{
                        padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${BLUE_M}`, cursor: "pointer",
                        background: "#fff", color: BLUE_M, fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif",
                      }}>بيانات الطرف الثاني</button>
                    )}
                    {!isEdit && formTab === "vendor" && (
                      <button type="button" onClick={() => setFormTab("project")} style={{
                        padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${BLUE_M}`, cursor: "pointer",
                        background: "#fff", color: BLUE_M, fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif",
                      }}>بيانات المشروع</button>
                    )}
                    <button type="button" onClick={() => { setShowNewReq(false); setEditTarget(null); setReqErr(""); }} style={{
                      padding: "9px 18px", borderRadius: 9, border: "1px solid #E2E8F0", cursor: "pointer",
                      background: "#F8FAFC", color: "#64748B", fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif",
                    }}>إلغاء</button>
                  </div>
                </div>
              </form>
            )}
          </div>
        );
      })()}

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
                        if (found) {
                          setAddContract(found);
                          setAddValue(String(found.value || ""));
                          setAddReason("");
                          setAddNotes("");
                          setAddFormTab("project");
                          setAddEditForm({
                            title:               found.title              || "",
                            projectName:         found.projectName        || "",
                            projectNo:           found.projectNo          || "",
                            issuerEntity:        found.issuerEntity       || "",
                            workType:            found.workType           || "",
                            contractType:        found.contractType       || "خدمات",
                            value:               found.value != null ? String(found.value) : "",
                            startDate:           found.startDate          || "",
                            endDate:             found.endDate            || "",
                            contractDuration:    found.contractDuration   || "",
                            priceAnalysisStatus: found.priceAnalysisStatus|| "",
                            costEstimationDept:  found.costEstimationDept || "",
                            vendorName:          found.vendorName         || "",
                            vendorContact:       found.vendorContact      || "",
                            vendorIban:          found.vendorIban         || "",
                            vendorTaxNo:         found.vendorTaxNo        || "",
                            vendorDelegate:      found.vendorDelegate     || "",
                            vendorDelegateTitle: found.vendorDelegateTitle|| "",
                            vendorDelegateId:    found.vendorDelegateId   || "",
                            vendorEmail:         found.vendorEmail        || "",
                            vendorAddress:       found.vendorAddress      || "",
                            vendorPostalCode:    found.vendorPostalCode   || "",
                            vendorRegExpiry:     found.vendorRegExpiry    || "",
                            vendorEntityType:    found.vendorEntityType   || "",
                          });
                        } else setAddErr(`لم يُعثر على عقد برقم "${addNoQuery}" — تحقق من الرقم وحاول مجدداً`);
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

              {/* Step 2: Full editable form + addendum fields */}
              {addContract && (() => {
                const aFld = (key: keyof FormData) => addEditForm[key] as string;
                const aSet = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
                  setAddEditForm(p => ({ ...p, [key]: e.target.value }));
                const AField = ({ label, fkey, type = "text", placeholder = "" }: { label: string; fkey: keyof FormData; type?: string; placeholder?: string }) => (
                  <div>
                    <label style={{ display: "block", fontSize: "0.63rem", fontWeight: 700, color: "#64748B", marginBottom: 4 }}>{label}</label>
                    <input
                      type={type}
                      value={aFld(fkey)}
                      onChange={aSet(fkey)}
                      placeholder={placeholder}
                      style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", borderRadius: 7, border: "1.5px solid #E2E8F0", fontSize: "0.77rem", fontFamily: "'Cairo','Tajawal',sans-serif", outline: "none" }}
                      onFocus={e => { e.currentTarget.style.borderColor = GOLD; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
                    />
                  </div>
                );
                const ASelect = ({ label, fkey, options }: { label: string; fkey: keyof FormData; options: string[] }) => (
                  <div>
                    <label style={{ display: "block", fontSize: "0.63rem", fontWeight: 700, color: "#64748B", marginBottom: 4 }}>{label}</label>
                    <select value={aFld(fkey)} onChange={aSet(fkey)} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1.5px solid #E2E8F0", fontSize: "0.77rem", fontFamily: "'Cairo','Tajawal',sans-serif", background: "#fff" }}>
                      <option value="">— اختر —</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                );
                const AFilePill = ({ label }: { label: string }) => (
                  <div>
                    <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94A3B8", marginBottom: 4 }}>{label}</div>
                    <button type="button" style={{ padding: "5px 12px", borderRadius: 7, background: "#F8FAFC", border: "1.5px dashed #CBD5E1", fontSize: "0.66rem", color: "#94A3B8", cursor: "default", fontFamily: "'Cairo','Tajawal',sans-serif" }}>رقم ملف</button>
                  </div>
                );
                return (
                  <form
                    onSubmit={async e => {
                      e.preventDefault();
                      if (!addReason.trim()) { setAddErr("سبب الملحق مطلوب"); return; }
                      if (!addEditForm.vendorName.trim()) { setAddErr("اسم الطرف الثاني مطلوب"); setAddFormTab("vendor"); return; }
                      setAddSaving(true); setAddErr("");
                      try {
                        const addendumTitle = `ملحق [${addContract.contractNo}]: ${addReason.trim().slice(0, 60)}`;
                        await createContract({
                          title: addendumTitle,
                          projectName:         addEditForm.projectName.trim(),
                          projectNo:           addEditForm.projectNo.trim(),
                          issuerEntity:        addEditForm.issuerEntity.trim(),
                          workType:            addEditForm.workType,
                          contractType:        "ملحق عقد",
                          value:               parseFloat(addEditForm.value) || 0,
                          startDate:           addEditForm.startDate,
                          endDate:             addEditForm.endDate,
                          contractDuration:    addEditForm.contractDuration.trim(),
                          priceAnalysisStatus: addEditForm.priceAnalysisStatus.trim(),
                          costEstimationDept:  addEditForm.costEstimationDept.trim(),
                          vendorName:          addEditForm.vendorName.trim(),
                          vendorContact:       addEditForm.vendorContact.trim(),
                          vendorIban:          addEditForm.vendorIban.trim(),
                          vendorTaxNo:         addEditForm.vendorTaxNo.trim(),
                          vendorDelegate:      addEditForm.vendorDelegate.trim(),
                          vendorDelegateTitle: addEditForm.vendorDelegateTitle.trim(),
                          vendorDelegateId:    addEditForm.vendorDelegateId.trim(),
                          vendorEmail:         addEditForm.vendorEmail.trim(),
                          vendorAddress:       addEditForm.vendorAddress.trim(),
                          vendorPostalCode:    addEditForm.vendorPostalCode.trim(),
                          vendorRegExpiry:     addEditForm.vendorRegExpiry,
                          vendorEntityType:    addEditForm.vendorEntityType.trim(),
                          createdBy: actorName || role,
                        });
                        setAddSuccess(true);
                      } catch { setAddErr("حدث خطأ أثناء الحفظ — يرجى المحاولة مجدداً"); }
                      finally { setAddSaving(false); }
                    }}
                  >
                    {/* Parent contract badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: "0.63rem", fontWeight: 700, color: "#94A3B8" }}>مرتبط بالعقد الأصلي:</span>
                      <span style={{ fontSize: "0.72rem", fontWeight: 900, color: GOLD2, background: `rgba(197,160,89,0.09)`, border: `1px solid rgba(197,160,89,0.22)`, borderRadius: 7, padding: "2px 10px" }}>{addContract.contractNo}</span>
                      <span style={{ fontSize: "0.72rem", color: DARK, fontWeight: 600, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{addContract.title}</span>
                    </div>

                    {/* سبب الملحق — always visible */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: "#64748B", marginBottom: 5 }}>
                        سبب إنشاء الملحق <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={addReason}
                        onChange={e => setAddReason(e.target.value)}
                        placeholder="مثال: زيادة نطاق الأعمال — إضافة بند إنشائي جديد..."
                        required
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.82rem", fontFamily: "'Cairo','Tajawal',sans-serif", resize: "vertical" }}
                      />
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", borderBottom: "2px solid #F1F5F9", marginBottom: 14 }}>
                      {([
                        { key: "project" as const, label: "بيانات المشروع" },
                        { key: "vendor"  as const, label: "بيانات الطرف الثاني" },
                      ]).map(t => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setAddFormTab(t.key)}
                          style={{
                            padding: "9px 18px", border: "none", cursor: "pointer",
                            background: "none", fontFamily: "'Cairo','Tajawal',sans-serif",
                            fontSize: "0.78rem", fontWeight: 700,
                            color: addFormTab === t.key ? GOLD2 : "#94A3B8",
                            borderBottom: addFormTab === t.key ? `3px solid ${GOLD}` : "3px solid transparent",
                            marginBottom: -2, transition: "all 0.15s",
                          }}
                        >{t.label}</button>
                      ))}
                    </div>

                    {/* Tab: بيانات المشروع */}
                    {addFormTab === "project" && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px,1fr))", gap: "12px 16px", marginBottom: 14 }}>
                        <AField label="عنوان الملحق / موضوع العقد" fkey="title" placeholder="عنوان الملحق" />
                        <AField label="اسم المشروع" fkey="projectName" placeholder="اسم المشروع" />
                        <AField label="رقم المشروع" fkey="projectNo" placeholder="PRJ-2024-001" />
                        <AField label="جهة إصدار الطلب" fkey="issuerEntity" placeholder="الجهة المُصدِرة" />
                        <ASelect label="نوع الأعمال" fkey="workType" options={WORK_TYPES} />
                        <AField label="قيمة الملحق (ريال)" fkey="value" type="number" placeholder="0" />
                        <AField label="مدة العقد" fkey="contractDuration" placeholder="مثال: 12 شهراً" />
                        <AField label="تاريخ البداية" fkey="startDate" type="date" />
                        <AField label="تاريخ النهاية"  fkey="endDate"   type="date" />
                        <AField label="حالة تحليل السعر" fkey="priceAnalysisStatus" placeholder="معتمد / قيد المراجعة" />
                        <AField label="القسم المرجعي (تقدير التكلفة)" fkey="costEstimationDept" placeholder="القسم الهندسي / المشتريات" />
                        <AFilePill label="مقارنة مالية وفنية" />
                        <AFilePill label="عقد مماثل" />
                        <AFilePill label="المخططات" />
                        <AFilePill label="توصيفات" />
                        <AFilePill label="طلب إصدار العقد — BOQ" />
                      </div>
                    )}

                    {/* Tab: بيانات الطرف الثاني */}
                    {addFormTab === "vendor" && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px,1fr))", gap: "12px 16px", marginBottom: 14 }}>
                        <AField label="اسم الطرف الثاني" fkey="vendorName" placeholder="اسم الشركة أو المورد" />
                        <AField label="جهة الاتصال" fkey="vendorContact" placeholder="رقم الهاتف أو اسم المسؤول" />
                        <AField label="رقم الأيبان (IBAN)" fkey="vendorIban" placeholder="SA00 0000 0000 0000 0000 0000" />
                        <AField label="رقم / شهادة ضريبة القيمة المضافة" fkey="vendorTaxNo" placeholder="رقم التسجيل الضريبي" />
                        <AField label="ممثل الطرف الثاني" fkey="vendorDelegate" placeholder="الاسم الكامل للممثل" />
                        <AField label="صفته (المسمى الوظيفي)" fkey="vendorDelegateTitle" placeholder="المدير العام / المفوض..." />
                        <AField label="رقم الهوية / الإقامة للمفوض" fkey="vendorDelegateId" placeholder="رقم الهوية أو الإقامة" />
                        <AField label="البريد الإلكتروني الرسمي للمنشأة" fkey="vendorEmail" type="email" placeholder="info@company.com" />
                        <AField label="العنوان الوطني" fkey="vendorAddress" placeholder="المدينة، الحي، الشارع" />
                        <AField label="الرمز البريدي" fkey="vendorPostalCode" placeholder="00000" />
                        <AField label="نوع المنشأة" fkey="vendorEntityType" placeholder="شركة ذ.م.م / مؤسسة فردية..." />
                        <AField label="انتهاء السجل التجاري" fkey="vendorRegExpiry" type="date" />
                        <AFilePill label="السجل التجاري" />
                        <AFilePill label="عقد التأسيس" />
                        <AFilePill label="العرض المالي والفني للمنشأة" />
                        <AFilePill label="طلب أسعار مماثلة — عرض 1" />
                        <AFilePill label="طلب أسعار مماثلة — عرض 2" />
                        <AFilePill label="طلب أسعار مماثلة — عرض 3" />
                      </div>
                    )}

                    {/* ملاحظات */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: "0.67rem", fontWeight: 700, color: "#64748B", marginBottom: 5 }}>ملاحظات إضافية</label>
                      <textarea
                        rows={2}
                        value={addNotes}
                        onChange={e => setAddNotes(e.target.value)}
                        placeholder="أي ملاحظات تكميلية…"
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.82rem", fontFamily: "'Cairo','Tajawal',sans-serif", resize: "vertical" }}
                      />
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
                      {addFormTab === "project" && (
                        <button type="button" onClick={() => setAddFormTab("vendor")} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${GOLD_BOR}`, cursor: "pointer", background: "#fff", color: GOLD2, fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif" }}>بيانات الطرف الثاني</button>
                      )}
                      {addFormTab === "vendor" && (
                        <button type="button" onClick={() => setAddFormTab("project")} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${GOLD_BOR}`, cursor: "pointer", background: "#fff", color: GOLD2, fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif" }}>بيانات المشروع</button>
                      )}
                      <button type="button" onClick={() => { setShowAddendum(false); setAddContract(null); }} style={{
                        padding: "9px 18px", borderRadius: 9, border: "1px solid #E2E8F0", cursor: "pointer",
                        background: "#F8FAFC", color: "#64748B", fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif",
                      }}>إلغاء</button>
                    </div>
                  </form>
                );
              })()}
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
                  ...(role === PM_ROLE ? [{ label: "عمليات", width: 70, note: undefined }] : []),
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

                    {/* عمليات — PM only */}
                    {role === PM_ROLE && (
                      <td style={{ padding: "13px 10px", textAlign: "center" }}>
                        {c.currentStage === 1 && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditTarget(c);
                              setForm({
                                title:               c.title              || "",
                                projectName:         c.projectName        || "",
                                projectNo:           c.projectNo          || "",
                                issuerEntity:        c.issuerEntity       || "",
                                workType:            c.workType           || "",
                                contractType:        c.contractType       || "خدمات",
                                value:               c.value != null ? String(c.value) : "",
                                startDate:           c.startDate          || "",
                                endDate:             c.endDate            || "",
                                contractDuration:    c.contractDuration   || "",
                                priceAnalysisStatus: c.priceAnalysisStatus|| "",
                                costEstimationDept:  c.costEstimationDept || "",
                                vendorName:          c.vendorName         || "",
                                vendorContact:       c.vendorContact      || "",
                                vendorIban:          c.vendorIban         || "",
                                vendorTaxNo:         c.vendorTaxNo        || "",
                                vendorDelegate:      c.vendorDelegate     || "",
                                vendorDelegateTitle: c.vendorDelegateTitle|| "",
                                vendorDelegateId:    c.vendorDelegateId   || "",
                                vendorEmail:         c.vendorEmail        || "",
                                vendorAddress:       c.vendorAddress      || "",
                                vendorPostalCode:    c.vendorPostalCode   || "",
                                vendorRegExpiry:     c.vendorRegExpiry    || "",
                                vendorEntityType:    c.vendorEntityType   || "",
                              });
                              setFormTab("project");
                              setShowAddendum(false);
                              setReqErr("");
                              setReqSuccess(false);
                              setShowNewReq(true);
                            }}
                            style={{
                              padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                              background: "rgba(25,118,210,0.09)",
                              border: "1.5px solid rgba(25,118,210,0.30)",
                              color: BLUE_M, fontSize: "0.64rem", fontWeight: 700,
                              fontFamily: "'Cairo','Tajawal',sans-serif",
                              whiteSpace: "nowrap", transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(25,118,210,0.17)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(25,118,210,0.09)"; }}
                          >
                            تعديل
                          </button>
                        )}
                      </td>
                    )}

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
