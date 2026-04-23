import type { ContractDetail as ContractDetailType } from "../contractTypes";

interface Props {
  contract: ContractDetailType;
  onAction: (action: string, note?: string) => Promise<void>;
}

export default function Stage3VCEOAdmin({ contract: detail, onAction }: Props) {
  const c = detail.contract;
  const alreadyApproved = c.s3VceoApproved === "approved";
  const complianceGiven = c.s3ComplianceLight === "approved";

  function fmt(v: number) {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(v);
  }

  /* Smart Snapshot: 5 key points */
  const snapshot = [
    { icon: "📌", title: "موضوع العقد",      value: c.title },
    { icon: "💰", title: "القيمة الإجمالية",  value: fmt(c.contractValue) },
    { icon: "🏗️", title: "النطاق الفني",     value: c.technicalScope.slice(0, 120) + (c.technicalScope.length > 120 ? "..." : "") },
    { icon: "📋", title: "مسار الاعتمادات",   value: `${detail.log.length} إجراء مكتمل عبر ${c.currentStage} مراحل` },
    { icon: "🏢", title: "الجهة المستفيدة",  value: `${c.project} — ${c.portfolio}` },
  ];

  return (
    <div>
      <div style={{
        padding: "18px 22px", marginBottom: "20px",
        background: "rgba(123,45,139,0.12)", border: "1px solid rgba(123,45,139,0.3)",
        borderRadius: "12px",
      }}>
        <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: "0 0 4px" }}>
          👔 نائب الرئيس التنفيذي — الملخص الذكي
        </h4>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: "Tajawal, sans-serif" }}>
          ملخص من 5 نقاط جوهرية يختصر تفاصيل العقد
        </p>
      </div>

      {/* ── Smart Snapshot ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        {snapshot.map((item, i) => (
          <div key={i} style={{
            display: "flex", gap: "14px", alignItems: "flex-start",
            padding: "14px 18px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px", borderRight: "3px solid rgba(197,160,89,0.4)",
          }}>
            <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: "0.65rem", color: "rgba(197,160,89,0.7)", fontFamily: "Tajawal, sans-serif", marginBottom: "4px" }}>
                {item.title}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#fff", fontFamily: "Tajawal, sans-serif", fontWeight: 600, lineHeight: 1.5 }}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!complianceGiven && (
        <div style={{
          padding: "12px 14px", marginBottom: "14px",
          background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)",
          borderRadius: "10px", fontSize: "0.75rem", color: "#e74c3c",
          fontFamily: "Tajawal, sans-serif",
        }}>
          ⚠️ في انتظار الضوء الأخضر من مسؤول الامتثال
        </div>
      )}

      {alreadyApproved ? (
        <div style={{
          padding: "14px", background: "rgba(39,174,96,0.12)",
          border: "1px solid rgba(39,174,96,0.3)", borderRadius: "10px",
          fontSize: "0.82rem", color: "#27ae60", fontFamily: "Tajawal, sans-serif", fontWeight: 700,
        }}>✓ اعتماد نائب الرئيس التنفيذي مُطبَّق</div>
      ) : (
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => onAction("vceo_approve", "اعتماد من نائب الرئيس التنفيذي")}
            disabled={!complianceGiven}
            style={{
              flex: 1, padding: "13px", borderRadius: "12px",
              background: complianceGiven
                ? "linear-gradient(135deg, #7b2d8b, #5a1f66)"
                : "rgba(255,255,255,0.06)",
              color: complianceGiven ? "#fff" : "rgba(255,255,255,0.3)", border: "none",
              fontSize: "0.85rem", fontWeight: 700, fontFamily: "Tajawal, sans-serif",
              cursor: complianceGiven ? "pointer" : "not-allowed",
            }}
          >
            ✓ مراجعة واعتماد
          </button>
          <button
            onClick={() => onAction("reject", "إعادة للمراجعة من نائب الرئيس التنفيذي")}
            style={{
              flex: 1, padding: "13px", borderRadius: "12px",
              background: "rgba(231,76,60,0.1)", color: "#e74c3c",
              border: "1px solid rgba(231,76,60,0.3)",
              fontSize: "0.85rem", fontWeight: 700, fontFamily: "Tajawal, sans-serif", cursor: "pointer",
            }}
          >
            ↩ إعادة للمراجعة
          </button>
        </div>
      )}
    </div>
  );
}
