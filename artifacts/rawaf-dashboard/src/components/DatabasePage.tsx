import { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, Pencil, Lock, Download, Copy } from "lucide-react";
import * as XLSX from "xlsx";
import {
  useListContractors,
  useCreateContractor,
  useDeleteContractor,
  useUpdateContractor,
  getListContractorsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Contractor } from "@workspace/api-client-react";

const DB_PASSWORD = "rawaf@2024";
const SESSION_KEY = "rawaf_db_auth";

/* ─── Form Data ───────────────────────────────── */
interface FormData {
  contractNo:     string;
  contractor:     string;
  project:        string;
  portfolio:      string;
  mainActivity:   string;
  workType:       string;
  technicalScope: string;
  workCategory:   string;
  unit:           string;
  price:          string;
  phone:          string;
  email:          string;
  /* preserved but hidden from form UI */
  localContent:   string;
  workDescription:string;
  workScopeText:  string;
}

const EMPTY_FORM: FormData = {
  contractNo: "", contractor: "", project: "", portfolio: "",
  mainActivity: "", workType: "", technicalScope: "",
  workCategory: "", unit: "", price: "", phone: "", email: "",
  localContent: "", workDescription: "", workScopeText: "",
};

const LOCAL_CONTENT_OPTIONS = ["", "مسجل", "غير مسجل"];

/* Column order matches the table exactly */
const FORM_FIELDS: { key: keyof FormData; label: string; type?: string; wide?: boolean; rows?: number; options?: string[] }[] = [
  { key: "contractNo",     label: "١. رقم العقد" },
  { key: "contractor",     label: "٢. اسم المقاول / المورد" },
  { key: "project",        label: "٣. المشروع" },
  { key: "portfolio",      label: "٤. المحفظة" },
  { key: "mainActivity",   label: "٥. النشاط الرئيسي" },
  { key: "workType",       label: "٦. نوع الأعمال" },
  { key: "technicalScope", label: "٧. الوصف الفني للبند", wide: true, rows: 3 },
  { key: "workCategory",   label: "٨. نوع العمل (تصنيف)" },
  { key: "unit",           label: "٩. الوحدة" },
  { key: "price",          label: "١٠. السعر (ريال)", type: "number" },
  { key: "localContent",   label: "١١. المحتوى المحلي", type: "dropdown", options: LOCAL_CONTENT_OPTIONS },
  { key: "phone",          label: "١٢. رقم التواصل" },
  { key: "email",          label: "١٣. البريد الإلكتروني" },
];

/* ─── Helpers ───────────────────────────────── */
function contractorToForm(c: Contractor): FormData {
  return {
    contractNo:      c.contractNo,
    contractor:      c.contractor,
    project:         c.project,
    portfolio:       c.portfolio,
    mainActivity:    (c as any).mainActivity ?? "",
    workType:        c.workType,
    technicalScope:  c.technicalScope,
    workCategory:    (c as any).workCategory ?? "",
    unit:            (c as any).unit ?? "",
    price:           String(c.price),
    phone:           c.phone,
    email:           c.email,
    localContent:    (c as any).localContent ?? "",
    workDescription: (c as any).workDescription ?? "",
    workScopeText:   (c as any).workScopeText ?? "",
  };
}

function buildPutData(f: FormData, rating?: number | null) {
  return {
    contractNo:      f.contractNo,
    contractor:      f.contractor,
    project:         f.project,
    portfolio:       f.portfolio,
    mainActivity:    f.mainActivity.trim()    || null,
    workType:        f.workType,
    technicalScope:  f.technicalScope,
    workCategory:    f.workCategory.trim()    || null,
    unit:            f.unit.trim()            || null,
    price:           Math.min(Math.round(parseFloat(f.price) || 0), 2_000_000_000),
    phone:           f.phone,
    email:           f.email,
    localContent:    f.localContent.trim()    || null,
    workDescription: f.workDescription.trim() || null,
    workScopeText:   f.workScopeText.trim()   || null,
    rating:          rating ?? null,
  };
}

function normalize(s: string) {
  return s.replace(/[\u064B-\u065F]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase().trim();
}
function exactMatch(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return normalize(haystack).includes(normalize(needle));
}

/* ─── Sub-components ───────────────────────────── */
function StarDisplay({ rating }: { rating?: number | null }) {
  const r = Math.max(0, Math.min(5, Math.round(rating ?? 0)));
  return (
    <div style={{ display: "flex", gap: "1px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: "0.95rem", color: i <= r ? "#f5c518" : "#e0dbd0", lineHeight: 1, filter: i <= r ? "drop-shadow(0 0 2px rgba(245,197,24,0.4))" : "none" }}>★</span>
      ))}
      {r > 0 && <span style={{ fontSize: "0.6rem", color: "#aaa", marginRight: "3px" }}>{r}/5</span>}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} onClick={() => onChange(i === value ? 0 : i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
          style={{ fontSize: "1.6rem", cursor: "pointer", color: i <= (hover || value) ? "#f5c518" : "#ddd", transition: "color 0.12s, transform 0.12s", display: "inline-block", transform: hover === i ? "scale(1.25)" : i <= value ? "scale(1.08)" : "scale(1)" }}
        >★</span>
      ))}
      <span style={{ fontSize: "0.75rem", color: "#aaa", marginRight: "6px" }}>{value > 0 ? `${value}/5` : "بدون تقييم"}</span>
    </div>
  );
}

function exportToExcel(data: Contractor[]) {
  const rows = data.map((c) => ({
    "رقم العقد":            c.contractNo,
    "المقاول / المورد":     c.contractor,
    "المشروع":              c.project,
    "المحفظة":              c.portfolio,
    "النشاط الرئيسي":       (c as any).mainActivity ?? "",
    "نوع الأعمال":          c.workType,
    "الوصف الفني للبند":    c.technicalScope,
    "نوع العمل":            (c as any).workCategory ?? "",
    "الوحدة":               (c as any).unit ?? "",
    "السعر (ريال)":         c.price,
    "رقم التواصل":          c.phone,
    "البريد الإلكتروني":    c.email,
    "التقييم":              (c as any).rating ?? 0,
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
  if (!ws["!views"]) ws["!views"] = [];
  (ws["!views"] as any[])[0] = { rightToLeft: true };
  ws["!cols"] = [
    { wch: 14 }, { wch: 28 }, { wch: 24 }, { wch: 12 },
    { wch: 18 }, { wch: 14 }, { wch: 36 }, { wch: 14 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 8 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المقاولون");
  XLSX.writeFile(wb, `rawaf_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ─── Styles ───────────────────────────────── */
const tdStyle: React.CSSProperties = { padding: "9px 12px", fontSize: "0.76rem", color: "#555", verticalAlign: "middle", whiteSpace: "nowrap" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(30,25,20,0.55)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" };
const modalStyle: React.CSSProperties = { width: "100%", maxWidth: "680px", maxHeight: "88vh", overflowY: "auto", padding: "28px 28px", position: "relative" };
const closeBtnStyle: React.CSSProperties = { position: "absolute", top: "16px", left: "16px", background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: "4px" };
const modalTitleStyle: React.CSSProperties = { fontSize: "0.95rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "6px" };
const labelStyle: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid #e8e0d0", borderRadius: "8px", fontSize: "0.8rem", fontFamily: "Tajawal, sans-serif", direction: "rtl", outline: "none", background: "#faf8f4", boxSizing: "border-box", transition: "border-color 0.18s" };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", lineHeight: 1.6 };
const iconBtnStyle = (color: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "5px", background: `${color}15`, border: `1px solid ${color}30`, color, cursor: "pointer", transition: "background 0.15s" });
const submitBtnStyle: React.CSSProperties = { flex: 1, background: "linear-gradient(135deg, var(--gold), #a88540)", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" };
const cancelBtnStyle: React.CSSProperties = { background: "#f5f0e8", color: "var(--charcoal)", border: "none", borderRadius: "10px", padding: "12px 20px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" };
const roFieldStyle: React.CSSProperties = { ...inputStyle, background: "#f0ece4", color: "#888", cursor: "not-allowed" };

/* ─── Props ───────────────────────────────── */
interface Props {
  search: string;
  onSelectContractor?: (id: number) => void;
  onSearchAndNavigate?: (term: string) => void;
}

/* ─── Main Component ───────────────────────────── */
export default function DatabasePage({ search, onSelectContractor, onSearchAndNavigate }: Props) {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [wasAutoLocked, setWasAutoLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [editRow, setEditRow]       = useState<Contractor | null>(null);
  const [editForm, setEditForm]     = useState<FormData>(EMPTY_FORM);
  const [editRating, setEditRating] = useState<number>(0);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm]         = useState<FormData>(EMPTY_FORM);
  const [addRating, setAddRating]     = useState<number>(0);

  const [cloneSource, setCloneSource]             = useState<Contractor | null>(null);
  const [cloneTechScope, setCloneTechScope]       = useState("");
  const [clonePrice, setClonePrice]               = useState("");
  const [cloneUnit, setCloneUnit]                 = useState("");
  const [cloneLocalContent, setCloneLocalContent] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  /* ── Idle auto-lock (5 min inactivity) ── */
  const IDLE_MS       = 5 * 60 * 1000; // 5 minutes
  const idleTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerAutoLock() {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
    setWasAutoLocked(true);
    setPasswordInput("");
    setPasswordError("");
    // Clear all open modals and sensitive form data
    setEditRow(null);
    setEditForm(EMPTY_FORM);
    setEditRating(0);
    setShowAddForm(false);
    setAddForm(EMPTY_FORM);
    setAddRating(0);
    setCloneSource(null);
    setCloneTechScope("");
    setClonePrice("");
    setCloneUnit("");
    setCloneLocalContent("");
    setDeleteConfirm(null);
  }

  useEffect(() => {
    if (!authenticated) return; // only arm the timer when logged in

    function resetIdleTimer() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(triggerAutoLock, IDLE_MS);
    }

    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    EVENTS.forEach((e) => document.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer(); // arm immediately on login

    return () => {
      EVENTS.forEach((e) => document.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const queryClient    = useQueryClient();
  const { data: contractors = [], isLoading } = useListContractors();
  const createMutation = useCreateContractor();
  const updateMutation = useUpdateContractor();
  const deleteMutation = useDeleteContractor();

  /* Exact-match filter + sort by contractor name then ID */
  const filtered = contractors
    .filter((c: Contractor) => {
      if (!search) return true;
      return (
        exactMatch(c.contractNo, search)                     ||
        exactMatch(c.contractor, search)                     ||
        exactMatch(c.project, search)                        ||
        exactMatch(c.portfolio, search)                      ||
        exactMatch(c.technicalScope, search)                 ||
        exactMatch(c.workType, search)                       ||
        exactMatch((c as any).mainActivity ?? "", search)    ||
        exactMatch((c as any).workCategory ?? "", search)    ||
        exactMatch((c as any).unit ?? "", search)            ||
        exactMatch(c.phone, search)                          ||
        exactMatch(c.email, search)
      );
    })
    .sort((a: Contractor, b: Contractor) => {
      const nameA = a.contractor.trim().toLowerCase();
      const nameB = b.contractor.trim().toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return a.id - b.id; // stable: older records first within same contractor
    });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === DB_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthenticated(true);
      setWasAutoLocked(false);
    } else {
      setPasswordError("كلمة المرور غير صحيحة، يرجى المحاولة مجدداً");
    }
  }

  function openEdit(c: Contractor) {
    setEditRow(c);
    setEditForm(contractorToForm(c));
    setEditRating((c as any).rating ?? 0);
  }

  function openClone(c: Contractor) {
    setCloneSource(c);
    setCloneTechScope(c.technicalScope);
    setClonePrice(String(c.price));
    setCloneUnit((c as any).unit ?? "");
    setCloneLocalContent((c as any).localContent ?? "");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    await updateMutation.mutateAsync({ id: editRow.id, data: buildPutData(editForm, editRating) });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setEditRow(null);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createMutation.mutateAsync({ data: buildPutData(addForm, addRating) });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setAddForm(EMPTY_FORM);
    setAddRating(0);
    setShowAddForm(false);
  }

  async function handleCloneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cloneSource) return;
    const baseForm = contractorToForm(cloneSource);
    await createMutation.mutateAsync({
      data: buildPutData(
        { ...baseForm, technicalScope: cloneTechScope, price: clonePrice, unit: cloneUnit, localContent: cloneLocalContent },
        (cloneSource as any).rating ?? null,
      ),
    });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setCloneSource(null);
  }

  async function handleDelete(id: number) {
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setDeleteConfirm(null);
  }

  /* ── Password gate ── */
  if (!authenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh", padding: "20px" }}>
        <div className="card animate-fade-up" style={{ maxWidth: "400px", width: "100%", padding: "40px 32px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, var(--gold), #a88540)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Lock size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "8px" }}>
            {wasAutoLocked ? "تم القفل التلقائي" : "قاعدة البيانات محمية"}
          </h2>
          {wasAutoLocked && (
            <div style={{ background: "rgba(197,160,89,0.08)", border: "1px solid rgba(197,160,89,0.25)", borderRadius: "8px", padding: "8px 14px", marginBottom: "12px", fontSize: "0.75rem", color: "#a88540" }}>
              انتهت جلستك بسبب عدم النشاط لمدة 5 دقائق. أعد تسجيل الدخول للمتابعة.
            </div>
          )}
          <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "24px" }}>أدخل كلمة المرور للوصول إلى السجل الشامل</p>
          <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input type="password" placeholder="كلمة المرور" value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
              style={{ width: "100%", padding: "12px 16px", border: `1.5px solid ${passwordError ? "#e74c3c" : "#e8e0d0"}`, borderRadius: "10px", fontSize: "0.9rem", fontFamily: "Tajawal, sans-serif", direction: "rtl", outline: "none", background: "#faf8f4", boxSizing: "border-box" }}
            />
            {passwordError && <span style={{ fontSize: "0.75rem", color: "#e74c3c" }}>{passwordError}</span>}
            <button type="submit" style={{ background: "linear-gradient(135deg, var(--gold), #a88540)", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
              دخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Main Table View ── */
  return (
    <div style={{ padding: "24px 20px", maxWidth: "1600px", margin: "0 auto" }}>

      {/* Actions row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "2px" }}>سجل البيانات الشامل</h2>
          <span style={{ fontSize: "0.72rem", color: "#aaa" }}>
            {filtered.length} سجل {search ? `(من ${contractors.length} — مفلتر بالبحث العلوي)` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => exportToExcel(filtered)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #1d7a45, #27ae60)", color: "#fff", border: "none", borderRadius: "10px", padding: "9px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", boxShadow: "0 3px 12px rgba(39,174,96,0.3)" }}
            title="تصدير البيانات الحالية إلى ملف Excel"
          >
            <Download size={14} />
            تصدير Excel
          </button>
          <button onClick={() => { setShowAddForm(true); setAddForm(EMPTY_FORM); setAddRating(0); }}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, var(--gold), #a88540)", color: "#fff", border: "none", borderRadius: "10px", padding: "9px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}
          >
            <Plus size={14} />
            إضافة سجل
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
            <thead>
              <tr style={{ background: "var(--charcoal)" }}>
                {[
                  "رقم العقد", "المقاول / المورد", "المشروع", "المحفظة",
                  "النشاط الرئيسي", "نوع الأعمال", "الوصف الفني للبند",
                  "نوع العمل", "الوحدة", "السعر", "المحتوى المحلي", "التواصل", "التقييم", "إجراءات"
                ].map((h, i) => (
                  <th key={i} style={{ padding: "12px 12px", textAlign: "right", fontSize: "0.63rem", fontWeight: 700, color: "rgba(197,160,89,0.9)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: "2px solid rgba(197,160,89,0.2)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={14} style={{ textAlign: "center", padding: "50px", color: "#aaa", fontSize: "0.85rem" }}>جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={14} style={{ textAlign: "center", padding: "50px", color: "#aaa", fontSize: "0.85rem" }}>لا توجد سجلات مطابقة</td></tr>
              ) : filtered.map((c: Contractor, idx: number) => (
                <tr key={c.id} style={{ background: idx % 2 === 0 ? "#fff" : "#faf8f4", borderBottom: "1px solid #f0ebe0" }}>
                  <td style={tdStyle}>{c.contractNo}</td>
                  {/* Contractor name — clickable → navigate to main tab */}
                  <td style={{ ...tdStyle, fontWeight: 700, cursor: "pointer", color: "var(--charcoal)" }}
                    onClick={() => onSelectContractor && onSelectContractor(c.id)}
                    title="اضغط لفتح البيانات في لوحة التنسيق الفني"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gold)"; (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--charcoal)"; (e.currentTarget as HTMLElement).style.textDecoration = ""; }}
                  >{c.contractor}</td>
                  <td style={tdStyle}>{c.project}</td>
                  <td style={tdStyle}>{c.portfolio}</td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#3b8fcc" }}>{(c as any).mainActivity || "—"}</td>
                  <td style={tdStyle}>
                    <span style={{ background: "rgba(197,160,89,0.1)", color: "var(--gold)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>{c.workType}</span>
                  </td>
                  {/* Technical scope — clickable → search in main tab */}
                  <td style={{ ...tdStyle, maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer", color: "var(--charcoal)" }}
                    title={`اضغط للبحث عن: ${c.technicalScope}`}
                    onClick={() => onSearchAndNavigate && onSearchAndNavigate(c.technicalScope)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#3b8fcc"; (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--charcoal)"; (e.currentTarget as HTMLElement).style.textDecoration = ""; }}
                  >{c.technicalScope}</td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#888" }}>{(c as any).workCategory || "—"}</td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#888" }}>{(c as any).unit || "—"}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "var(--gold)", whiteSpace: "nowrap", fontSize: "0.75rem", direction: "ltr", textAlign: "right" }}>
                    {c.price.toLocaleString("en")}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    {(c as any).localContent ? (
                      <span style={{
                        background: (c as any).localContent === "مسجل" ? "rgba(43,170,116,0.12)" : "rgba(200,200,200,0.18)",
                        color: (c as any).localContent === "مسجل" ? "#1d8a5a" : "#888",
                        border: `1px solid ${(c as any).localContent === "مسجل" ? "rgba(43,170,116,0.3)" : "rgba(180,180,180,0.3)"}`,
                        borderRadius: "6px", padding: "2px 9px", fontSize: "0.7rem", fontWeight: 700
                      }}>{(c as any).localContent}</span>
                    ) : <span style={{ color: "#ccc", fontSize: "0.7rem" }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: "0.7rem", color: "#888" }}>
                      <div>{c.phone}</div>
                      <div style={{ direction: "ltr", textAlign: "right" }}>{c.email}</div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, minWidth: "100px" }}>
                    <StarDisplay rating={(c as any).rating} />
                  </td>
                  <td style={{ ...tdStyle, width: "80px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} style={iconBtnStyle("#c5a059")} title="تعديل البيانات"><Pencil size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); openClone(c); }} style={iconBtnStyle("#2baa74")} title="إضافة بند جديد لنفس الشركة (تكرار)"><Copy size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }} style={iconBtnStyle("#e74c3c")} title="حذف السجل"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Delete Confirm ── */}
      {deleteConfirm !== null && (
        <div style={overlayStyle} onClick={() => setDeleteConfirm(null)}>
          <div className="card animate-fade-up" style={{ maxWidth: "360px", width: "100%", padding: "28px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <Trash2 size={32} style={{ color: "#e74c3c", margin: "0 auto 12px" }} />
            <h3 style={{ ...modalTitleStyle, marginBottom: "8px" }}>تأكيد الحذف</h3>
            <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "20px" }}>هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)} style={cancelBtnStyle}>إلغاء</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleteMutation.isPending}
                style={{ flex: 1, background: "linear-gradient(135deg, #e74c3c, #c0392b)", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                {deleteMutation.isPending ? "جاري الحذف..." : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editRow && (
        <div style={overlayStyle} onClick={() => setEditRow(null)}>
          <div className="card animate-fade-up" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditRow(null)} style={closeBtnStyle}><X size={16} /></button>
            <h3 style={modalTitleStyle}>تعديل بيانات: {editRow.contractor}</h3>
            <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "20px" }}>جميع الحقول اختيارية — عدّل ما تحتاجه ثم احفظ</p>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {FORM_FIELDS.map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: f.wide ? "1 / -1" : undefined }}>
                    <label style={{ ...labelStyle, color: "#c5a059" }}>{f.label}</label>
                    {f.wide ? (
                      <textarea rows={f.rows ?? 2} value={editForm[f.key]} onChange={(e) => setEditForm((p) => ({ ...p, [f.key]: e.target.value }))} style={textareaStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    ) : f.type === "dropdown" ? (
                      <select value={editForm[f.key]} onChange={(e) => setEditForm((p) => ({ ...p, [f.key]: e.target.value }))} style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
                        {(f.options ?? []).map((opt) => <option key={opt} value={opt}>{opt || "— اختر —"}</option>)}
                      </select>
                    ) : (
                      <input type={f.type ?? "text"} value={editForm[f.key]} onChange={(e) => setEditForm((p) => ({ ...p, [f.key]: e.target.value }))} style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    )}
                  </div>
                ))}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ ...labelStyle, color: "#c5a059" }}>١٤. التقييم</label>
                  <div style={{ marginTop: "6px" }}><StarPicker value={editRating} onChange={setEditRating} /></div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setEditRow(null)} style={cancelBtnStyle}>إلغاء</button>
                <button type="submit" disabled={updateMutation.isPending} style={submitBtnStyle}>
                  {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAddForm && (
        <div style={overlayStyle} onClick={() => setShowAddForm(false)}>
          <div className="card animate-fade-up" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAddForm(false)} style={closeBtnStyle}><X size={16} /></button>
            <h3 style={modalTitleStyle}>إضافة سجل جديد</h3>
            <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "20px" }}>جميع الحقول اختيارية — أدخل المعلومات المتوفرة</p>
            <form onSubmit={handleAddSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {FORM_FIELDS.map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: f.wide ? "1 / -1" : undefined }}>
                    <label style={{ ...labelStyle, color: "#c5a059" }}>{f.label}</label>
                    {f.wide ? (
                      <textarea rows={f.rows ?? 2} value={addForm[f.key]} onChange={(e) => setAddForm((p) => ({ ...p, [f.key]: e.target.value }))} style={textareaStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    ) : f.type === "dropdown" ? (
                      <select value={addForm[f.key]} onChange={(e) => setAddForm((p) => ({ ...p, [f.key]: e.target.value }))} style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
                        {(f.options ?? []).map((opt) => <option key={opt} value={opt}>{opt || "— اختر —"}</option>)}
                      </select>
                    ) : (
                      <input type={f.type ?? "text"} value={addForm[f.key]} onChange={(e) => setAddForm((p) => ({ ...p, [f.key]: e.target.value }))} style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    )}
                  </div>
                ))}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ ...labelStyle, color: "#c5a059" }}>١٤. التقييم</label>
                  <div style={{ marginTop: "6px" }}><StarPicker value={addRating} onChange={setAddRating} /></div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setShowAddForm(false)} style={cancelBtnStyle}>إلغاء</button>
                <button type="submit" disabled={createMutation.isPending} style={submitBtnStyle}>
                  {createMutation.isPending ? "جاري الحفظ..." : "إضافة السجل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Clone Modal ("+") ── */}
      {cloneSource && (
        <div style={overlayStyle} onClick={() => setCloneSource(null)}>
          <div className="card animate-fade-up" style={{ ...modalStyle, maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setCloneSource(null)} style={closeBtnStyle}><X size={16} /></button>
            <h3 style={modalTitleStyle}>إضافة بند جديد لنفس الشركة</h3>
            <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "18px" }}>
              سيتم نسخ بيانات الشركة كما هي — عدّل الوصف الفني والسعر فقط ثم احفظ كسجل جديد مستقل
            </p>
            {/* Read-only source info */}
            <div style={{ background: "#f9f7f3", borderRadius: "10px", padding: "12px 16px", marginBottom: "18px", border: "1px solid #ede8de" }}>
              <div style={{ fontSize: "0.6rem", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>بيانات منقولة تلقائياً (للقراءة فقط)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: "اسم الشركة", value: cloneSource.contractor },
                  { label: "رقم العقد الأصلي", value: cloneSource.contractNo },
                  { label: "المشروع", value: cloneSource.project },
                  { label: "المحفظة", value: cloneSource.portfolio },
                  { label: "النشاط الرئيسي", value: (cloneSource as any).mainActivity || "—" },
                  { label: "نوع الأعمال", value: cloneSource.workType },
                  { label: "نوع العمل", value: (cloneSource as any).workCategory || "—" },
                  { label: "رقم التواصل", value: cloneSource.phone },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: "0.57rem", color: "#bbb", marginBottom: "2px" }}>{item.label}</div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#888" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Editable fields */}
            <form onSubmit={handleCloneSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "18px" }}>
                <div>
                  <label style={{ ...labelStyle, color: "#c5a059", display: "block", marginBottom: "5px" }}>الوصف الفني للبند الجديد</label>
                  <textarea rows={4} value={cloneTechScope} onChange={(e) => setCloneTechScope(e.target.value)} style={textareaStyle}
                    onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")}
                    placeholder="أدخل وصف الأعمال للبند الجديد..."
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: "#c5a059", display: "block", marginBottom: "5px" }}>السعر الجديد (ريال)</label>
                  <input type="number" value={clonePrice} onChange={(e) => setClonePrice(e.target.value)} style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")}
                    placeholder="0" min="0"
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: "#c5a059", display: "block", marginBottom: "5px" }}>الوحدة</label>
                  <input type="text" value={cloneUnit} onChange={(e) => setCloneUnit(e.target.value)} style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")}
                    placeholder="م2، م3، م.ط، نقطة..."
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: "#c5a059", display: "block", marginBottom: "5px" }}>المحتوى المحلي</label>
                  <select value={cloneLocalContent} onChange={(e) => setCloneLocalContent(e.target.value)} style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
                    {LOCAL_CONTENT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt || "— اختر —"}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setCloneSource(null)} style={cancelBtnStyle}>إلغاء</button>
                <button type="submit" disabled={createMutation.isPending} style={{ ...submitBtnStyle, background: "linear-gradient(135deg, #2baa74, #1d8a5a)" }}>
                  {createMutation.isPending ? "جاري الحفظ..." : "حفظ كسجل جديد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
