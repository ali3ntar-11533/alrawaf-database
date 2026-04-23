import type { ContractDetail as ContractDetailType } from "../contractTypes";
import { STAGE_LABELS } from "../contractTypes";

interface Props {
  contract: ContractDetailType;
  onAction: (action: string, note?: string) => Promise<void>;
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export default function Stage3ComplianceAdmin({ contract: detail, onAction }: Props) {
  const c = detail.contract;
  const alreadyApproved = c.s3ComplianceLight === "approved";

  /* Gather per-stage signatories from audit log */
  const stageSigners = [1, 2].map(stage => {
    const entries = detail.log.filter(l => l.stage === stage);
    const lastEntry = entries[entries.length - 1];
    return {
      stage,
      signer: lastEntry?.adminName ?? "—",
      role:   lastEntry?.adminRole ?? "—",
      at:     lastEntry?.createdAt ?? "",
      elapsed: detail.log.length > 1
        ? daysBetween(detail.contract.createdAt, lastEntry?.createdAt ?? detail.contract.createdAt)
        : 0,
    };
  });

  const allPriorComplete = c.stage1Status === "approved" && c.stage2Status === "approved";

  return (
    <div>
      <div style={{
        padding: "18px 22px", marginBottom: "20px",
        background: "rgba(123,45,139,0.12)", border: "1px solid rgba(123,45,139,0.3)",
        borderRadius: "12px",
      }}>
        <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: "0 0 4px" }}>
          🚦 أدمن اعتماد الإجراءات — شرطي المرور
        </h4>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: "Tajawal, sans-serif" }}>
          تحقق من اكتمال جميع مراحل العقد السابقة قبل إعطاء الضوء الأخضر للرئاسة
        </p>
      </div>

      {/* ── Stage Completion Checklist ── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(197,160,89,0.8)", marginBottom: "12px", fontFamily: "Tajawal, sans-serif" }}>
          قائمة مراجعة المراحل السابقة
        </div>
        {[
          { stage: 1, label: "البوابة الفنية",           statusField: c.stage1Status },
          { stage: 2, label: "الضبط المالي والصياغة",   statusField: c.stage2Status },
        ].map(row => {
          const done = row.statusField === "approved";
          const signer = stageSigners.find(s => s.stage === row.stage);
          return (
            <div key={row.stage} style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "14px 16px", marginBottom: "8px",
              background: done ? "rgba(39,174,96,0.08)" : "rgba(231,76,60,0.08)",
              border: `1px solid ${done ? "rgba(39,174,96,0.25)" : "rgba(231,76,60,0.25)"}`,
              borderRadius: "10px",
            }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                background: done ? "#27ae60" : "#e74c3c",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.78rem", color: "#fff",
              }}>
                {done ? "✓" : "✗"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff", fontFamily: "Tajawal, sans-serif" }}>
                  المرحلة {row.stage} — {row.label}
                </div>
                {done && signer?.signer !== "—" && (
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "2px", fontFamily: "Tajawal, sans-serif" }}>
                    بواسطة: {signer?.signer} — منذ {signer?.elapsed} يوم
                  </div>
                )}
              </div>
              <span style={{
                fontSize: "0.68rem", fontWeight: 700,
                color: done ? "#27ae60" : "#e74c3c",
                fontFamily: "Tajawal, sans-serif",
              }}>
                {done ? "مكتمل" : "غير مكتمل"}
              </span>
            </div>
          );
        })}
      </div>

      {!allPriorComplete && (
        <div style={{
          padding: "14px", marginBottom: "16px",
          background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)",
          borderRadius: "10px", fontSize: "0.78rem", color: "#e74c3c",
          fontFamily: "Tajawal, sans-serif",
        }}>
          ⚠️ لا يمكن إعطاء الضوء الأخضر قبل اكتمال المراحل السابقة
        </div>
      )}

      {alreadyApproved ? (
        <div style={{
          padding: "14px", background: "rgba(39,174,96,0.12)",
          border: "1px solid rgba(39,174,96,0.3)", borderRadius: "10px",
          fontSize: "0.82rem", color: "#27ae60", fontFamily: "Tajawal, sans-serif", fontWeight: 700,
        }}>🟢 تم إعطاء الضوء الأخضر للرئاسة</div>
      ) : (
        <button
          onClick={() => onAction("compliance_approve", "ضوء أخضر من مسؤول الامتثال — جميع المراحل مكتملة")}
          disabled={!allPriorComplete}
          style={{
            width: "100%", padding: "13px", borderRadius: "12px",
            background: allPriorComplete
              ? "linear-gradient(135deg, #27ae60, #1e8449)"
              : "rgba(255,255,255,0.06)",
            color: allPriorComplete ? "#fff" : "rgba(255,255,255,0.3)",
            border: "none",
            fontSize: "0.85rem", fontWeight: 700, fontFamily: "Tajawal, sans-serif",
            cursor: allPriorComplete ? "pointer" : "not-allowed",
          }}
        >
          🟢 إعطاء الضوء الأخضر للرئاسة
        </button>
      )}
    </div>
  );
}
