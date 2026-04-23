import { useState } from "react";
import type { ContractDetail as ContractDetailType } from "../contractTypes";
import { tafqit } from "../contractTypes";

interface Props {
  contract: ContractDetailType;
  onAction: (action: string, note?: string) => Promise<void>;
}

export default function Stage3CEOAdmin({ contract: detail, onAction }: Props) {
  const c = detail.contract;
  const alreadyApproved = c.s3CeoApproved === "approved";
  const vceoGiven = c.s3VceoApproved === "approved";
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  function fmt(v: number) {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(v);
  }

  const approvalChain = [
    { label: "اعتماد مسؤول الامتثال",           done: c.s3ComplianceLight === "approved" },
    { label: "اعتماد نائب الرئيس التنفيذي",      done: c.s3VceoApproved === "approved" },
    { label: "البوابة الفنية",                    done: c.stage1Status === "approved" },
    { label: "الضبط المالي والصياغة",             done: c.stage2Status === "approved" },
  ];

  async function handleApprove() {
    setLoading(true);
    try {
      await onAction("ceo_approve", note || "الاعتماد النهائي من الرئيس التنفيذي");
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{
        padding: "18px 22px", marginBottom: "20px",
        background: "rgba(123,45,139,0.12)", border: "1px solid rgba(123,45,139,0.3)",
        borderRadius: "12px",
      }}>
        <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: "0 0 4px" }}>
          👑 الرئيس التنفيذي — الاعتماد النهائي
        </h4>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: "Tajawal, sans-serif" }}>
          الاعتماد الأعلى — سيتحرك العقد فوراً لمرحلة التوقيع والأرشفة
        </p>
      </div>

      {/* ── Approval Chain Summary ── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(197,160,89,0.8)", marginBottom: "10px", fontFamily: "Tajawal, sans-serif" }}>
          سلسلة الاعتمادات
        </div>
        {approvalChain.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 14px", marginBottom: "6px",
            background: item.done ? "rgba(39,174,96,0.08)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${item.done ? "rgba(39,174,96,0.2)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: "8px",
          }}>
            <span style={{ fontSize: "0.8rem" }}>{item.done ? "✅" : "⏳"}</span>
            <span style={{ fontSize: "0.78rem", color: item.done ? "#27ae60" : "rgba(255,255,255,0.5)", fontFamily: "Tajawal, sans-serif" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Contract Summary Card ── */}
      <div style={{
        padding: "18px", marginBottom: "20px",
        background: "rgba(197,160,89,0.06)", border: "1px solid rgba(197,160,89,0.2)",
        borderRadius: "12px",
      }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", marginBottom: "8px" }}>
          {c.title}
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--gold)", fontFamily: "Tajawal, sans-serif", marginBottom: "4px", fontWeight: 700 }}>
          {fmt(c.contractValue)}
        </div>
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontFamily: "Tajawal, sans-serif", lineHeight: 1.6 }}>
          {tafqit(c.contractValue)}
        </div>
      </div>

      {/* ── CEO Note ── */}
      {!alreadyApproved && (
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(197,160,89,0.8)", fontFamily: "Tajawal, sans-serif", display: "block", marginBottom: "6px" }}>
            ملاحظة الرئيس التنفيذي (اختياري)
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="أضف ملاحظاتك هنا..."
            style={{
              width: "100%", padding: "10px 14px",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(197,160,89,0.25)",
              borderRadius: "10px", fontSize: "0.82rem", fontFamily: "Tajawal, sans-serif",
              direction: "rtl", color: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {!vceoGiven && (
        <div style={{
          padding: "12px 14px", marginBottom: "14px",
          background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)",
          borderRadius: "10px", fontSize: "0.75rem", color: "#e74c3c",
          fontFamily: "Tajawal, sans-serif",
        }}>
          ⚠️ في انتظار اعتماد نائب الرئيس التنفيذي
        </div>
      )}

      {alreadyApproved ? (
        <div style={{
          padding: "16px", background: "rgba(39,174,96,0.12)",
          border: "1px solid rgba(39,174,96,0.3)", borderRadius: "12px",
          fontSize: "0.88rem", color: "#27ae60", fontFamily: "Tajawal, sans-serif", fontWeight: 800,
          textAlign: "center",
        }}>
          👑 الاعتماد النهائي مكتمل — العقد ينتقل لمرحلة التوقيع
        </div>
      ) : (
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleApprove}
            disabled={!vceoGiven || loading}
            style={{
              flex: 2, padding: "14px", borderRadius: "12px",
              background: vceoGiven
                ? "linear-gradient(135deg, #c5a059, #a88540)"
                : "rgba(255,255,255,0.06)",
              color: vceoGiven ? "#fff" : "rgba(255,255,255,0.3)", border: "none",
              fontSize: "0.88rem", fontWeight: 800, fontFamily: "Tajawal, sans-serif",
              cursor: vceoGiven ? "pointer" : "not-allowed",
              boxShadow: vceoGiven ? "0 4px 20px rgba(197,160,89,0.3)" : "none",
            }}
          >
            {loading ? "جارٍ الاعتماد..." : "👑 الاعتماد النهائي"}
          </button>
          <button
            onClick={() => onAction("reject", "إعادة للمراجعة من الرئيس التنفيذي")}
            style={{
              flex: 1, padding: "14px", borderRadius: "12px",
              background: "rgba(231,76,60,0.1)", color: "#e74c3c",
              border: "1px solid rgba(231,76,60,0.3)",
              fontSize: "0.85rem", fontWeight: 700, fontFamily: "Tajawal, sans-serif", cursor: "pointer",
            }}
          >
            ↩ إعادة
          </button>
        </div>
      )}
    </div>
  );
}
