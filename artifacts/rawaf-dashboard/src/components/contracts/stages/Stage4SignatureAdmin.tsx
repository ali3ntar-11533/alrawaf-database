import { useState } from "react";
import type { ContractDetail as ContractDetailType } from "../contractTypes";
import { tafqit } from "../contractTypes";

interface Props {
  contract: ContractDetailType;
  onAction: (action: string, note?: string, extra?: any) => Promise<void>;
}

export default function Stage4SignatureAdmin({ contract: detail, onAction }: Props) {
  const c = detail.contract;
  const alreadySigned = c.s4ContractorSigned === "signed";
  const stage3Done    = c.stage3Status === "approved";

  const [contractorName, setContractorName] = useState(c.s4ContractorName ?? "");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  function fmt(v: number) {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(v);
  }

  function formatDate(iso: string) {
    try { return new Intl.DateTimeFormat("ar-SA", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso)); }
    catch { return iso; }
  }

  async function handleSign() {
    if (!contractorName || !confirm) return;
    setLoading(true);
    try {
      await onAction("contractor_sign", `توقيع المقاول ${contractorName} وأرشفة العقد`, { contractorName });
    } finally { setLoading(false); }
  }

  /* If already signed — show archive card */
  if (alreadySigned) {
    return (
      <div>
        {/* Archive Card */}
        <div style={{
          padding: "28px 24px",
          background: "linear-gradient(135deg, rgba(15,34,64,0.9), rgba(23,45,82,0.9))",
          border: "2px solid rgba(197,160,89,0.45)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(197,160,89,0.15)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Watermark */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%) rotate(-30deg)",
            fontSize: "6rem", opacity: 0.04, color: "#27ae60",
            pointerEvents: "none", userSelect: "none",
          }}>
            مؤرشف
          </div>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🏛️</div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--gold)", fontFamily: "Tajawal, sans-serif" }}>
              شركة الرواف للمقاولات
            </div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", fontFamily: "Tajawal, sans-serif", marginTop: "4px" }}>
              عقد موقّع ومؤرشف رقمياً
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(197,160,89,0.2)", paddingTop: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {[
                ["رقم العقد",         c.contractNo],
                ["موضوع العقد",       c.title],
                ["المحفظة",           c.portfolio],
                ["القيمة",            fmt(c.contractValue)],
                ["اسم المقاول",       c.s4ContractorName ?? "—"],
                ["تاريخ التوقيع",     c.s4SignedAt ? formatDate(c.s4SignedAt) : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: "0.62rem", color: "rgba(197,160,89,0.6)", fontFamily: "Tajawal, sans-serif", marginBottom: "3px" }}>{k}</div>
                  <div style={{ fontSize: "0.8rem", color: "#fff", fontFamily: "Tajawal, sans-serif", fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Tafqit */}
            <div style={{
              marginTop: "16px", padding: "12px 14px",
              background: "rgba(197,160,89,0.06)", borderRadius: "10px",
              border: "1px solid rgba(197,160,89,0.15)",
            }}>
              <div style={{ fontSize: "0.6rem", color: "rgba(197,160,89,0.6)", fontFamily: "Tajawal, sans-serif", marginBottom: "4px" }}>القيمة بالأحرف</div>
              <div style={{ fontSize: "0.78rem", color: "var(--gold)", fontFamily: "Tajawal, sans-serif", fontWeight: 700 }}>
                {tafqit(c.contractValue)}
              </div>
            </div>
          </div>

          {/* Stamp */}
          <div style={{
            position: "absolute", bottom: "18px", left: "18px",
            width: "72px", height: "72px", borderRadius: "50%",
            border: "3px solid rgba(39,174,96,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(39,174,96,0.08)",
            transform: "rotate(-12deg)",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.2rem" }}>✅</div>
              <div style={{ fontSize: "0.48rem", color: "#27ae60", fontFamily: "Tajawal, sans-serif", fontWeight: 800 }}>مؤرشف</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        padding: "18px 22px", marginBottom: "20px",
        background: "rgba(139,58,31,0.12)", border: "1px solid rgba(139,58,31,0.3)",
        borderRadius: "12px",
      }}>
        <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: "0 0 4px" }}>
          🖊️ أدمن التوقيعات — التوقيع النهائي والأرشفة
        </h4>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: "Tajawal, sans-serif" }}>
          بعد التوقيع يُغلق العقد نهائياً ويُؤرشف رقمياً
        </p>
      </div>

      {!stage3Done && (
        <div style={{
          padding: "14px", marginBottom: "16px",
          background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)",
          borderRadius: "10px", fontSize: "0.78rem", color: "#e74c3c", fontFamily: "Tajawal, sans-serif",
        }}>
          ⚠️ في انتظار الاعتماد النهائي من الرئيس التنفيذي
        </div>
      )}

      {/* Contract preview */}
      <div style={{
        padding: "16px 20px", marginBottom: "20px",
        background: "rgba(197,160,89,0.05)", border: "1px solid rgba(197,160,89,0.2)",
        borderRadius: "12px",
      }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff", fontFamily: "Tajawal, sans-serif", marginBottom: "8px" }}>
          {c.contractNo} — {c.title}
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--gold)", fontFamily: "Tajawal, sans-serif", fontWeight: 700 }}>
          {fmt(c.contractValue)}
        </div>
        <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", fontFamily: "Tajawal, sans-serif", marginTop: "4px" }}>
          {tafqit(c.contractValue)}
        </div>
      </div>

      {/* Contractor name */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(197,160,89,0.8)", fontFamily: "Tajawal, sans-serif", display: "block", marginBottom: "6px" }}>
          اسم المقاول أو شركة المقاولات *
        </label>
        <input
          value={contractorName}
          onChange={e => setContractorName(e.target.value)}
          disabled={!stage3Done}
          placeholder="أدخل الاسم الكامل للمقاول..."
          style={{
            width: "100%", padding: "11px 14px",
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(197,160,89,0.25)",
            borderRadius: "10px", fontSize: "0.82rem",
            fontFamily: "Tajawal, sans-serif", color: "#fff", outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={e => (e.target.style.borderColor = "rgba(197,160,89,0.75)")}
          onBlur={e => (e.target.style.borderColor = "rgba(197,160,89,0.25)")}
        />
      </div>

      {/* Confirmation checkbox */}
      <div
        onClick={() => stage3Done && setConfirm(p => !p)}
        style={{
          display: "flex", alignItems: "flex-start", gap: "12px",
          padding: "14px 16px", marginBottom: "20px",
          background: confirm ? "rgba(197,160,89,0.08)" : "rgba(255,255,255,0.04)",
          border: `1.5px solid ${confirm ? "rgba(197,160,89,0.35)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: "10px", cursor: stage3Done ? "pointer" : "not-allowed",
        }}
      >
        <div style={{
          width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0,
          background: confirm ? "var(--gold)" : "rgba(255,255,255,0.08)",
          border: `2px solid ${confirm ? "var(--gold)" : "rgba(255,255,255,0.2)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.7rem", color: "#fff", marginTop: "1px",
        }}>
          {confirm ? "✓" : ""}
        </div>
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.75)", fontFamily: "Tajawal, sans-serif", lineHeight: 1.5 }}>
          أقر بأن جميع المستندات المطلوبة قد استُكملت، وأن العقد اجتاز جميع مراحل الاعتماد الأربعة، وأنني مخوّل بالتوقيع النهائي وإغلاق الملف.
        </div>
      </div>

      <button
        onClick={handleSign}
        disabled={!contractorName || !confirm || loading || !stage3Done}
        style={{
          width: "100%", padding: "15px",
          borderRadius: "12px",
          background: contractorName && confirm && stage3Done
            ? "linear-gradient(135deg, #c5a059, #a88540)"
            : "rgba(255,255,255,0.06)",
          color: contractorName && confirm && stage3Done ? "#fff" : "rgba(255,255,255,0.3)",
          border: "none",
          fontSize: "0.9rem", fontWeight: 800, fontFamily: "Tajawal, sans-serif",
          cursor: contractorName && confirm && stage3Done ? "pointer" : "not-allowed",
          boxShadow: contractorName && confirm && stage3Done ? "0 6px 24px rgba(197,160,89,0.35)" : "none",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          transition: "all 0.2s",
        }}
      >
        <span>🖊️</span>
        {loading ? "جارٍ التوقيع والأرشفة..." : "توقيع العقد وأرشفته نهائياً"}
      </button>
    </div>
  );
}
