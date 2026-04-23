import type { Contract, ContractDetail as ContractDetailType } from "../contractTypes";

interface Props {
  contract: ContractDetailType;
  onAction: (action: string, note?: string) => Promise<void>;
}

export default function Stage1SectorAdmin({ contract: detail, onAction }: Props) {
  const c = detail.contract;
  const alreadyApproved = c.s1SectorApproved === "approved";

  return (
    <div style={{ padding: "0" }}>
      <div style={{
        padding: "18px 22px", marginBottom: "16px",
        background: "rgba(26,107,154,0.12)", border: "1px solid rgba(26,107,154,0.3)",
        borderRadius: "12px",
      }}>
        <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: "0 0 4px" }}>
          ✅ صلاحية مدير القطاع — المصادقة الفنية
        </h4>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: "Tajawal, sans-serif" }}>
          راجع طلب التعاقد وأعطِ اعتمادك المبدئي أو أعده للمراجعة
        </p>
      </div>

      {/* Contract Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        {[
          ["العنوان",       c.title],
          ["المحفظة",      c.portfolio],
          ["المشروع",      c.project],
          ["نوع الأعمال",  c.workType],
          ["النطاق الفني", c.technicalScope],
          ["أنشأه",        c.createdBy],
        ].map(([label, val]) => (
          <div key={label} style={{
            padding: "12px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px",
          }}>
            <div style={{ fontSize: "0.63rem", color: "rgba(197,160,89,0.7)", fontFamily: "Tajawal, sans-serif", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "0.8rem", color: "#fff", fontFamily: "Tajawal, sans-serif", fontWeight: 600 }}>{val}</div>
          </div>
        ))}
      </div>

      {alreadyApproved ? (
        <div style={{
          padding: "16px", background: "rgba(39,174,96,0.12)",
          border: "1px solid rgba(39,174,96,0.3)", borderRadius: "10px",
          fontSize: "0.82rem", color: "#27ae60", fontFamily: "Tajawal, sans-serif", fontWeight: 700,
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          ✓ تم الاعتماد المبدئي من مدير القطاع
        </div>
      ) : (
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => onAction("sector_approve", "اعتماد مبدئي من مدير القطاع")}
            style={{
              flex: 1, padding: "13px", borderRadius: "12px",
              background: "linear-gradient(135deg, #27ae60, #1e8449)",
              color: "#fff", border: "none",
              fontSize: "0.85rem", fontWeight: 700, fontFamily: "Tajawal, sans-serif",
              cursor: "pointer", boxShadow: "0 4px 16px rgba(39,174,96,0.25)",
            }}
          >
            ✓ اعتماد مبدئي
          </button>
          <button
            onClick={() => onAction("reject", "إعادة للمراجعة من مدير القطاع")}
            style={{
              flex: 1, padding: "13px", borderRadius: "12px",
              background: "rgba(231,76,60,0.12)",
              color: "#e74c3c", border: "1px solid rgba(231,76,60,0.3)",
              fontSize: "0.85rem", fontWeight: 700, fontFamily: "Tajawal, sans-serif",
              cursor: "pointer",
            }}
          >
            ↩ إعادة للمراجعة
          </button>
        </div>
      )}
    </div>
  );
}
