import { useState } from "react";

interface Props {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(197,160,89,0.25)",
  borderRadius: "10px", fontSize: "0.82rem",
  fontFamily: "Tajawal, sans-serif", direction: "rtl",
  color: "#fff", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.18s",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "0.72rem", fontWeight: 700,
  color: "rgba(197,160,89,0.85)", fontFamily: "Tajawal, sans-serif",
  marginBottom: "6px", display: "block",
  letterSpacing: "0.04em",
};

export default function Stage1PMAdmin({ onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    title: "", portfolio: "", project: "", workType: "",
    technicalScope: "", contractValue: "", createdBy: "مدير المشروع",
  });
  const [rows, setRows] = useState([{ item: "", qty: "", unit: "", note: "" }]);
  const [docs, setDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));
  }

  function addRow() { setRows(p => [...p, { item: "", qty: "", unit: "", note: "" }]); }
  function removeRow(i: number) { setRows(p => p.filter((_, j) => j !== i)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.portfolio || !form.project || !form.workType) {
      setError("يرجى تعبئة جميع الحقول الإلزامية"); return;
    }
    setLoading(true); setError("");
    try {
      await onSubmit({
        ...form,
        contractValue: parseInt(form.contractValue) || 0,
      });
    } catch (err: any) {
      setError(err.message ?? "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "28px 32px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: 0 }}>
          🏗️ إنشاء طلب تعاقد جديد (CR)
        </h3>
        <p style={{ fontSize: "0.75rem", color: "rgba(197,160,89,0.7)", margin: "6px 0 0", fontFamily: "Tajawal, sans-serif" }}>
          الحزمة الفنية — المخططات والمواصفات وجدول الكميات
        </p>
      </div>

      {/* ── Main Fields ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {([
          ["title",         "عنوان العقد *",          "text",   "مشروع إنشاء مبنى إداري..."],
          ["portfolio",     "المحفظة / المنطقة *",     "text",   "الرياض"],
          ["project",       "اسم المشروع *",           "text",   "مشروع الأصالة..."],
          ["workType",      "نوع الأعمال *",           "text",   "إنشائي — معماري"],
          ["contractValue", "القيمة التقديرية (ريال)", "number", "1500000"],
          ["createdBy",     "اسم مدير المشروع",        "text",   "أحمد العمري"],
        ] as const).map(([key, label, type, placeholder]) => (
          <div key={key}>
            <label style={LABEL_STYLE}>{label}</label>
            <input
              type={type}
              placeholder={placeholder}
              value={(form as any)[key]}
              onChange={f(key as any)}
              style={INPUT_STYLE}
              onFocus={e => (e.target.style.borderColor = "rgba(197,160,89,0.75)")}
              onBlur={e => (e.target.style.borderColor = "rgba(197,160,89,0.25)")}
            />
          </div>
        ))}
      </div>

      {/* Technical scope */}
      <div style={{ marginBottom: "20px" }}>
        <label style={LABEL_STYLE}>النطاق الفني والمواصفات</label>
        <textarea
          rows={3}
          placeholder="وصف تفصيلي لنطاق الأعمال والمواصفات الفنية..."
          value={form.technicalScope}
          onChange={f("technicalScope")}
          style={{ ...INPUT_STYLE, resize: "vertical" }}
          onFocus={e => (e.target.style.borderColor = "rgba(197,160,89,0.75)")}
          onBlur={e => (e.target.style.borderColor = "rgba(197,160,89,0.25)")}
        />
      </div>

      {/* ── Quantities Table ── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <label style={{ ...LABEL_STYLE, margin: 0 }}>جدول الكميات</label>
          <button type="button" onClick={addRow} style={{
            background: "rgba(197,160,89,0.12)", color: "rgba(197,160,89,0.85)",
            border: "1px solid rgba(197,160,89,0.25)", borderRadius: "8px",
            padding: "4px 12px", fontSize: "0.7rem", fontFamily: "Tajawal, sans-serif",
            cursor: "pointer",
          }}>+ إضافة بند</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["البند", "الكمية", "الوحدة", "ملاحظات", ""].map(h => (
                <th key={h} style={{
                  padding: "8px 10px", textAlign: "right",
                  fontSize: "0.65rem", color: "rgba(197,160,89,0.7)",
                  fontFamily: "Tajawal, sans-serif",
                  background: "rgba(197,160,89,0.05)",
                  borderBottom: "1px solid rgba(197,160,89,0.15)",
                }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {(["item", "qty", "unit", "note"] as const).map(k => (
                    <td key={k} style={{ padding: "6px" }}>
                      <input
                        value={row[k]}
                        onChange={e => setRows(p => p.map((r, j) => j === i ? { ...r, [k]: e.target.value } : r))}
                        style={{ ...INPUT_STYLE, padding: "7px 10px", fontSize: "0.75rem" }}
                        onFocus={e => (e.target.style.borderColor = "rgba(197,160,89,0.75)")}
                        onBlur={e => (e.target.style.borderColor = "rgba(197,160,89,0.25)")}
                      />
                    </td>
                  ))}
                  <td style={{ padding: "6px" }}>
                    <button type="button" onClick={() => removeRow(i)} style={{
                      background: "rgba(231,76,60,0.1)", color: "#e74c3c",
                      border: "1px solid rgba(231,76,60,0.2)", borderRadius: "6px",
                      width: "28px", height: "28px", cursor: "pointer", fontSize: "0.75rem",
                    }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Document Tags ── */}
      <div style={{ marginBottom: "24px" }}>
        <label style={LABEL_STYLE}>وسوم المستندات المرفقة</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["المخططات الهندسية", "جدول الكميات", "المواصفات الفنية", "السجل التجاري", "الشهادة الضريبية", "شهادة الزكاة"].map(doc => {
            const sel = docs.includes(doc);
            return (
              <button
                key={doc} type="button"
                onClick={() => setDocs(p => sel ? p.filter(d => d !== doc) : [...p, doc])}
                style={{
                  padding: "5px 12px", borderRadius: "20px", fontSize: "0.72rem",
                  fontFamily: "Tajawal, sans-serif", cursor: "pointer",
                  border: sel ? "1.5px solid var(--gold)" : "1px solid rgba(197,160,89,0.3)",
                  background: sel ? "rgba(197,160,89,0.18)" : "rgba(255,255,255,0.06)",
                  color: sel ? "var(--gold)" : "rgba(255,255,255,0.7)",
                  fontWeight: sel ? 700 : 400,
                }}
              >
                {sel ? "✓ " : ""}{doc}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{
          padding: "10px 14px", background: "rgba(231,76,60,0.12)",
          border: "1px solid rgba(231,76,60,0.3)", borderRadius: "8px",
          fontSize: "0.78rem", color: "#e74c3c", marginBottom: "16px",
          fontFamily: "Tajawal, sans-serif",
        }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={{
          padding: "10px 20px", borderRadius: "10px",
          background: "rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)",
          fontSize: "0.8rem", fontFamily: "Tajawal, sans-serif", cursor: "pointer",
        }}>إلغاء</button>
        <button type="submit" disabled={loading} style={{
          padding: "10px 24px", borderRadius: "10px",
          background: loading ? "rgba(197,160,89,0.3)" : "linear-gradient(135deg, #c5a059, #a88540)",
          color: "#fff", border: "none",
          fontSize: "0.82rem", fontWeight: 700, fontFamily: "Tajawal, sans-serif",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 14px rgba(197,160,89,0.3)",
        }}>
          {loading ? "جارٍ الإنشاء..." : "إنشاء طلب التعاقد ←"}
        </button>
      </div>
    </form>
  );
}
