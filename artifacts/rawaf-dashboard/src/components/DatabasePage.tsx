import { useState } from "react";
import { X, Plus, Trash2, Pencil, Lock } from "lucide-react";
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
  contractNo: string;
  contractor: string;
  project: string;
  portfolio: string;
  technicalScope: string;
  workType: string;
  workCategory: string;
  unit: string;
  price: string;
  phone: string;
  email: string;
  workDescription: string;
  workScopeText: string;
}

const EMPTY_FORM: FormData = {
  contractNo: "", contractor: "", project: "", portfolio: "",
  technicalScope: "", workType: "", workCategory: "", unit: "",
  price: "", phone: "", email: "",
  workDescription: "", workScopeText: "",
};

const FORM_FIELDS: { key: keyof FormData; label: string; type?: string; wide?: boolean }[] = [
  { key: "contractNo",      label: "رقم العقد" },
  { key: "contractor",      label: "اسم المقاول / المورد" },
  { key: "project",         label: "المشروع" },
  { key: "portfolio",       label: "المحفظة" },
  { key: "technicalScope",  label: "نطاق التوصيف الفني للبند" },
  { key: "workType",        label: "نوع الأعمال" },
  { key: "workCategory",    label: "تصنيف العمل (اختياري)" },
  { key: "unit",            label: "الوحدة (اختياري)" },
  { key: "price",           label: "السعر (ريال)", type: "number" },
  { key: "phone",           label: "رقم التواصل" },
  { key: "email",           label: "البريد الإلكتروني" },
  { key: "workDescription", label: "الوصف الفني للبند (اختياري)", wide: true },
  { key: "workScopeText",   label: "نطاق الأعمال التفصيلي (اختياري)", wide: true },
];

function contractorToForm(c: Contractor): FormData {
  return {
    contractNo: c.contractNo,
    contractor: c.contractor,
    project: c.project,
    portfolio: c.portfolio,
    technicalScope: c.technicalScope,
    workType: c.workType,
    workCategory: (c as any).workCategory ?? "",
    unit: (c as any).unit ?? "",
    price: String(c.price),
    phone: c.phone,
    email: c.email,
    workDescription: (c as any).workDescription ?? "",
    workScopeText: (c as any).workScopeText ?? "",
  };
}

function normalize(s: string) {
  return s
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
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

interface Props {
  onSelectContractor?: (id: number) => void;
}

export default function DatabasePage({ onSelectContractor }: Props) {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [search, setSearch] = useState("");

  const [editRow, setEditRow] = useState<Contractor | null>(null);
  const [editForm, setEditForm] = useState<FormData>(EMPTY_FORM);
  const [editError, setEditError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FormData>(EMPTY_FORM);
  const [addError, setAddError] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { data: contractors = [], isLoading } = useListContractors();
  const createMutation = useCreateContractor();
  const updateMutation = useUpdateContractor();
  const deleteMutation = useDeleteContractor();

  const filtered = contractors.filter((c: Contractor) => {
    if (!search) return true;
    return (
      fuzzyMatch(c.contractNo, search) ||
      fuzzyMatch(c.contractor, search) ||
      fuzzyMatch(c.project, search) ||
      fuzzyMatch(c.portfolio, search) ||
      fuzzyMatch(c.technicalScope, search) ||
      fuzzyMatch(c.workType, search) ||
      fuzzyMatch(c.phone, search) ||
      fuzzyMatch(c.email, search)
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
    setEditError("");
  }

  function openClone(c: Contractor) {
    setShowAddForm(true);
    setAddForm({
      ...EMPTY_FORM,
      contractor: c.contractor,
      portfolio: c.portfolio,
      phone: c.phone,
      email: c.email,
    });
    setAddError("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    const f = editForm;
    if (!f.contractor || !f.contractNo || !f.project || !f.portfolio || !f.technicalScope || !f.workType || !f.price || !f.phone || !f.email) {
      setEditError("يرجى ملء جميع الحقول المطلوبة"); return;
    }
    setEditError("");
    await updateMutation.mutateAsync({
      id: editRow.id,
      data: {
        ...f,
        price: parseInt(f.price, 10),
        workDescription: f.workDescription.trim() || null,
        workScopeText: f.workScopeText.trim() || null,
        workCategory: f.workCategory.trim() || null,
        unit: f.unit.trim() || null,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setEditRow(null);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const f = addForm;
    if (!f.contractor || !f.contractNo || !f.project || !f.portfolio || !f.technicalScope || !f.workType || !f.price || !f.phone || !f.email) {
      setAddError("يرجى ملء جميع الحقول المطلوبة"); return;
    }
    setAddError("");
    await createMutation.mutateAsync({
      data: {
        ...f,
        price: parseInt(f.price, 10),
        workDescription: f.workDescription.trim() || null,
        workScopeText: f.workScopeText.trim() || null,
        workCategory: f.workCategory.trim() || null,
        unit: f.unit.trim() || null,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setAddForm(EMPTY_FORM);
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
              type="password"
              placeholder="كلمة المرور"
              value={passwordInput}
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
    <div style={{ padding: "24px 20px", maxWidth: "1380px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "2px" }}>سجل البيانات الشامل</h2>
          <span style={{ fontSize: "0.72rem", color: "#aaa" }}>{filtered.length} سجل</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="بحث بأقرب وصف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "9px 14px", border: "1.5px solid #e8e0d0", borderRadius: "10px", fontSize: "0.82rem", fontFamily: "Tajawal, sans-serif", direction: "rtl", outline: "none", background: "#fff", width: "220px" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
            onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")}
          />
          <button
            onClick={() => { setShowAddForm(true); setAddForm(EMPTY_FORM); setAddError(""); }}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, var(--gold), #a88540)", color: "#fff", border: "none", borderRadius: "10px", padding: "9px 18px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}
          >
            <Plus size={15} />
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
                {["رقم العقد", "المقاول / المورد", "المشروع", "المحفظة", "نطاق التوصيف الفني للبند", "نوع الأعمال", "السعر", "التواصل", "إجراءات"].map((h, i) => (
                  <th key={i} style={{ padding: "12px 14px", textAlign: "right", fontSize: "0.68rem", fontWeight: 700, color: "rgba(197,160,89,0.9)", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: "2px solid rgba(197,160,89,0.2)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#aaa", fontSize: "0.85rem" }}>جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#aaa", fontSize: "0.85rem" }}>لا توجد سجلات مطابقة</td></tr>
              ) : filtered.map((c: Contractor, idx: number) => (
                <tr
                  key={c.id}
                  style={{ background: idx % 2 === 0 ? "#fff" : "#faf8f4", cursor: "pointer", transition: "background 0.15s ease", borderBottom: "1px solid #f0ebe0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(197,160,89,0.07)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#faf8f4")}
                >
                  <td style={tdStyle}>{c.contractNo}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{c.contractor}</td>
                  <td style={tdStyle}>{c.project}</td>
                  <td style={tdStyle}>{c.portfolio}</td>
                  <td style={{ ...tdStyle, maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.technicalScope}</td>
                  <td style={tdStyle}>
                    <span style={{ background: "rgba(197,160,89,0.1)", color: "var(--gold)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700 }}>{c.workType}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "var(--gold)", whiteSpace: "nowrap" }}>
                    {c.price.toLocaleString("ar-SA")} ريال
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: "0.7rem", color: "#888" }}>
                      <div>{c.phone}</div>
                      <div style={{ direction: "ltr", textAlign: "right" }}>{c.email}</div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, width: "90px" }}>
                    <div style={{ display: "flex", gap: "5px" }}>
                      {/* Edit */}
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                        style={iconBtnStyle("#c5a059")}
                        title="تعديل البيانات"
                      >
                        <Pencil size={12} />
                      </button>
                      {/* Clone (add same company, new record) */}
                      <button
                        onClick={(e) => { e.stopPropagation(); openClone(c); }}
                        style={iconBtnStyle("#2baa74")}
                        title="إضافة بند جديد لنفس الشركة"
                      >
                        <Plus size={12} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }}
                        style={iconBtnStyle("#e74c3c")}
                        title="حذف السجل"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {/* View in dashboard */}
                    {onSelectContractor && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectContractor(c.id); }}
                        style={{ marginTop: "4px", background: "rgba(59,143,204,0.1)", border: "none", borderRadius: "5px", width: "100%", padding: "3px 0", fontSize: "0.58rem", color: "#3b8fcc", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontWeight: 700 }}
                        title="عرض في لوحة التنسيق"
                      >
                        عرض
                      </button>
                    )}
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
            <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "20px" }}>عدّل أي حقل ثم اضغط حفظ التعديلات</p>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {FORM_FIELDS.map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: f.wide ? "1 / -1" : undefined }}>
                    <label style={labelStyle}>{f.label}</label>
                    {f.wide ? (
                      <textarea rows={2} value={editForm[f.key]} onChange={(e) => setEditForm((p) => ({ ...p, [f.key]: e.target.value }))} style={textareaStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    ) : (
                      <input type={f.type ?? "text"} value={editForm[f.key]} onChange={(e) => setEditForm((p) => ({ ...p, [f.key]: e.target.value }))} style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    )}
                  </div>
                ))}
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
              أدخل بيانات البند الجديد ثم اضغط حفظ
            </p>
            <form onSubmit={handleAddSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {FORM_FIELDS.map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: f.wide ? "1 / -1" : undefined }}>
                    <label style={labelStyle}>{f.label}</label>
                    {f.wide ? (
                      <textarea rows={2} value={addForm[f.key]} onChange={(e) => setAddForm((p) => ({ ...p, [f.key]: e.target.value }))} style={textareaStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    ) : (
                      <input type={f.type ?? "text"} value={addForm[f.key]} onChange={(e) => setAddForm((p) => ({ ...p, [f.key]: e.target.value }))} style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold)")} onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")} />
                    )}
                  </div>
                ))}
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
  padding: "11px 14px", fontSize: "0.78rem", color: "var(--charcoal)", verticalAlign: "middle",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(30,25,20,0.6)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, backdropFilter: "blur(4px)",
};

const modalStyle: React.CSSProperties = {
  maxWidth: "640px", width: "92%", padding: "28px", position: "relative",
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
  fontSize: "0.65rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em",
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
  flex: 2, padding: "11px",
  background: "linear-gradient(135deg, var(--gold), #a88540)",
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
    cursor: "pointer", color,
  };
}
