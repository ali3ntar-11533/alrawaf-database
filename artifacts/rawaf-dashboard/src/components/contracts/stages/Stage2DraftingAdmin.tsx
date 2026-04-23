import { useState, useEffect } from "react";
import type { ContractDetail as ContractDetailType, ContractClause } from "../contractTypes";
import { tafqit } from "../contractTypes";

interface Props {
  contract: ContractDetailType;
  onAction: (action: string, note?: string) => Promise<void>;
  onSaveClauses: (clauses: { clauseOrder: number; clauseText: string }[]) => Promise<void>;
}

export default function Stage2DraftingAdmin({ contract: detail, onAction, onSaveClauses }: Props) {
  const c = detail.contract;
  const alreadySaved = c.s2DraftSaved === "saved";
  const [clauses, setClauses] = useState<ContractClause[]>(detail.clauses ?? []);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(alreadySaved);

  useEffect(() => { setClauses(detail.clauses ?? []); }, [detail.clauses]);

  async function handleSave() {
    setLoading(true);
    try {
      await onSaveClauses(clauses.map(cl => ({ clauseOrder: cl.clauseOrder, clauseText: cl.clauseText })));
      await onAction("save_draft", "تم حفظ صياغة العقد");
      setSaved(true);
    } finally { setLoading(false); }
  }

  function addClause() {
    setClauses(p => [...p, {
      id: Date.now(),
      contractId: c.id,
      clauseOrder: p.length + 1,
      clauseText: "",
      updatedAt: new Date().toISOString(),
    }]);
  }

  return (
    <div>
      <div style={{
        padding: "18px 22px", marginBottom: "20px",
        background: "rgba(15,102,72,0.12)", border: "1px solid rgba(15,102,72,0.3)",
        borderRadius: "12px",
      }}>
        <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: "0 0 4px" }}>
          📝 أدمن قسم العقود — محرر العقد الذكي
        </h4>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: "Tajawal, sans-serif" }}>
          حرر بنود العقد وفق نماذج الرواف المعتمدة
        </p>
      </div>

      {/* ── تفقيط Panel ── */}
      <div style={{
        padding: "14px 18px", marginBottom: "20px",
        background: "rgba(197,160,89,0.08)", border: "1px solid rgba(197,160,89,0.2)",
        borderRadius: "12px",
      }}>
        <div style={{ fontSize: "0.68rem", color: "rgba(197,160,89,0.7)", fontFamily: "Tajawal, sans-serif", marginBottom: "6px" }}>
          التفقيط المالي — قيمة العقد بالأحرف
        </div>
        <div style={{
          fontSize: "0.82rem", color: "var(--gold)", fontWeight: 700,
          fontFamily: "Tajawal, sans-serif", lineHeight: 1.6,
          padding: "8px 12px", background: "rgba(197,160,89,0.07)", borderRadius: "8px",
        }}>
          {tafqit(c.contractValue)}
        </div>
        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "6px", fontFamily: "Tajawal, sans-serif" }}>
          الرقم: {new Intl.NumberFormat("ar-SA").format(c.contractValue)} ريال سعودي
        </div>
      </div>

      {/* ── Clauses Editor ── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(197,160,89,0.8)", fontFamily: "Tajawal, sans-serif" }}>
            بنود العقد ({clauses.length} بند)
          </div>
          {!saved && (
            <button onClick={addClause} style={{
              background: "rgba(197,160,89,0.1)", color: "rgba(197,160,89,0.85)",
              border: "1px solid rgba(197,160,89,0.25)", borderRadius: "8px",
              padding: "4px 12px", fontSize: "0.68rem", fontFamily: "Tajawal, sans-serif", cursor: "pointer",
            }}>+ بند جديد</button>
          )}
        </div>

        {clauses.map((cl, i) => (
          <div key={cl.id} style={{
            marginBottom: "12px", padding: "14px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px", borderRight: "3px solid rgba(197,160,89,0.4)",
          }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{
                fontSize: "0.68rem", color: "rgba(197,160,89,0.6)", fontWeight: 700,
                fontFamily: "Tajawal, sans-serif", flexShrink: 0, marginTop: "4px",
              }}>
                البند {i + 1}
              </span>
              <textarea
                value={cl.clauseText}
                onChange={e => setClauses(p => p.map((c2, j) => j === i ? { ...c2, clauseText: e.target.value } : c2))}
                disabled={saved}
                rows={3}
                style={{
                  flex: 1, padding: "8px 12px",
                  background: saved ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(197,160,89,0.2)", borderRadius: "8px",
                  fontSize: "0.78rem", fontFamily: "Tajawal, sans-serif",
                  direction: "rtl", color: "#fff", outline: "none", resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {saved ? (
        <div style={{
          padding: "14px", background: "rgba(39,174,96,0.12)",
          border: "1px solid rgba(39,174,96,0.3)", borderRadius: "10px",
          fontSize: "0.82rem", color: "#27ae60", fontFamily: "Tajawal, sans-serif", fontWeight: 700,
        }}>✓ تم حفظ صياغة العقد</div>
      ) : (
        <button onClick={handleSave} disabled={loading} style={{
          width: "100%", padding: "13px", borderRadius: "12px",
          background: loading ? "rgba(15,102,72,0.3)" : "linear-gradient(135deg, #0f6648, #0a4a33)",
          color: "#fff", border: "none",
          fontSize: "0.85rem", fontWeight: 700, fontFamily: "Tajawal, sans-serif",
          cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "جارٍ الحفظ..." : "💾 حفظ صياغة العقد"}
        </button>
      )}
    </div>
  );
}
