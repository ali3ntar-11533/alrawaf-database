import { useState } from "react";
import { X, Plus, Trash2, Pencil, Lock, Download } from "lucide-react";
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

interface FormData {
  contractNo:     string;
  contractor:     string;
  project:        string;
  portfolio:      string;
  technicalScope: string;
  mainActivity:   string;
  workType:       string;
  workCategory:   string;
  unit:           string;
  price:          string;
  phone:          string;
  email:          string;
  localContent:   string;
  workDescription:string;
  workScopeText:  string;
}

const EMPTY_FORM: FormData = {
  contractNo: "", contractor: "", project: "", portfolio: "",
  technicalScope: "", mainActivity: "", workType: "", workCategory: "",
  unit: "", price: "", phone: "", email: "",
  localContent: "", workDescription: "", workScopeText: "",
};

const FORM_FIELDS: { key: keyof FormData; label: string; type?: string; wide?: boolean; required?: boolean }[] = [
  { key: "contractNo",      label: "١. رقم العقد",                 required: true },
  { key: "contractor",      label: "٢. اسم المقاول / المورد",      required: true },
  { key: "project",         label: "٣. المشروع",                   required: true },
  { key: "portfolio",       label: "٤. المحفظة",                   required: true },
  { key: "technicalScope",  label: "٥. نطاق التوصيف الفني للبند",  required: true },
  { key: "mainActivity",    label: "٦. النشاط الرئيسي" },
  { key: "workType",        label: "٧. نوع الأعمال",               required: true },
  { key: "workCategory",    label: "٨. نوع العمل (تصنيف)" },
  { key: "unit",            label: "٩. الوحدة" },
  { key: "price",           label: "١٠. السعر (ريال)",             type: "number", required: true },
  { key: "phone",           label: "١١. رقم التواصل",              required: true },
  { key: "email",           label: "١٢. البريد الإلكتروني",        required: true },
  { key: "localContent",    label: "المحتوى المحلي (اختياري)" },
  { key: "workDescription", label: "الوصف الفني للبند (اختياري)",  wide: true },
  { key: "workScopeText",   label: "نطاق الأعمال التفصيلي (اختياري)", wide: true },
];

function contractorToForm(c: Contractor): FormData {
  return {
    contractNo:      c.contractNo,
    contractor:      c.contractor,
    project:         c.project,
    portfolio:       c.portfolio,
    technicalScope:  c.technicalScope,
    mainActivity:    (c as any).mainActivity ?? "",
    workType:        c.workType,
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
    technicalScope:  f.technicalScope,
    mainActivity:    f.mainActivity.trim() || null,
    workType:        f.workType,
    workCategory:    f.workCategory.trim() || null,
    unit:            f.unit.trim() || null,
    price:           parseInt(f.price, 10),
    phone:           f.phone,
    email:           f.email,
    localContent:    f.localContent.trim() || null,
    workDescription: f.workDescription.trim() || null,
    workScopeText:   f.workScopeText.trim() || null,
    rating:          rating ?? null,
  };
}

function contractorToPutData(c: Contractor, overrides?: Partial<{ rating: number }>) {
  return {
    contractNo:      c.contractNo,
    contractor:      c.contractor,
    project:         c.project,
    portfolio:       c.portfolio,
    technicalScope:  c.technicalScope,
    mainActivity:    (c as any).mainActivity ?? null,
    workType:        c.workType,
    workCategory:    (c as any).workCategory ?? null,
    unit:            (c as any).unit ?? null,
    price:           c.price,
    phone:           c.phone,
    email:           c.email,
    localContent:    (c as any).localContent ?? null,
    workDescription: (c as any).workDescription ?? null,
    workScopeText:   (c as any).workScopeText ?? null,
    rating:          overrides?.rating ?? (c as any).rating ?? null,
  };
}

function normalize(s: string) {
  return s.replace(/[\u064B-\u065F]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase().trim();
}
function fuzzyMatch(haystack: string, needle: string): boolean {
  if (!needle) return true;
  const h = normalize(haystack);
  const n = normalize(needle);
  if (h.includes(n)) return true;
  if (n.length >= 3) {
    for (let i = 0; i <= n.length - 3; i++) {
      if (h.includes(n.slice(i, i + 3))) return true;
    }
  }
  return false;
}

/** Read-only stars for the table */
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

/** Interactive star picker for modals */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          onClick={() => onChange(i === value ? 0 : i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          style={{
            fontSize: "1.6rem", cursor: "pointer",
            color: i <= (hover || value) ? "#f5c518" : "#ddd",
            transition: "color 0.12s, transform 0.12s", display: "inline-block",
            transform: hover === i ? "scale(1.25)" : i <= value ? "scale(1.08)" : "scale(1)",
          }}
        >★</span>
      ))}
      <span style={{ fontSize: "0.75rem", color: "#aaa", marginRight: "6px" }}>
        {value > 0 ? `${value}/5` : "بدون تقييم"}
      </span>
    </div>
  );
}

function exportToExcel(data: Contractor[]) {
  const rows = data.map((c) => ({
    "رقم العقد":              c.contractNo,
    "المقاول / المورد":       c.contractor,
    "المشروع":                c.project,
    "المحفظة":                c.portfolio,
    "نطاق التوصيف الفني":     c.technicalScope,
    "النشاط الرئيسي":         (c as any).mainActivity ?? "",
    "نوع الأعمال":            c.workType,
    "نوع العمل":              (c as any).workCategory ?? "",
    "الوحدة":                 (c as any).unit ?? "",
    "السعر (ريال)":           c.price,
    "رقم التواصل":            c.phone,
    "البريد الإلكتروني":      c.email,
    "المحتوى المحلي":         (c as any).localContent ?? "",
    "التقييم":                (c as any).rating ?? 0,
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });

  // RTL sheet view
  if (!ws["!views"]) ws["!views"] = [];
  (ws["!views"] as any[])[0] = { rightToLeft: true };

  // Column widths
  ws["!cols"] = [
    { wch: 14 }, { wch: 28 }, { wch: 24 }, { wch: 12 },
    { wch: 36 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 28 },
    { wch: 16 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المقاولون");
  XLSX.writeFile(wb, `rawaf_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

interface Props {
  search: string;
  onSelectContractor?: (id: number) => void;
}

export default function DatabasePage({ search, onSelectContractor }: Props) {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [editRow, setEditRow]       = useState<Contractor | null>(null);
  const [editForm, setEditForm]     = useState<FormData>(EMPTY_FORM);
  const [editRating, setEditRating] = useState<number>(0);
  const [editError, setEditError]   = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm]         = useState<FormData>(EMPTY_FORM);
  const [addRating, setAddRating]     = useState<number>(0);
  const [addError, setAddError]       = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const queryClient    = useQueryClient();
  const { data: contractors = [], isLoading } = useListContractors();
  const createMutation = useCreateContractor();
  const updateMutation = useUpdateContractor();
  const deleteMutation = useDeleteContractor();

  const filtered = contractors.filter((c: Contractor) => {
    if (!search) return true;
    return (
      fuzzyMatch(c.contractNo, search)       || fuzzyMatch(c.contractor, search) ||
      fuzzyMatch(c.project, search)          || fuzzyMatch(c.portfolio, search) ||
      fuzzyMatch(c.technicalScope, search)   || fuzzyMatch(c.workType, search) ||
      fuzzyMatch((c as any).mainActivity ?? "", search) ||
      fuzzyMatch((c as any).workCategory ?? "", search) ||
      fuzzyMatch((c as any).unit ?? "", search) ||
      fuzzyMatch(c.phone, search)            || fuzzyMatch(c.email, search) ||
      fuzzyMatch((c as any).localContent ?? "", search)
    );
  });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === DB_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthenticated(true);
    } else {
      setPasswordError("كلمة المرور غير صحيحة، يرجى المحاولة مجدداً");
    }
  }

  function openEdit(c: Contractor) {
    setEditRow(c);
    setEditForm(contractorToForm(c));
    setEditRating((c as any).rating ?? 0);
    setEditError("");
  }

  function openClone(c: Contractor) {
    setShowAddForm(true);
    setAddForm({ ...EMPTY_FORM, contractor: c.contractor, portfolio: c.portfolio, phone: c.phone, email: c.email });
    setAddRating(0);
    setAddError("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    const f = editForm;
    if (!f.contractor || !f.contractNo || !f.project || !f.portfolio || !f.technicalScope || !f.workType || !f.price || !f.phone || !f.email) {
      setEditError("يرجى ملء الحقول المطلوبة (١، ٢، ٣، ٤، ٥، ٧، ١٠، ١١، ١٢)"); return;
    }
    setEditError("");
    await updateMutation.mutateAsync({ id: editRow.id, data: buildPutData(f, editRating) });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setEditRow(null);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const f = addForm;
    if (!f.contractor || !f.contractNo || !f.project || !f.portfolio || !f.technicalScope || !f.workType || !f.price || !f.phone || !f.email) {
      setAddError("يرجى ملء الحقول المطلوبة (١، ٢، ٣، ٤، ٥، ٧، ١٠، ١١، ١٢)"); return;
    }
    setAddError("");
    await createMutation.mutateAsync({ data: buildPutData(f, addRating) });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setAddForm(EMPTY_FORM);
    setAddRating(0);
    setShowAddForm(false);
  }

  async function handleDelete(id: number) {
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setDeleteConfirm(null);
  }

  if (!authenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh", padding: "20px" }}>
        <div className="card animate-fade-up" style={{ maxWidth: "400px", width: "100%", padding: "40px 32px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, var(--gold), #a88540)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Lock size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "8px" }}>قاعدة البيانات محمية</h2>
          <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "24px" }}>أدخل كلمة المرور للوصول إلى السجل الشامل</p>
          <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="password" placeholder="كلمة المرور" value={passwordInput}
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

  return (
    <div style={{ padding: "24px 20px", maxWidth: "1600px", margin: "0 auto" }}>

      {/* ── Actions Row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "2px" }}>سجل البيانات الشامل</h2>
          <span style={{ fontSize: "0.72rem", color: "#aaa" }}>
            {filtered.length} سجل {search ? `(من ${contractors.length} — مفلتر بالبحث العلوي)` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => exportToExcel(filtered)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #1d7a45, #27ae60)", color: "#fff", border: "none", borderRadius: "10px", padding: "9px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", boxShadow: "0 3px 12px rgba(39,174,96,0.3)", transition: "transform 0.15s, box-shadow 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(39,174,96,0.4)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 3px 12px rgba(39,174,96,0.3)"; }}
            title="تصدير البيانات الحالية إلى ملف Excel"
          >
            <Download size={14} />
            تصدير Excel
          </button>
          <button
            onClick={() => { setShowAddForm(true); setAddForm(EMPTY_FORM); setAddRating(0); setAddError(""); }}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, var(--gold), #a88540)", color: "#fff", border: "none", borderRadius: "10px", padding: "9px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", transition: "transform 0.15s, box-shadow 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(197,160,89,0.4)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = ""; }}
          >
            <Plus size={14} />
            إضافة سجل
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
            <thead>
              <tr style={{ background: "var(--charcoal)" }}>
                {[
                  "رقم العقد", "المقاول / المورد", "المشروع", "المحفظة",
                  "نطاق التوصيف الفني", "النشاط الرئيسي", "نوع الأعمال",
                  "نوع العمل", "الوحدة", "السعر", "التواصل", "التقييم", "إجراءات"
                ].map((h, i) => (
                  <th key={i} style={{ padding: "12px 12px", textAlign: "right", fontSize: "0.63rem", fontWeight: 700, color: "rgba(197,160,89,0.9)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: "2px solid rgba(197,160,89,0.2)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={13} style={{ textAlign: "center", padding: "50px", color: "#aaa", fontSize: "0.85rem" }}>جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={13} style={{ textAlign: "center", padding: "50px", color: "#aaa", fontSize: "0.85rem" }}>لا توجد سجلات مطابقة</td></tr>
              ) : filtered.map((c: Contractor, idx: number) => (
                <tr
                  key={c.id}
                  style={{ background: idx % 2 === 0 ? "#fff" : "#faf8f4", borderBottom: "1px solid #f0ebe0", transition: "background 0.13s ease" }}
                >
                  <td style={tdStyle}>{c.contractNo}</td>
                  <td
                    style={{ ...tdStyle, fontWeight: 700, cursor: "pointer", color: "var(--charcoal)" }}
                    onClick={() => onSelectContractor && onSelectContractor(c.id)}
                    title="اضغط لفتح البيانات في لوحة التنسيق الفني"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableCellElement).style.color = "var(--gold)"; (e.currentTarget as HTMLTableCellElement).style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableCellElement).style.color = "var(--charcoal)"; (e.currentTarget as HTMLTableCellElement).style.textDecoration = ""; }}
                  >
                    {c.contractor}
                  </td>
                  <td style={tdStyle}>{c.project}</td>
                  <td style={tdStyle}>{c.portfolio}</td>
                  <td style={{ ...tdStyle, maxWidth: "180px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={c.technicalScope}>{c.technicalScope}</td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#3b8fcc" }}>{(c as any).mainActivity ?? "—"}</td>
                  <td style={tdStyle}>
                    <span style={{ background: "rgba(197,160,89,0.1)", color: "var(--gold)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>{c.workType}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#888" }}>{(c as any).workCategory ?? "—"}</td>
                  <td style={{ ...tdStyle, fontSize: "0.72rem", color: "#888" }}>{(c as any).unit ?? "—"}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "var(--gold)", whiteSpace: "nowrap", fontSize: "0.75rem", direction: "ltr", textAlign: "right" }}>
                    {c.price.toLocaleString("en")}
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
                  <td style={{ ...tdStyle, width: "70px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                        style={iconBtnStyle("#c5a059")} title="تعديل البيانات"
                      ><Pencil size={12} /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openClone(c); }}
                        style={iconBtnStyle("#2baa74")} title="إضافة بند جديد لنفس الشركة"
                      ><Plus size={12} /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }}
                        style={iconBtnStyle("#e74c3c")} title="حذف السجل"
                      ><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editRow && (
        <div style={overlayStyle} onClick={() => setEditRow(null)}>
          <div className="card animate-fade-up" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditRow(null)} style={closeBtnStyle}><X size={16} /></button>
            <h3 style={modalTitleStyle}>تعديل بيانات: {editRow.contractor}</h3>
            <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "20px" }}>
              الحقول ١–٥، ٧، ١٠–١٢ إلزامية • الباقي اختياري
            </p>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {FORM_FIELDS.map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: f.wide ? "1 / -1" : undefined }}>
                    <label style={{ ...labelStyle, color: f.required ? "#c5a059" : "#aaa" }}>{f.label}{f.required ? " *" : ""}</label>
                    {f.wide ? (
                      <textarea rows={2} value={editForm[f.key]} onChange={(e) => setEditForm((p) => ({ ...p, [f.key]: e.target.value }))} style={textareaStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    ) : (
                      <input type={f.type ?? "text"} value={editForm[f.key]} onChange={(e) => setEditForm((p) => ({ ...p, [f.key]: e.target.value }))} style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    )}
                  </div>
                ))}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ ...labelStyle, color: "#c5a059" }}>التقييم</label>
                  <div style={{ marginTop: "6px" }}>
                    <StarPicker value={editRating} onChange={setEditRating} />
                  </div>
                </div>
              </div>
              {editError && <div style={errorStyle}>{editError}</div>}
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
            <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "20px" }}>
              الحقول ١–٥، ٧، ١٠–١٢ إلزامية • الباقي اختياري
            </p>
            <form onSubmit={handleAddSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {FORM_FIELDS.map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: f.wide ? "1 / -1" : undefined }}>
                    <label style={{ ...labelStyle, color: f.required ? "#c5a059" : "#aaa" }}>{f.label}{f.required ? " *" : ""}</label>
                    {f.wide ? (
                      <textarea rows={2} value={addForm[f.key]} onChange={(e) => setAddForm((p) => ({ ...p, [f.key]: e.target.value }))} style={textareaStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    ) : (
                      <input type={f.type ?? "text"} value={addForm[f.key]} onChange={(e) => setAddForm((p) => ({ ...p, [f.key]: e.target.value }))} style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    )}
                  </div>
                ))}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ ...labelStyle, color: "#c5a059" }}>التقييم</label>
                  <div style={{ marginTop: "6px" }}>
                    <StarPicker value={addRating} onChange={setAddRating} />
                  </div>
                </div>
              </div>
              {addError && <div style={errorStyle}>{addError}</div>}
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setShowAddForm(false)} style={cancelBtnStyle}>إلغاء</button>
                <button type="submit" disabled={createMutation.isPending} style={submitBtnStyle}>
                  {createMutation.isPending ? "جاري الحفظ..." : "حفظ السجل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm !== null && (
        <div style={overlayStyle} onClick={() => setDeleteConfirm(null)}>
          <div className="card animate-fade-up" style={{ maxWidth: "380px", width: "90%", padding: "28px", textAlign: "center", margin: "20px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(231,76,60,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 size={24} color="#e74c3c" />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "8px" }}>تأكيد الحذف</h3>
            <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "20px" }}>هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)} style={cancelBtnStyle}>إلغاء</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleteMutation.isPending} style={{ ...submitBtnStyle, background: "#e74c3c" }}>
                {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "10px 12px", fontSize: "0.76rem", color: "var(--charcoal)", verticalAlign: "middle",
};
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(30,25,20,0.6)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, backdropFilter: "blur(4px)",
};
const modalStyle: React.CSSProperties = {
  maxWidth: "720px", width: "92%", padding: "28px", position: "relative",
  margin: "20px", maxHeight: "90vh", overflowY: "auto",
};
const modalTitleStyle: React.CSSProperties = {
  fontSize: "1rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "4px",
};
const closeBtnStyle: React.CSSProperties = {
  position: "absolute", top: "16px", left: "16px",
  background: "#f5f0e8", border: "none", borderRadius: "50%",
  width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", color: "#666",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.65rem", color: "#aaa", letterSpacing: "0.02em",
};
const inputStyle: React.CSSProperties = {
  padding: "9px 12px", border: "1.5px solid #e8e0d0", borderRadius: "8px",
  fontSize: "0.82rem", fontFamily: "Tajawal, sans-serif", direction: "rtl",
  outline: "none", background: "#faf8f4", boxSizing: "border-box", width: "100%",
  transition: "border-color 0.18s",
};
const textareaStyle: React.CSSProperties = {
  padding: "9px 12px", border: "1.5px solid #e8e0d0", borderRadius: "8px",
  fontSize: "0.82rem", fontFamily: "Tajawal, sans-serif", direction: "rtl",
  outline: "none", background: "#faf8f4", boxSizing: "border-box", width: "100%",
  resize: "vertical", lineHeight: 1.6,
};
const cancelBtnStyle: React.CSSProperties = {
  flex: 1, padding: "11px", border: "1.5px solid #e8e0d0", borderRadius: "10px",
  background: "#fff", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.85rem",
};
const submitBtnStyle: React.CSSProperties = {
  flex: 2, padding: "11px", background: "linear-gradient(135deg, var(--gold), #a88540)",
  color: "#fff", border: "none", borderRadius: "10px",
  cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.85rem",
};
const errorStyle: React.CSSProperties = {
  fontSize: "0.75rem", color: "#e74c3c", marginBottom: "12px",
  background: "rgba(231,76,60,0.07)", borderRadius: "6px", padding: "8px 12px",
};
function iconBtnStyle(color: string): React.CSSProperties {
  return {
    background: `${color}15`, border: "none", borderRadius: "6px",
    width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color, transition: "background 0.15s",
  };
}
