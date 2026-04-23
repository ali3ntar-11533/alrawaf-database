import type { Contract, AdminRole } from "./contractTypes";
import { STAGE_LABELS, STATUS_LABELS, ROLE_DEFS } from "./contractTypes";

const S = {
  navy:    "#0f2240" as const,
  navyMid: "#172d52" as const,
  gold:    "#c5a059" as const,
  goldDim: "rgba(197,160,89,0.18)",
  border:  "rgba(197,160,89,0.18)",
  text:    "rgba(255,255,255,0.88)",
  dim:     "rgba(255,255,255,0.45)",
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
  } catch { return iso; }
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(v);
}

function StageChip({ stage }: { stage: number }) {
  const colors: Record<number, string> = { 1: "#1a6b9a", 2: "#0f6648", 3: "#7b2d8b", 4: "#8b3a1f" };
  return (
    <span style={{
      background: colors[stage] ?? "#333",
      color: "#fff", borderRadius: "10px", padding: "2px 10px",
      fontSize: "0.65rem", fontWeight: 700, whiteSpace: "nowrap",
      fontFamily: "Tajawal, sans-serif",
    }}>
      {STAGE_LABELS[stage] ?? `المرحلة ${stage}`}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "#888" };
  return (
    <span style={{
      color: s.color, background: `${s.color}22`,
      border: `1px solid ${s.color}44`,
      borderRadius: "10px", padding: "2px 10px",
      fontSize: "0.65rem", fontWeight: 700, whiteSpace: "nowrap",
      fontFamily: "Tajawal, sans-serif",
    }}>
      {s.label}
    </span>
  );
}

interface Props {
  contracts:    Contract[];
  role:         AdminRole;
  onSelect:     (c: Contract) => void;
  onCreate:     () => void;
  loading:      boolean;
}

export default function ContractsList({ contracts, role, onSelect, onCreate, loading }: Props) {
  const roleDef = ROLE_DEFS.find(r => r.key === role);

  /* Filter contracts relevant to this role's stage */
  const relevant = contracts.filter(c => {
    if (role === "pm_admin") return true;
    if (role === "sector_admin" || role === "data_auditor") return c.currentStage >= 1;
    if (["cost_admin", "drafting_admin", "financial_admin"].includes(role)) return c.currentStage >= 2;
    if (["compliance_admin", "vceo_admin", "ceo_admin"].includes(role)) return c.currentStage >= 3;
    if (role === "signature_admin") return c.currentStage >= 4;
    return true;
  });

  /* Count pending actions for current role */
  const pendingCount = relevant.filter(c => c.currentStatus === "pending").length;

  return (
    <div style={{ padding: "28px 32px", minHeight: "60vh" }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "24px", flexWrap: "wrap", gap: "12px",
      }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: 0 }}>
            {roleDef?.icon} {roleDef?.label}
          </h2>
          <p style={{ fontSize: "0.78rem", color: "rgba(197,160,89,0.8)", margin: "4px 0 0", fontFamily: "Tajawal, sans-serif" }}>
            {roleDef?.subtitle} — {pendingCount} عقد ينتظر إجراءك
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {pendingCount > 0 && (
            <div style={{
              background: "rgba(197,160,89,0.15)", border: "1px solid rgba(197,160,89,0.35)",
              borderRadius: "10px", padding: "6px 14px",
              fontSize: "0.75rem", color: S.gold, fontWeight: 700, fontFamily: "Tajawal, sans-serif",
            }}>
              🔔 {pendingCount} ينتظر اجراءك
            </div>
          )}
          {role === "pm_admin" && (
            <button
              onClick={onCreate}
              style={{
                background: "linear-gradient(135deg, #c5a059, #a88540)",
                color: "#fff", border: "none", borderRadius: "10px",
                padding: "9px 18px", fontSize: "0.78rem", fontWeight: 700,
                fontFamily: "Tajawal, sans-serif", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px",
                boxShadow: "0 4px 14px rgba(197,160,89,0.3)",
              }}
            >
              ＋ طلب تعاقد جديد
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.3)", fontFamily: "Tajawal, sans-serif" }}>
          جارٍ التحميل...
        </div>
      ) : relevant.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px",
          color: "rgba(255,255,255,0.3)", fontFamily: "Tajawal, sans-serif",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📄</div>
          <div style={{ fontSize: "0.85rem" }}>لا توجد عقود بعد</div>
          {role === "pm_admin" && (
            <button onClick={onCreate} style={{
              marginTop: "16px", background: "rgba(197,160,89,0.15)",
              color: S.gold, border: `1px solid ${S.border}`, borderRadius: "10px",
              padding: "9px 20px", fontSize: "0.78rem", fontWeight: 700,
              fontFamily: "Tajawal, sans-serif", cursor: "pointer",
            }}>
              أنشئ أول طلب تعاقد
            </button>
          )}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px" }}>
            <thead>
              <tr>
                {["رقم العقد", "العنوان", "المحفظة", "المشروع", "القيمة", "المرحلة الحالية", "الحالة", "التاريخ", ""].map(h => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "right",
                    fontSize: "0.68rem", fontWeight: 700, color: S.gold,
                    fontFamily: "Tajawal, sans-serif",
                    background: "rgba(197,160,89,0.06)",
                    whiteSpace: "nowrap",
                    borderBottom: "1px solid rgba(197,160,89,0.15)",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {relevant.map(c => (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c)}
                  style={{ cursor: "pointer" }}
                >
                  {[
                    c.contractNo,
                    c.title,
                    c.portfolio,
                    c.project,
                    formatCurrency(c.contractValue),
                  ].map((val, i) => (
                    <td key={i} style={{
                      padding: "13px 14px",
                      background: "rgba(255,255,255,0.04)",
                      fontSize: i === 0 ? "0.7rem" : "0.78rem",
                      color: i === 0 ? S.gold : S.text,
                      fontWeight: i === 0 ? 700 : 400,
                      fontFamily: "Tajawal, sans-serif",
                      whiteSpace: "nowrap",
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      borderRight: i === 0 ? `3px solid ${S.gold}` : undefined,
                      borderRadius: i === 0 ? "0 8px 8px 0" : undefined,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(197,160,89,0.07)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    >
                      {val}
                    </td>
                  ))}
                  <td style={{
                    padding: "13px 14px",
                    background: "rgba(255,255,255,0.04)",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <StageChip stage={c.currentStage} />
                  </td>
                  <td style={{
                    padding: "13px 14px",
                    background: "rgba(255,255,255,0.04)",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <StatusChip status={c.currentStatus} />
                  </td>
                  <td style={{
                    padding: "13px 14px",
                    background: "rgba(255,255,255,0.04)",
                    fontSize: "0.7rem", color: S.dim,
                    fontFamily: "Tajawal, sans-serif",
                    whiteSpace: "nowrap",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    {formatDate(c.createdAt)}
                  </td>
                  <td style={{
                    padding: "13px 14px",
                    background: "rgba(255,255,255,0.04)",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: "8px 0 0 8px",
                  }}>
                    <span style={{ fontSize: "0.75rem", color: "rgba(197,160,89,0.6)" }}>←</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

