import { useState } from "react";
import type { AuditLogEntry } from "./contractTypes";
import { ROLE_DEFS, STAGE_LABELS } from "./contractTypes";

const ACTION_LABELS: Record<string, string> = {
  "إنشاء طلب التعاقد":  "إنشاء طلب التعاقد",
  "sector_approve":      "اعتماد مبدئي من مدير القطاع",
  "auditor_seal":        "ختم رقمي أخضر من مراجع البيانات",
  "cost_approve":        "اعتماد التكاليف والميزانية",
  "save_draft":          "حفظ صياغة العقد",
  "finance_sign":        "توقيع مالي",
  "compliance_approve":  "ضوء أخضر من مسؤول الامتثال",
  "vceo_approve":        "اعتماد نائب الرئيس التنفيذي",
  "ceo_approve":         "الاعتماد النهائي من الرئيس التنفيذي",
  "contractor_sign":     "توقيع المقاول وأرشفة العقد",
  "reject":              "إعادة للمراجعة",
};

function roleLabel(role: string) {
  return ROLE_DEFS.find(r => r.key === role)?.label ?? role;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

export default function AuditTrailPanel({ log, defaultOpen = true }: { log: AuditLogEntry[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      background: "rgba(15,34,64,0.95)",
      border: "1px solid rgba(197,160,89,0.2)",
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
          background: "rgba(197,160,89,0.08)",
          border: "none", borderBottom: open ? "1px solid rgba(197,160,89,0.15)" : "none",
          cursor: "pointer", fontFamily: "Tajawal, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1rem" }}>📋</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--gold)" }}>سجل العمليات</span>
          <span style={{
            background: "rgba(197,160,89,0.2)", color: "var(--gold)",
            borderRadius: "10px", padding: "1px 8px", fontSize: "0.68rem", fontWeight: 700,
          }}>{log.length}</span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ maxHeight: "340px", overflowY: "auto", padding: "8px 0" }}>
          {log.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontFamily: "Tajawal, sans-serif" }}>
              لا توجد سجلات بعد
            </div>
          ) : [...log].reverse().map((entry, i) => (
            <div
              key={entry.id}
              style={{
                display: "flex", gap: "12px", padding: "10px 18px",
                borderBottom: i < log.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              {/* Timeline dot */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%",
                  background: entry.action === "reject" ? "#e74c3c" : "var(--gold)",
                  boxShadow: `0 0 6px ${entry.action === "reject" ? "#e74c3c" : "var(--gold)"}`,
                  marginTop: "4px",
                }} />
                {i < log.length - 1 && (
                  <div style={{ width: "1px", flex: 1, background: "rgba(197,160,89,0.15)", marginTop: "4px" }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff", fontFamily: "Tajawal, sans-serif" }}>
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "Tajawal, sans-serif" }}>
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "3px", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "0.65rem", color: "rgba(197,160,89,0.8)",
                    background: "rgba(197,160,89,0.08)", borderRadius: "8px",
                    padding: "1px 7px", fontFamily: "Tajawal, sans-serif",
                  }}>
                    {roleLabel(entry.adminRole)}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", fontFamily: "Tajawal, sans-serif" }}>
                    {entry.adminName}
                  </span>
                  <span style={{
                    fontSize: "0.6rem", color: "rgba(255,255,255,0.25)",
                    background: "rgba(255,255,255,0.04)", borderRadius: "8px",
                    padding: "1px 7px", fontFamily: "Tajawal, sans-serif",
                  }}>
                    المرحلة {entry.stage} — {STAGE_LABELS[entry.stage]}
                  </span>
                </div>
                {entry.note && (
                  <div style={{ marginTop: "4px", fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", fontFamily: "Tajawal, sans-serif", fontStyle: "italic" }}>
                    {entry.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
