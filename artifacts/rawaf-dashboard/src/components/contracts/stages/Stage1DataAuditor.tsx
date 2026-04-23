import { useState } from "react";
import type { ContractDetail as ContractDetailType } from "../contractTypes";

interface Props {
  contract: ContractDetailType;
  onAction: (action: string, note?: string) => Promise<void>;
}

const DOCS = [
  { key: "cr",    label: "السجل التجاري",     sub: "التحقق من صحة السجل وتاريخ انتهائه" },
  { key: "tax",   label: "الشهادة الضريبية",   sub: "التحقق من رقم التسجيل الضريبي" },
  { key: "zakat", label: "شهادة الزكاة",       sub: "التحقق من سريان شهادة زكاة المقاول" },
];

export default function Stage1DataAuditor({ contract: detail, onAction }: Props) {
  const c = detail.contract;
  const alreadySealed = c.s1AuditorSealed === "sealed";
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = DOCS.every(d => checked[d.key]);
  const [loading, setLoading] = useState(false);

  async function handleSeal() {
    if (!allChecked) return;
    setLoading(true);
    try {
      await onAction("auditor_seal", "ختم رقمي أخضر — تم التحقق من جميع المستندات");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{
        padding: "18px 22px", marginBottom: "20px",
        background: "rgba(26,107,154,0.12)", border: "1px solid rgba(26,107,154,0.3)",
        borderRadius: "12px",
      }}>
        <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: "0 0 4px" }}>
          🔍 صلاحية مراجع البيانات — التحقق من المستندات
        </h4>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: "Tajawal, sans-serif" }}>
          تحقق من صحة كل مستند ثم أعطِ الختم الرقمي الأخضر للانتقال للمرحلة المالية
        </p>
      </div>

      {alreadySealed ? (
        <div style={{
          padding: "20px", background: "rgba(39,174,96,0.12)",
          border: "1px solid rgba(39,174,96,0.3)", borderRadius: "12px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🟢</div>
          <div style={{ fontSize: "0.88rem", color: "#27ae60", fontWeight: 800, fontFamily: "Tajawal, sans-serif" }}>
            الختم الرقمي الأخضر مُطبَّق
          </div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "4px", fontFamily: "Tajawal, sans-serif" }}>
            جميع المستندات تم التحقق منها — العقد منتقل للمرحلة المالية
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            {DOCS.map(doc => {
              const isChecked = !!checked[doc.key];
              return (
                <div
                  key={doc.key}
                  onClick={() => setChecked(p => ({ ...p, [doc.key]: !p[doc.key] }))}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "16px 18px", borderRadius: "12px",
                    background: isChecked ? "rgba(39,174,96,0.10)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${isChecked ? "rgba(39,174,96,0.35)" : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer", transition: "all 0.18s",
                  }}
                >
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0,
                    background: isChecked ? "#27ae60" : "rgba(255,255,255,0.08)",
                    border: `2px solid ${isChecked ? "#27ae60" : "rgba(255,255,255,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", color: "#fff", transition: "all 0.15s",
                  }}>
                    {isChecked ? "✓" : ""}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: isChecked ? "#27ae60" : "#fff", fontFamily: "Tajawal, sans-serif" }}>
                      {doc.label}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", marginTop: "2px", fontFamily: "Tajawal, sans-serif" }}>
                      {doc.sub}
                    </div>
                  </div>
                  {isChecked && <span style={{ fontSize: "1rem" }}>✅</span>}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSeal}
            disabled={!allChecked || loading}
            style={{
              width: "100%", padding: "15px",
              borderRadius: "12px",
              background: allChecked
                ? "linear-gradient(135deg, #27ae60, #1e8449)"
                : "rgba(255,255,255,0.06)",
              color: allChecked ? "#fff" : "rgba(255,255,255,0.3)",
              border: allChecked ? "none" : "1px solid rgba(255,255,255,0.1)",
              fontSize: "0.88rem", fontWeight: 800,
              fontFamily: "Tajawal, sans-serif", cursor: allChecked ? "pointer" : "not-allowed",
              boxShadow: allChecked ? "0 4px 20px rgba(39,174,96,0.3)" : "none",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <span>{allChecked ? "🟢" : "⚫"}</span>
            {loading ? "جارٍ الختم..." : allChecked ? "تطبيق الختم الرقمي الأخضر" : `يُرجى التحقق من ${DOCS.filter(d => !checked[d.key]).length} مستندات متبقية`}
          </button>
        </>
      )}
    </div>
  );
}
