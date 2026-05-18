import { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, Pencil, Lock, Download, Copy, Cloud } from "lucide-react";
import CloudSyncModal from "./CloudSyncModal";
import type { FilterState } from "./filterTypes";
import logoImg from "@assets/logo_1776506524686.jpg";
import * as XLSX from "xlsx";
import {
  createContractor,
  updateContractor,
  deleteContractor,
} from "../contractors/api";
import { useContractorsContext } from "../contractors/context";
import type { Contractor } from "../contractors/types";

const DB_PASSWORD = "maged@2026";
const SESSION_KEY = "rawaf_db_auth";

/* ─── Form Data ───────────────────────────────── */
interface FormData {
  contractNo:      string;
  contractYear:    string;
  contractor:      string;
  project:         string;
  portfolio:       string;
  mainActivity:    string;
  businessProgram: string;
  workFamily:      string;
  workType:        string;
  itemScope:       string;
  techSpecs:       string;
  measurements:    string;
  itemCode:        string;
  technicalScope:  string;
  workCategory:    string;
  unit:            string;
  price:           string;
  phone:           string;
  email:           string;
  /* preserved but hidden from form UI */
  localContent:    string;
  workDescription: string;
  workScopeText:   string;
}

const EMPTY_FORM: FormData = {
  contractNo: "", contractYear: "", contractor: "", project: "", portfolio: "",
  mainActivity: "", businessProgram: "", workFamily: "",
  workType: "", itemScope: "", techSpecs: "", measurements: "", itemCode: "",
  technicalScope: "", workCategory: "", unit: "", price: "", phone: "", email: "",
  localContent: "", workDescription: "", workScopeText: "",
};

const LOCAL_CONTENT_OPTIONS = ["", "مسجل", "غير مسجل"];

/* Column order matches the table exactly */
const FORM_FIELDS: { key: keyof FormData; label: string; type?: string; wide?: boolean; rows?: number; options?: string[] }[] = [
  { key: "contractNo",      label: "١. رقم العقد" },
  { key: "contractYear",    label: "٢. سنة العقد" },
  { key: "contractor",      label: "٣. اسم المقاول / المورد" },
  { key: "project",         label: "٤. المشروع" },
  { key: "portfolio",       label: "٥. المحفظة" },
  { key: "mainActivity",    label: "٦. النشاط الرئيسي" },
  { key: "businessProgram", label: "٧. برنامج الأعمال" },
  { key: "workFamily",      label: "٨. عائلة الأعمال" },
  { key: "workType",        label: "٩. نوع الأعمال" },
  { key: "itemScope",       label: "١٠. شمولية البند" },
  { key: "techSpecs",       label: "١١. مواصفات فنية" },
  { key: "measurements",    label: "١٢. قياسات" },
  { key: "itemCode",        label: "١٣. كود الفريد للبند" },
  { key: "technicalScope",  label: "١٤. الوصف الفني للبند", wide: true, rows: 3 },
  { key: "workCategory",    label: "١٥. نوع التعاقد" },
  { key: "unit",            label: "١٦. الوحدة" },
  { key: "price",           label: "١٧. السعر (ريال)", type: "number" },
  { key: "localContent",    label: "١٨. المحتوى المحلي", type: "dropdown", options: LOCAL_CONTENT_OPTIONS },
  { key: "phone",           label: "١٩. رقم التواصل" },
  { key: "email",           label: "٢٠. البريد الإلكتروني" },
];

/* ─── Helpers ───────────────────────────────── */
function contractorToForm(c: Contractor): FormData {
  return {
    contractNo:      c.contractNo,
    contractYear:    c.contractYear ?? "",
    contractor:      c.contractor,
    project:         c.project,
    portfolio:       c.portfolio,
    mainActivity:    c.mainActivity ?? "",
    businessProgram: c.businessProgram ?? "",
    workFamily:      c.workFamily ?? "",
    workType:        c.workType,
    itemScope:       c.itemScope ?? "",
    techSpecs:       c.techSpecs ?? "",
    measurements:    c.measurements ?? "",
    itemCode:        c.itemCode ?? "",
    technicalScope:  c.technicalScope,
    workCategory:    c.workCategory ?? "",
    unit:            c.unit ?? "",
    price:           String(c.price),
    phone:           c.phone,
    email:           c.email,
    localContent:    c.localContent ?? "",
    workDescription: c.workDescription ?? "",
    workScopeText:   c.workScopeText ?? "",
  };
}

function buildPutData(f: FormData, rating?: number | null): Omit<Contractor, "id"> {
  return {
    contractNo:      f.contractNo,
    contractYear:    f.contractYear.trim()    || null,
    contractor:      f.contractor,
    project:         f.project,
    portfolio:       f.portfolio,
    mainActivity:    f.mainActivity.trim()    || null,
    businessProgram: f.businessProgram.trim() || null,
    workFamily:      f.workFamily.trim()      || null,
    workType:        f.workType,
    itemScope:       f.itemScope.trim()       || null,
    techSpecs:       f.techSpecs.trim()       || null,
    measurements:    f.measurements.trim()    || null,
    itemCode:        f.itemCode.trim()        || null,
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
  return (s ?? "").replace(/[\u064B-\u065F]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase().trim();
}

/* Used for free-text search bar — partial/contains matching */
function containsMatch(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return normalize(haystack).includes(normalize(needle));
}

/* Used for filter dropdowns — strict normalized equality (Exact Match) */
function strictMatch(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return normalize(haystack) === normalize(needle);
}

/* ─── Sub-components ───────────────────────────── */
function StarDisplay({ rating }: { rating?: number | null }) {
  const r = Math.max(0, Math.min(5, Math.round(rating ?? 0)));
  return (
    <div style={{ display: "flex", gap: "1px", alignItems: "center", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: "0.75rem", color: i <= r ? "#f5c518" : "#e0dbd0", lineHeight: 1, flexShrink: 0, filter: i <= r ? "drop-shadow(0 0 2px rgba(245,197,24,0.4))" : "none" }}>★</span>
      ))}
      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: r > 0 ? "#c5a059" : "#ccc", marginRight: "3px", flexShrink: 0 }}>{r > 0 ? r : "—"}</span>
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
    "رقم العقد":              c.contractNo,
    "سنة العقد":              c.contractYear ?? "",
    "المقاول / المورد":       c.contractor,
    "المشروع":                c.project,
    "المحفظة":                c.portfolio,
    "النشاط الرئيسي":         c.mainActivity ?? "",
    "برنامج الأعمال":         c.businessProgram ?? "",
    "عائلة الأعمال":          c.workFamily ?? "",
    "نوع الأعمال":            c.workType,
    "شمولية البند":           c.itemScope ?? "",
    "مواصفات فنية":           c.techSpecs ?? "",
    "قياسات":                 c.measurements ?? "",
    "كود الفريد للبند":       c.itemCode ?? "",
    "الوصف الفني للبند":      c.technicalScope,
    "نوع التعاقد":            c.workCategory ?? "",
    "الوحدة":                 c.unit ?? "",
    "السعر (ريال)":           c.price,
    "المحتوى المحلي":         c.localContent ?? "",
    "رقم التواصل":            c.phone,
    "البريد الإلكتروني":      c.email,
    "التقييم":                c.rating ?? 0,
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
  if (!ws["!views"]) ws["!views"] = [];
  (ws["!views"] as any[])[0] = { rightToLeft: true };
  ws["!cols"] = [
    { wch: 14 }, { wch: 10 }, { wch: 28 }, { wch: 22 }, { wch: 12 },
    { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 36 }, { wch: 14 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 8 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المقاولون");
  XLSX.writeFile(wb, `rawaf_contractors_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ─── Styles ───────────────────────────────── */
const tdStyle: React.CSSProperties = { padding: "7px 4px", fontSize: "0.7rem", color: "#555", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(30,25,20,0.55)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" };
const modalStyle: React.CSSProperties = { width: "100%", maxWidth: "680px", maxHeight: "88vh", overflowY: "auto", padding: "28px 28px", position: "relative" };
const closeBtnStyle: React.CSSProperties = { position: "absolute", top: "16px", left: "16px", background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: "4px" };
const modalTitleStyle: React.CSSProperties = { fontSize: "0.95rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "6px" };
const labelStyle: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid #e8e0d0", borderRadius: "8px", fontSize: "0.8rem", fontFamily: "Tajawal, sans-serif", direction: "rtl", outline: "none", background: "#faf8f4", boxSizing: "border-box", transition: "border-color 0.18s" };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", lineHeight: 1.6 };
const iconBtnStyle = (color: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "4px", background: "transparent", border: "none", color, cursor: "pointer", transition: "background 0.15s", flexShrink: 0, padding: 0 });
const submitBtnStyle: React.CSSProperties = { flex: 1, background: "linear-gradient(135deg, var(--gold), #a88540)", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" };
const cancelBtnStyle: React.CSSProperties = { background: "#f5f0e8", color: "var(--charcoal)", border: "none", borderRadius: "10px", padding: "12px 20px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" };
const roFieldStyle: React.CSSProperties = { ...inputStyle, background: "#f0ece4", color: "#888", cursor: "not-allowed" };
const truncateCellStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

/* ─── Props ───────────────────────────────── */
interface Props {
  search:              string;
  filters:             FilterState;
  onSelectContractor?: (id: number) => void;
  onSearchAndNavigate?: (term: string) => void;
  currentUser?:        { role: string } | null;
}

/* ─── Main Component ───────────────────────────── */
export default function DatabasePage({ search, filters, onSelectContractor, onSearchAndNavigate, currentUser }: Props) {
  const isAdminUser = currentUser?.role === "admin";
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1" || (currentUser?.role === "admin"));
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
  const [showCloudSync, setShowCloudSync] = useState(false);

  const [editError, setEditError]     = useState<string | null>(null);
  const [addError, setAddError]       = useState<string | null>(null);
  const [cloneError, setCloneError]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminUser) {
      setAuthenticated(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }
  }, [isAdminUser]);

  useEffect(() => {
    if (!isAdminUser && sessionStorage.getItem(SESSION_KEY) !== "1" && authenticated) {
      setAuthenticated(false);
    }
  }, [authenticated, isAdminUser]);

  /* ── Idle auto-lock (5 min inactivity) ── */
  const IDLE_MS       = 5 * 60 * 1000; // 5 minutes
  const idleTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerAutoLock() {
    if (isAdminUser) return;
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

  const { data: contractors = [], isLoading, isError, refetch } = useContractorsContext();
  const [isSaving, setIsSaving] = useState(false);

  /* Filter + sort by contractor name then ID */
  const filtered = contractors
    .filter((c: Contractor) => {
      /* ── Main search bar: partial/contains matching across all text fields ── */
      const matchesSearch = !search || (
        containsMatch(c.contractNo,                search) ||
        containsMatch(c.contractYear       ?? "",  search) ||
        containsMatch(c.contractor,                search) ||
        containsMatch(c.project,                   search) ||
        containsMatch(c.portfolio,                 search) ||
        containsMatch(c.technicalScope,            search) ||
        containsMatch(c.workType,                  search) ||
        containsMatch(c.mainActivity       ?? "",  search) ||
        containsMatch(c.businessProgram    ?? "",  search) ||
        containsMatch(c.workFamily         ?? "",  search) ||
        containsMatch(c.itemScope          ?? "",  search) ||
        containsMatch(c.techSpecs          ?? "",  search) ||
        containsMatch(c.measurements       ?? "",  search) ||
        containsMatch(c.itemCode           ?? "",  search) ||
        containsMatch(c.workCategory       ?? "",  search) ||
        containsMatch(c.unit               ?? "",  search) ||
        containsMatch(c.phone,                     search) ||
        containsMatch(c.email,                     search)
      );

      /* ── Dropdown filters: STRICT Exact Match (normalized equality) ──
         A record is shown only if its field value matches the selected
         filter value exactly (after diacritic / alef normalization).   */
      const matchesFilters =
        strictMatch(c.contractor,                       filters.contractor)      &&
        strictMatch(c.portfolio,                        filters.portfolio)       &&
        strictMatch(c.project,                          filters.project)         &&
        strictMatch((c as any).businessProgram ?? "",   filters.businessProgram) &&
        strictMatch(c.workType,                         filters.workType)        &&
        strictMatch((c as any).workCategory    ?? "",   filters.workCategory);

      /* ── itemPrice filter: exact price match when a value is entered ── */
      const priceFilter = filters.itemPrice.trim();
      const matchesPrice = !priceFilter || c.price === parseInt(priceFilter, 10);

      return matchesSearch && matchesFilters && matchesPrice;
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
    setIsSaving(true);
    setEditError(null);
    try {
      await updateContractor(editRow.id, buildPutData(editForm, editRating));
      refetch();
      setEditRow(null);
    } catch {
      setEditError("تعذّر حفظ التعديلات. تحقق من اتصال الشبكة وأعد المحاولة.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setAddError(null);
    try {
      await createContractor(buildPutData(addForm, addRating));
      refetch();
      setAddForm(EMPTY_FORM);
      setAddRating(0);
      setShowAddForm(false);
    } catch {
      setAddError("تعذّر إضافة السجل. تحقق من اتصال الشبكة وأعد المحاولة.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCloneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cloneSource) return;
    setIsSaving(true);
    setCloneError(null);
    try {
      const baseForm = contractorToForm(cloneSource);
      await createContractor(
        buildPutData(
          { ...baseForm, technicalScope: cloneTechScope, price: clonePrice, unit: cloneUnit, localContent: cloneLocalContent },
          (cloneSource as any).rating ?? null,
        ),
      );
      refetch();
      setCloneSource(null);
    } catch {
      setCloneError("تعذّر حفظ السجل الجديد. تحقق من اتصال الشبكة وأعد المحاولة.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setIsSaving(true);
    setDeleteError(null);
    try {
      await deleteContractor(id);
      refetch();
      setDeleteConfirm(null);
    } catch {
      setDeleteError("تعذّر حذف السجل. تحقق من اتصال الشبكة وأعد المحاولة.");
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Password gate ── */
  if (!authenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh", padding: "20px" }}>
        <div className="card animate-fade-up" style={{ maxWidth: "400px", width: "100%", padding: "40px 32px", textAlign: "center" }}>
          {/* Company logo */}
          <div style={{ margin: "0 auto 6px", width: "96px", height: "96px", borderRadius: "20px", background: "#fff", boxShadow: "0 8px 28px rgba(0,0,0,0.12), 0 0 0 1px rgba(197,160,89,0.25)", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px", overflow: "hidden" }}>
            <img src={logoImg} alt="Alrawaf" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          {/* English brand name */}
          <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", fontFamily: "'Inter', sans-serif", margin: "14px 0 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <Lock size={11} />
            Database · Alrawaf Contracting Company
          </p>
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
    <div style={{ padding: "20px 24px", width: "100%" }}>

      {/* Actions row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "2px" }}>سجل البيانات الشامل</h2>
          <span style={{ fontSize: "0.72rem", color: "#aaa" }}>
            {filtered.length} سجل {search ? `(من ${contractors.length} — مفلتر بالبحث العلوي)` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => setShowCloudSync(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #1e6fa8, #3b8fcc)", color: "#fff", border: "none", borderRadius: "10px", padding: "9px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", boxShadow: "0 3px 12px rgba(59,143,204,0.35)" }}
            title="إدخال بيانات ضخمة مباشرةً إلى قاعدة البيانات السحابية"
          >
            <Cloud size={14} />
            إدخال بيانات سحابي (Excel Online Sync)
          </button>
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
      <div className="card" style={{ padding: 0, overflow: "hidden", width: "100%", maxWidth: "100%" }}>
        <div style={{ width: "100%", overflowX: "clip" }}>
          <table style={{ tableLayout: "fixed", borderCollapse: "collapse", direction: "rtl", width: "100%" }}>
            <colgroup>
              <col style={{ width: "3.5%" }} />{/* رقم العقد */}
              <col style={{ width: "2.8%" }} />{/* سنة العقد — أرقام */}
              <col style={{ width: "10%" }}  />{/* المقاول — نصوص طويلة */}
              <col style={{ width: "6.5%" }} />{/* المشروع — نصوص طويلة */}
              <col style={{ width: "3.2%" }} />{/* المحفظة — قصيرة */}
              <col style={{ width: "5.5%" }} />{/* النشاط */}
              <col style={{ width: "5%" }}   />{/* برنامج */}
              <col style={{ width: "5%" }}   />{/* عائلة */}
              <col style={{ width: "4.5%" }} />{/* نوع الأعمال */}
              <col style={{ width: "4.5%" }} />{/* شمولية */}
              <col style={{ width: "4.5%" }} />{/* مواصفات */}
              <col style={{ width: "2.8%" }} />{/* قياسات — أرقام */}
              <col style={{ width: "4.5%" }} />{/* كود */}
              <col style={{ width: "9%" }}   />{/* الوصف الفني — نصوص طويلة */}
              <col style={{ width: "3.2%" }} />{/* نوع التعاقد — قصير */}
              <col style={{ width: "2.5%" }} />{/* الوحدة — قصير */}
              <col style={{ width: "3%" }}   />{/* السعر — أرقام */}
              <col style={{ width: "4.5%" }} />{/* المحتوى المحلي */}
              <col style={{ width: "3.5%" }} />{/* التواصل */}
              <col style={{ width: "4.5%" }} />{/* التقييم */}
              <col style={{ width: "3.8%" }} />{/* إجراءات */}
            </colgroup>
            <thead>
              <tr style={{ background: "var(--charcoal)" }}>
                {[
                  "رقم العقد", "سنة العقد", "المقاول / المورد", "المشروع", "المحفظة",
                  "النشاط الرئيسي", "برنامج الأعمال", "عائلة الأعمال", "نوع الأعمال",
                  "شمولية البند", "مواصفات فنية", "قياسات", "كود الفريد للبند",
                  "الوصف الفني للبند", "نوع التعاقد", "الوحدة", "السعر",
                  "المحتوى المحلي", "التواصل", "التقييم", "إجراءات"
                ].map((h, i) => (
                  <th key={i} style={{ padding: "8px 4px", textAlign: i >= 19 ? "center" : "right", fontSize: "0.58rem", fontWeight: 700, color: "rgba(197,160,89,0.9)", letterSpacing: "0.03em", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.3, borderBottom: "2px solid rgba(197,160,89,0.2)", verticalAlign: "bottom" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={21} style={{ textAlign: "center", padding: "50px", color: "#aaa", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: 32, height: 32, border: "3px solid rgba(197,160,89,0.2)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin-loader 0.9s linear infinite" }} />
                    جاري تحميل البيانات...
                  </div>
                </td></tr>
              ) : isError ? (
                <tr><td colSpan={21} style={{ textAlign: "center", padding: "50px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                    <div style={{ fontSize: "2rem" }}>⚠️</div>
                    <div style={{ fontSize: "0.85rem", color: "#e74c3c", fontWeight: 700 }}>تعذّر تحميل البيانات</div>
                    <div style={{ fontSize: "0.75rem", color: "#aaa" }}>تحقق من اتصال الشبكة أو أعد تحميل الصفحة</div>
                    <button onClick={() => refetch()}
                      style={{ marginTop: "6px", background: "linear-gradient(135deg, var(--gold), #a88540)", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 20px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                      إعادة المحاولة
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={21} style={{ textAlign: "center", padding: "50px", color: "#aaa", fontSize: "0.85rem" }}>لا توجد سجلات مطابقة للبحث</td></tr>
              ) : filtered.map((c: Contractor, idx: number) => (
                <tr key={c.id} style={{ background: idx % 2 === 0 ? "#fff" : "#faf8f4", borderBottom: "1px solid #f0ebe0" }}>
                  <td style={tdStyle} title={c.contractNo}>{c.contractNo}</td>
                  <td style={{ ...tdStyle, fontSize: "0.7rem", color: "#888" }} title={c.contractYear || "—"}>{c.contractYear || "—"}</td>
                  {/* Contractor name — clickable → navigate to main tab */}
                  <td
                    style={{ ...tdStyle, fontWeight: 700, cursor: "pointer", color: "var(--charcoal)" }}
                    onClick={() => onSelectContractor && onSelectContractor(c.id)}
                    title={c.contractor}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gold)"; (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--charcoal)"; (e.currentTarget as HTMLElement).style.textDecoration = ""; }}
                  >{c.contractor}</td>
                  <td style={tdStyle} title={c.project}>{c.project}</td>
                  <td style={tdStyle} title={c.portfolio}>{c.portfolio}</td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#3b8fcc" }} title={c.mainActivity || "—"}>{c.mainActivity || "—"}</td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#888" }} title={c.businessProgram || "—"}>{c.businessProgram || "—"}</td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#888" }} title={c.workFamily || "—"}>{c.workFamily || "—"}</td>
                  <td style={{ ...tdStyle, minWidth: 0, overflow: "hidden" }} title={c.workType || "—"}>
                    <span style={{ display: "inline-block", maxWidth: "100%", background: "rgba(197,160,89,0.1)", color: "var(--gold)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" }}>
                      {c.workType}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: "0.7rem", color: "#555" }} title={c.itemScope || "—"}>{c.itemScope || "—"}</td>
                  <td style={{ ...tdStyle, fontSize: "0.7rem", color: "#555" }} title={c.techSpecs || "—"}>{c.techSpecs || "—"}</td>
                  <td style={{ ...tdStyle, fontSize: "0.7rem", color: "#555" }} title={c.measurements || "—"}>{c.measurements || "—"}</td>
                  <td style={{ ...tdStyle, fontSize: "0.7rem", color: "#555", fontFamily: "monospace" }} title={c.itemCode || "—"}>{c.itemCode || "—"}</td>
                  {/* Technical scope — clickable → search in main tab */}
                  <td
                    style={{ ...tdStyle, cursor: "pointer", color: "var(--charcoal)" }}
                    title={c.technicalScope}
                    onClick={() => onSearchAndNavigate && onSearchAndNavigate(c.technicalScope)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#3b8fcc"; (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--charcoal)"; (e.currentTarget as HTMLElement).style.textDecoration = ""; }}
                  >{c.technicalScope}</td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#888" }} title={c.workCategory || "—"}>{c.workCategory || "—"}</td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#888" }} title={c.unit || "—"}>{c.unit || "—"}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "var(--gold)", fontSize: "0.75rem", direction: "ltr", textAlign: "right" }} title={c.price.toLocaleString("en")}>
                    {c.price.toLocaleString("en")}
                  </td>
                  <td style={tdStyle} title={c.localContent || "—"}>
                    {c.localContent ? (
                      <span style={{ background: c.localContent === "مسجل" ? "rgba(43,170,116,0.12)" : "rgba(200,200,200,0.18)", color: c.localContent === "مسجل" ? "#1d8a5a" : "#888", border: `1px solid ${c.localContent === "مسجل" ? "rgba(43,170,116,0.3)" : "rgba(180,180,180,0.3)"}`, borderRadius: "6px", padding: "2px 9px", fontSize: "0.7rem", fontWeight: 700 }}>{c.localContent}</span>
                    ) : <span style={{ color: "#ccc", fontSize: "0.7rem" }}>—</span>}
                  </td>
                  <td style={tdStyle} title={`${c.phone} | ${c.email}`}>
                    <div style={{ fontSize: "0.7rem", color: "#888", minWidth: 0 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.phone}</div>
                      <div style={{ direction: "ltr", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#bbb", fontSize: "0.65rem" }}>{c.email}</div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle" }}>
                    <StarDisplay rating={c.rating} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: "1px", flexWrap: "nowrap", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} style={iconBtnStyle("#c5a059")} title="تعديل البيانات"><Pencil size={10} /></button>
                      <button onClick={(e) => { e.stopPropagation(); openClone(c); }} style={iconBtnStyle("#2baa74")} title="إضافة بند جديد لنفس الشركة (تكرار)"><Copy size={10} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }} style={iconBtnStyle("#e74c3c")} title="حذف السجل"><Trash2 size={10} /></button>
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
        <div style={overlayStyle} onClick={() => { setDeleteConfirm(null); setDeleteError(null); }}>
          <div className="card animate-fade-up" style={{ maxWidth: "360px", width: "100%", padding: "28px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <Trash2 size={32} style={{ color: "#e74c3c", margin: "0 auto 12px" }} />
            <h3 style={{ ...modalTitleStyle, marginBottom: "8px" }}>تأكيد الحذف</h3>
            <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "20px" }}>هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟</p>
            {deleteError && (
              <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "0.78rem", color: "#c0392b", textAlign: "right" }}>
                ⚠️ {deleteError}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { setDeleteConfirm(null); setDeleteError(null); }} style={cancelBtnStyle}>إلغاء</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={isSaving}
                style={{ flex: 1, background: "linear-gradient(135deg, #e74c3c, #c0392b)", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                {isSaving ? "جاري الحذف..." : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editRow && (
        <div style={overlayStyle} onClick={() => { setEditRow(null); setEditError(null); }}>
          <div className="card animate-fade-up" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setEditRow(null); setEditError(null); }} style={closeBtnStyle}><X size={16} /></button>
            <h3 style={modalTitleStyle}>تعديل بيانات: {editRow.contractor}</h3>
            <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "20px" }}>جميع الحقول اختيارية — عدّل ما تحتاجه ثم احفظ</p>
            {editError && (
              <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "0.78rem", color: "#c0392b" }}>
                ⚠️ {editError}
              </div>
            )}
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
                  <label style={{ ...labelStyle, color: "#c5a059" }}>١٥. التقييم</label>
                  <div style={{ marginTop: "6px" }}><StarPicker value={editRating} onChange={setEditRating} /></div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => { setEditRow(null); setEditError(null); }} style={cancelBtnStyle}>إلغاء</button>
                <button type="submit" disabled={isSaving} style={submitBtnStyle}>
                  {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAddForm && (
        <div style={overlayStyle} onClick={() => { setShowAddForm(false); setAddError(null); }}>
          <div className="card animate-fade-up" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowAddForm(false); setAddError(null); }} style={closeBtnStyle}><X size={16} /></button>
            <h3 style={modalTitleStyle}>إضافة سجل جديد</h3>
            <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "20px" }}>جميع الحقول اختيارية — أدخل المعلومات المتوفرة</p>
            {addError && (
              <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "0.78rem", color: "#c0392b" }}>
                ⚠️ {addError}
              </div>
            )}
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
                  <label style={{ ...labelStyle, color: "#c5a059" }}>١٥. التقييم</label>
                  <div style={{ marginTop: "6px" }}><StarPicker value={addRating} onChange={setAddRating} /></div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => { setShowAddForm(false); setAddError(null); }} style={cancelBtnStyle}>إلغاء</button>
                <button type="submit" disabled={isSaving} style={submitBtnStyle}>
                  {isSaving ? "جاري الحفظ..." : "إضافة السجل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Cloud Sync Modal ── */}
      {showCloudSync && (
        <CloudSyncModal
          existingContractors={contractors}
          onClose={() => setShowCloudSync(false)}
          onSaved={() => { refetch(); }}
        />
      )}

      {/* ── Clone Modal ("+") ── */}
      {cloneSource && (
        <div style={overlayStyle} onClick={() => { setCloneSource(null); setCloneError(null); }}>
          <div className="card animate-fade-up" style={{ ...modalStyle, maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setCloneSource(null); setCloneError(null); }} style={closeBtnStyle}><X size={16} /></button>
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
                  { label: "نوع التعاقد", value: cloneSource.workType },
                  { label: "نوع التعاقد", value: (cloneSource as any).workCategory || "—" },
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
            {cloneError && (
              <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "0.78rem", color: "#c0392b" }}>
                ⚠️ {cloneError}
              </div>
            )}
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
                <button type="button" onClick={() => { setCloneSource(null); setCloneError(null); }} style={cancelBtnStyle}>إلغاء</button>
                <button type="submit" disabled={isSaving} style={{ ...submitBtnStyle, background: "linear-gradient(135deg, #2baa74, #1d8a5a)" }}>
                  {isSaving ? "جاري الحفظ..." : "حفظ كسجل جديد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
