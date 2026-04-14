import { useState, useEffect } from "react";
import { X, Plus, Trash2, Eye, Lock } from "lucide-react";
import {
  useListContractors,
  useCreateContractor,
  useDeleteContractor,
  getListContractorsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Contractor } from "@workspace/api-client-react";

const DB_PASSWORD = "rawaf@2024";
const SESSION_KEY = "rawaf_db_auth";

interface AddForm {
  contractNo: string;
  contractor: string;
  project: string;
  portfolio: string;
  technicalScope: string;
  workType: string;
  price: string;
  phone: string;
  email: string;
}

const EMPTY_FORM: AddForm = {
  contractNo: "", contractor: "", project: "", portfolio: "",
  technicalScope: "", workType: "", price: "", phone: "", email: "",
};

const FORM_FIELDS: { key: keyof AddForm; label: string; type?: string }[] = [
  { key: "contractNo",    label: "رقم العقد" },
  { key: "contractor",    label: "اسم المقاول" },
  { key: "project",       label: "المشروع" },
  { key: "portfolio",     label: "المحفظة" },
  { key: "technicalScope", label: "نطاق التوصيف الفني للبند" },
  { key: "workType",      label: "نوع الأعمال" },
  { key: "price",         label: "السعر (ريال)", type: "number" },
  { key: "phone",         label: "رقم التواصل" },
  { key: "email",         label: "البريد الإلكتروني" },
];

interface Props {
  onSelectContractor?: (id: number) => void;
}

export default function DatabasePage({ onSelectContractor }: Props) {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRow, setSelectedRow] = useState<Contractor | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { data: contractors = [], isLoading } = useListContractors();
  const createMutation = useCreateContractor();
  const deleteMutation = useDeleteContractor();

  // Client-side search across all text columns
  const filtered = contractors.filter((c: Contractor) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.contractNo.toLowerCase().includes(q) ||
      c.contractor.toLowerCase().includes(q) ||
      c.project.toLowerCase().includes(q) ||
      c.portfolio.toLowerCase().includes(q) ||
      c.technicalScope.toLowerCase().includes(q) ||
      c.workType.toLowerCase().includes(q)
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

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contractor || !form.contractNo || !form.project || !form.portfolio || !form.technicalScope || !form.workType || !form.price || !form.phone || !form.email) {
      setFormError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setFormError("");
    await createMutation.mutateAsync({
      data: { ...form, price: parseInt(form.price, 10) },
    });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setForm(EMPTY_FORM);
    setShowAddForm(false);
  }

  async function handleDelete(id: number) {
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListContractorsQueryKey() });
    setDeleteConfirm(null);
    if (selectedRow?.id === id) setSelectedRow(null);
  }

  // Password gate
  if (!authenticated) {
    return (
      <div
        style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          minHeight: "70vh", padding: "20px",
        }}
      >
        <div
          className="card animate-fade-up"
          style={{
            maxWidth: "400px", width: "100%", padding: "40px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: "linear-gradient(135deg, var(--gold), #a88540)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Lock size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "8px" }}>
            قاعدة البيانات محمية
          </h2>
          <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "24px" }}>
            أدخل كلمة المرور للوصول إلى سجل البيانات الشامل
          </p>
          <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="password"
              placeholder="كلمة المرور"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
              style={{
                width: "100%", padding: "12px 16px",
                border: `1.5px solid ${passwordError ? "#e74c3c" : "#e8e0d0"}`,
                borderRadius: "10px", fontSize: "0.9rem",
                fontFamily: "Tajawal, sans-serif", direction: "rtl",
                outline: "none", background: "#faf8f4", boxSizing: "border-box",
              }}
            />
            {passwordError && (
              <span style={{ fontSize: "0.75rem", color: "#e74c3c" }}>{passwordError}</span>
            )}
            <button
              type="submit"
              style={{
                background: "linear-gradient(135deg, var(--gold), #a88540)",
                color: "#fff", border: "none", borderRadius: "10px",
                padding: "12px", fontSize: "0.9rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "Tajawal, sans-serif",
              }}
            >
              دخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px", maxWidth: "1300px", margin: "0 auto" }}>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "2px" }}>
            سجل البيانات الشامل
          </h2>
          <span style={{ fontSize: "0.72rem", color: "#aaa" }}>{filtered.length} سجل</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="بحث شامل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "9px 14px", border: "1.5px solid #e8e0d0", borderRadius: "10px",
              fontSize: "0.82rem", fontFamily: "Tajawal, sans-serif", direction: "rtl",
              outline: "none", background: "#fff", width: "200px",
            }}
          />
          <button
            onClick={() => { setShowAddForm(true); setForm(EMPTY_FORM); setFormError(""); }}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "linear-gradient(135deg, var(--gold), #a88540)",
              color: "#fff", border: "none", borderRadius: "10px",
              padding: "9px 18px", fontSize: "0.82rem", fontWeight: 700,
              cursor: "pointer", fontFamily: "Tajawal, sans-serif",
            }}
          >
            <Plus size={15} />
            إضافة البيانات
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
            <thead>
              <tr style={{ background: "var(--charcoal)" }}>
                {["رقم العقد", "المقاول", "المشروع", "المحفظة", "نطاق التوصيف الفني للبند", "نوع الأعمال", "السعر", "التواصل", ""].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "12px 14px", textAlign: "right",
                      fontSize: "0.68rem", fontWeight: 700, color: "rgba(197,160,89,0.9)",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      whiteSpace: "nowrap", borderBottom: "2px solid rgba(197,160,89,0.2)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#aaa", fontSize: "0.85rem" }}>جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#aaa", fontSize: "0.85rem" }}>لا توجد سجلات</td></tr>
              ) : filtered.map((c: Contractor, idx: number) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedRow(c)}
                  style={{
                    background: idx % 2 === 0 ? "#fff" : "#faf8f4",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    borderBottom: "1px solid #f0ebe0",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(197,160,89,0.07)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#faf8f4")}
                >
                  <td style={tdStyle}>{c.contractNo}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{c.contractor}</td>
                  <td style={tdStyle}>{c.project}</td>
                  <td style={tdStyle}>{c.portfolio}</td>
                  <td style={{ ...tdStyle, maxWidth: "180px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.technicalScope}</td>
                  <td style={tdStyle}>
                    <span style={{ background: "rgba(197,160,89,0.1)", color: "var(--gold)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700 }}>
                      {c.workType}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "var(--gold)", whiteSpace: "nowrap" }}>
                    {c.price.toLocaleString("ar-SA")} ريال
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: "0.7rem", color: "#888" }}>
                      <div>{c.phone}</div>
                      <div>{c.email}</div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, width: "70px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedRow(c); }}
                        style={iconBtnStyle("#3b8fcc")}
                        title="عرض التفاصيل"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }}
                        style={iconBtnStyle("#e74c3c")}
                        title="حذف"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Detail Modal */}
      {selectedRow && (
        <div style={overlayStyle} onClick={() => setSelectedRow(null)}>
          <div
            className="card animate-fade-up"
            style={{ maxWidth: "520px", width: "90%", padding: "28px 28px 24px", position: "relative", margin: "20px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setSelectedRow(null)} style={closeBtnStyle}>
              <X size={16} />
            </button>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "4px" }}>
              {selectedRow.contractor}
            </h3>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              <span style={{ fontSize: "0.7rem", background: "rgba(197,160,89,0.12)", color: "var(--gold)", borderRadius: "20px", padding: "2px 10px", fontWeight: 700 }}>
                {selectedRow.workType}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#999" }}>{selectedRow.contractNo}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[
                { label: "المشروع", value: selectedRow.project },
                { label: "المحفظة", value: selectedRow.portfolio },
                { label: "نطاق التوصيف الفني للبند", value: selectedRow.technicalScope },
                { label: "قيمة العقد", value: `${selectedRow.price.toLocaleString("ar-SA")} ريال` },
                { label: "رقم التواصل", value: selectedRow.phone },
                { label: "البريد الإلكتروني", value: selectedRow.email },
              ].map((item, i) => (
                <div key={i} style={{ background: "#f9f7f3", borderRadius: "8px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "0.6rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>{item.label}</div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--charcoal)", wordBreak: "break-word" }}>{item.value}</div>
                </div>
              ))}
            </div>
            {onSelectContractor && (
              <button
                onClick={() => { onSelectContractor(selectedRow.id); setSelectedRow(null); }}
                style={{
                  background: "linear-gradient(135deg, var(--gold), #a88540)",
                  color: "#fff", border: "none", borderRadius: "10px",
                  padding: "10px 20px", fontSize: "0.82rem", fontWeight: 700,
                  cursor: "pointer", fontFamily: "Tajawal, sans-serif", width: "100%",
                }}
              >
                عرض في لوحة التنسيق الفني
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm !== null && (
        <div style={overlayStyle} onClick={() => setDeleteConfirm(null)}>
          <div
            className="card animate-fade-up"
            style={{ maxWidth: "380px", width: "90%", padding: "28px", textAlign: "center", margin: "20px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(231,76,60,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 size={24} color="#e74c3c" />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "8px" }}>تأكيد الحذف</h3>
            <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "20px" }}>هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "10px", border: "1.5px solid #e8e0d0", borderRadius: "10px", background: "#fff", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.82rem" }}>
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                style={{ flex: 1, padding: "10px", border: "none", borderRadius: "10px", background: "#e74c3c", color: "#fff", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.82rem" }}
              >
                {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Data Spreadsheet Modal */}
      {showAddForm && (
        <div style={overlayStyle} onClick={() => setShowAddForm(false)}>
          <div
            className="card animate-fade-up"
            style={{ maxWidth: "600px", width: "92%", padding: "28px", position: "relative", margin: "20px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowAddForm(false)} style={closeBtnStyle}>
              <X size={16} />
            </button>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "4px" }}>
              إضافة سجل جديد
            </h3>
            <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "20px" }}>
              أدخل البيانات في جميع الحقول ثم اضغط حفظ
            </p>

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {FORM_FIELDS.map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "0.65rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {f.label}
                    </label>
                    <input
                      type={f.type ?? "text"}
                      value={form[f.key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      style={{
                        padding: "9px 12px", border: "1.5px solid #e8e0d0", borderRadius: "8px",
                        fontSize: "0.82rem", fontFamily: "Tajawal, sans-serif", direction: "rtl",
                        outline: "none", background: "#faf8f4", boxSizing: "border-box", width: "100%",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
                      onBlur={(e) => (e.target.style.borderColor = "#e8e0d0")}
                    />
                  </div>
                ))}
              </div>

              {formError && (
                <div style={{ fontSize: "0.75rem", color: "#e74c3c", marginBottom: "12px", background: "rgba(231,76,60,0.07)", borderRadius: "6px", padding: "8px 12px" }}>
                  {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{ flex: 1, padding: "11px", border: "1.5px solid #e8e0d0", borderRadius: "10px", background: "#fff", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.85rem" }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  style={{
                    flex: 2, padding: "11px",
                    background: "linear-gradient(135deg, var(--gold), #a88540)",
                    color: "#fff", border: "none", borderRadius: "10px",
                    cursor: createMutation.isPending ? "wait" : "pointer",
                    fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: "0.85rem",
                  }}
                >
                  {createMutation.isPending ? "جاري الحفظ..." : "حفظ السجل"}
                </button>
              </div>
            </form>
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
  position: "fixed", inset: 0, background: "rgba(30,25,20,0.55)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, backdropFilter: "blur(4px)",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute", top: "16px", left: "16px",
  background: "#f5f0e8", border: "none", borderRadius: "50%",
  width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", color: "#666",
};

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    background: `${color}15`, border: "none", borderRadius: "6px",
    width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color,
  };
}
