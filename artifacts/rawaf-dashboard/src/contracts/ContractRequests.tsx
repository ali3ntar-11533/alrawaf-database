import { useEffect, useState } from "react";
import { GOLD, GOLD_BG, GOLD_BORDER, STAGES } from "./types";
import type { Contract } from "./types";
import { listContracts, createContract, deleteContract } from "./api";
import { tafqit } from "./tafqit";

interface Props {
  role: string;
  actorName: string;
  onOpenContract: (id: number) => void;
}

const CONTRACT_TYPES = ["خدمات", "مستلزمات", "إنشاءات", "استشارات", "أخرى"];

export default function ContractRequests({ role, actorName, onOpenContract }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    title: "", vendorName: "", vendorContact: "",
    value: "", startDate: "", endDate: "",
    contractType: "خدمات", projectName: "",
  });
  const [formErr, setFormErr] = useState("");

  function loadContracts() {
    setLoading(true);
    listContracts(filterStatus ? { status: filterStatus } : undefined)
      .then(setContracts)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadContracts(); }, [filterStatus]);

  const filtered = contracts.filter(c =>
    !search || c.title.includes(search) || c.vendorName.includes(search) || c.contractNo.includes(search)
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.vendorName.trim()) {
      setFormErr("يرجى تعبئة اسم العقد واسم المورد على الأقل");
      return;
    }
    if (role !== "مدير المشروع") {
      setFormErr("إنشاء العقد مقيّد لدور مدير المشروع فقط");
      return;
    }
    setSaving(true);
    setFormErr("");
    try {
      await createContract({
        title: form.title.trim(),
        vendorName: form.vendorName.trim(),
        vendorContact: form.vendorContact,
        value: form.value ? parseInt(form.value.replace(/,/g, ""), 10) : 0,
        startDate: form.startDate,
        endDate: form.endDate,
        contractType: form.contractType,
        projectName: form.projectName,
        createdBy: actorName,
      });
      setShowForm(false);
      setForm({ title: "", vendorName: "", vendorContact: "", value: "", startDate: "", endDate: "", contractType: "خدمات", projectName: "" });
      loadContracts();
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذا العقد؟")) return;
    await deleteContract(id);
    loadContracts();
  }

  const amountVal = parseInt((form.value || "0").replace(/,/g, ""), 10);

  return (
    <div dir="rtl" style={{ padding: "24px 28px", fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#1a1206", marginBottom: 4 }}>
            📋 طلبات العقود
          </h2>
          <p style={{ color: "#9b8060", fontSize: "0.82rem" }}>إدارة جميع طلبات وعقود الشركة</p>
        </div>
        {role === "مدير المشروع" && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
              color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 800,
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              boxShadow: `0 4px 14px rgba(197,160,89,0.4)`,
              display: "flex", alignItems: "center", gap: 8,
              animation: "req-glow 2.4s ease-in-out infinite",
            }}
          >
            <span>✨</span> إرسال طلب عقد جديد
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 بحث بالاسم أو رقم العقد..."
          style={{
            flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 9,
            border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
            fontFamily: "'Cairo', 'Tajawal', sans-serif", outline: "none",
          }}
        />
        {["", "active", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "9px 16px", borderRadius: 9, cursor: "pointer", fontSize: "0.78rem",
              border: `1.5px solid ${filterStatus === s ? GOLD : GOLD_BORDER}`,
              background: filterStatus === s ? GOLD_BG : "#fff",
              color: filterStatus === s ? "#8B6914" : "#6b5c3e",
              fontFamily: "'Cairo', 'Tajawal', sans-serif", fontWeight: 700,
            }}
          >
            {s === "" ? "الكل" : s === "active" ? "نشط" : "مكتمل"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#bbb" }}>جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#bbb", fontSize: "0.9rem" }}>
          {search ? "لا نتائج مطابقة" : "لا يوجد عقود — أنشئ عقداً جديداً"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(c => {
            const pct = Math.round(((c.currentStage - 1) / 11) * 100);
            const isCompleted = c.status === "completed";
            const isRejected = !!c.rejectionReason && !isCompleted;
            const stage = STAGES[c.currentStage - 1];
            return (
              <div key={c.id} style={{
                background: "#fff", borderRadius: 14, padding: "16px 18px",
                border: isRejected ? "1.5px solid rgba(231,76,60,0.35)" : isCompleted ? "1.5px solid rgba(39,174,96,0.3)" : "1px solid rgba(0,0,0,0.07)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: isCompleted ? "rgba(39,174,96,0.1)" : isRejected ? "rgba(231,76,60,0.1)" : GOLD_BG,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
                  }}>
                    {isCompleted ? "✅" : isRejected ? "🔄" : stage?.icon ?? "📄"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#1a1206" }}>{c.title}</span>
                      <span style={{
                        fontSize: "0.62rem", padding: "2px 8px", borderRadius: 20,
                        background: isCompleted ? "rgba(39,174,96,0.12)" : isRejected ? "rgba(231,76,60,0.1)" : GOLD_BG,
                        color: isCompleted ? "#27ae60" : isRejected ? "#e74c3c" : GOLD,
                        fontWeight: 700, border: `1px solid ${isCompleted ? "rgba(39,174,96,0.3)" : isRejected ? "rgba(231,76,60,0.2)" : GOLD_BORDER}`,
                      }}>
                        {isCompleted ? "مكتمل" : isRejected ? "مُعاد" : `م${c.currentStage}: ${stage?.label}`}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#9b8060", marginTop: 3 }}>
                      {c.contractNo} · {c.vendorName} · {c.value > 0 ? c.value.toLocaleString("ar-SA") + " ريال" : "—"}
                    </div>
                    {isRejected && (
                      <div style={{ fontSize: "0.7rem", color: "#e74c3c", marginTop: 4 }}>
                        ↩ سبب الإعادة: {c.rejectionReason}
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${isCompleted ? 100 : pct}%`,
                          background: isCompleted ? "#27ae60" : `linear-gradient(90deg, ${GOLD}, #a88540)`,
                          transition: "width 0.6s",
                          borderRadius: 3,
                        }} />
                      </div>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: GOLD }}>
                        {isCompleted ? "100" : pct}%
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => onOpenContract(c.id)}
                      style={{
                        padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${GOLD_BORDER}`,
                        background: GOLD_BG, color: "#8B6914", cursor: "pointer",
                        fontSize: "0.75rem", fontWeight: 700, fontFamily: "'Cairo', 'Tajawal', sans-serif",
                      }}
                    >
                      فتح ←
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{
                        padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(231,76,60,0.25)",
                        background: "rgba(231,76,60,0.06)", color: "#e74c3c",
                        cursor: "pointer", fontSize: "0.75rem", fontFamily: "'Cairo', 'Tajawal', sans-serif",
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9500,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div dir="rtl" style={{
            background: "#fff", borderRadius: 20, padding: "32px 30px",
            width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1a1206" }}>📝 عقد جديد</h3>
                <p style={{ fontSize: "0.72rem", color: "#9b8060" }}>تعبئة بيانات العقد وإرساله للمراجعة</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer", color: "#999" }}>×</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "title",         label: "اسم العقد *",          placeholder: "عقد توريد مواد البناء..." },
                { key: "vendorName",    label: "اسم المورد / المقاول *", placeholder: "شركة الخير للتجارة" },
                { key: "vendorContact", label: "بيانات التواصل",         placeholder: "0500000000 / email@..." },
                { key: "projectName",   label: "اسم المشروع",            placeholder: "مشروع الرياض الشمالي" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", marginBottom: 5 }}>{f.label}</label>
                  <input
                    value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 9,
                      border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.85rem",
                      fontFamily: "'Cairo', 'Tajawal', sans-serif", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", marginBottom: 5 }}>نوع العقد</label>
                <select
                  value={form.contractType}
                  onChange={e => setForm(p => ({ ...p, contractType: e.target.value }))}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 9,
                    border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.85rem",
                    fontFamily: "'Cairo', 'Tajawal', sans-serif", background: "#fff", outline: "none", boxSizing: "border-box",
                  }}
                >
                  {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", marginBottom: 5 }}>
                  قيمة العقد (ريال سعودي)
                </label>
                <input
                  type="number"
                  value={form.value}
                  onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                  placeholder="250000"
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 9,
                    border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.85rem",
                    fontFamily: "'Cairo', 'Tajawal', sans-serif", outline: "none", boxSizing: "border-box",
                  }}
                />
                {form.value && amountVal > 0 && (
                  <div style={{ fontSize: "0.68rem", color: "#8B6914", marginTop: 4, lineHeight: 1.5 }}>
                    📝 {tafqit(amountVal)}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { key: "startDate", label: "تاريخ البدء" },
                  { key: "endDate",   label: "تاريخ الانتهاء" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", marginBottom: 5 }}>{f.label}</label>
                    <input
                      type="date"
                      value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{
                        width: "100%", padding: "10px 12px", borderRadius: 9,
                        border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>

              {formErr && (
                <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.25)", borderRadius: 8, padding: "10px 14px", color: "#e74c3c", fontSize: "0.78rem" }}>
                  ⚠ {formErr}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "13px", borderRadius: 11, border: "none",
                  background: saving ? "#ccc" : `linear-gradient(135deg, ${GOLD}, #a88540)`,
                  color: "#fff", cursor: saving ? "not-allowed" : "pointer",
                  fontSize: "0.9rem", fontWeight: 800,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  boxShadow: saving ? "none" : `0 4px 14px rgba(197,160,89,0.4)`,
                  animation: saving ? "none" : "req-glow 2.4s ease-in-out infinite",
                }}
              >
                {saving ? "جاري الإرسال..." : "✨ إرسال الطلب"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes req-glow {
          0%, 100% { box-shadow: 0 4px 14px rgba(197,160,89,0.3); }
          50%       { box-shadow: 0 4px 22px rgba(197,160,89,0.6); }
        }
      `}</style>
    </div>
  );
}
