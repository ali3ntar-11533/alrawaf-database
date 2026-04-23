import { useEffect, useState } from "react";
import type { AdminRole, ContractDetail as ContractDetailType } from "./contractTypes";
import { ROLE_DEFS, STAGE_LABELS } from "./contractTypes";
import StageStepper from "./StageStepper";
import AuditTrailPanel from "./AuditTrailPanel";
import Stage1SectorAdmin from "./stages/Stage1SectorAdmin";
import Stage1DataAuditor from "./stages/Stage1DataAuditor";
import Stage2CostAdmin from "./stages/Stage2CostAdmin";
import Stage2DraftingAdmin from "./stages/Stage2DraftingAdmin";
import Stage2FinancialAdmin from "./stages/Stage2FinancialAdmin";
import Stage3ComplianceAdmin from "./stages/Stage3ComplianceAdmin";
import Stage3VCEOAdmin from "./stages/Stage3VCEOAdmin";
import Stage3CEOAdmin from "./stages/Stage3CEOAdmin";
import Stage4SignatureAdmin from "./stages/Stage4SignatureAdmin";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  contractId: number;
  role: AdminRole;
  onBack: () => void;
}

export default function ContractDetail({ contractId, role, onBack }: Props) {
  const [detail, setDetail] = useState<ContractDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDetail() {
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${contractId}`);
      if (!res.ok) throw new Error("فشل تحميل العقد");
      setDetail(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchDetail(); }, [contractId]);

  async function handleAction(action: string, note?: string, extra?: any) {
    const roleDef = ROLE_DEFS.find(r => r.key === role)!;
    const res = await fetch(`${API_BASE}/api/contracts/${contractId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, adminRole: role, adminName: roleDef.label, note, extraData: extra }),
    });
    if (!res.ok) throw new Error("فشل تنفيذ الإجراء");
    await fetchDetail();
  }

  async function handleSaveClauses(clauses: { clauseOrder: number; clauseText: string }[]) {
    const res = await fetch(`${API_BASE}/api/contracts/${contractId}/clauses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clauses }),
    });
    if (!res.ok) throw new Error("فشل حفظ البنود");
    await fetchDetail();
  }

  if (loading) return (
    <div style={{ padding: "60px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "Tajawal, sans-serif" }}>
      جارٍ التحميل...
    </div>
  );
  if (error || !detail) return (
    <div style={{ padding: "60px", textAlign: "center", color: "#e74c3c", fontFamily: "Tajawal, sans-serif" }}>
      {error || "لم يُعثر على العقد"}
    </div>
  );

  const c = detail.contract;
  const roleDef = ROLE_DEFS.find(r => r.key === role)!;

  /* Determine which stage panel to show based on role */
  function renderStagePanel() {
    switch (role) {
      case "pm_admin":
        return <InfoPanel detail={detail!} />;
      case "sector_admin":
        return <Stage1SectorAdmin contract={detail!} onAction={handleAction} />;
      case "data_auditor":
        return <Stage1DataAuditor contract={detail!} onAction={handleAction} />;
      case "cost_admin":
        return <Stage2CostAdmin contract={detail!} onAction={handleAction} />;
      case "drafting_admin":
        return <Stage2DraftingAdmin contract={detail!} onAction={handleAction} onSaveClauses={handleSaveClauses} />;
      case "financial_admin":
        return <Stage2FinancialAdmin contract={detail!} onAction={handleAction} />;
      case "compliance_admin":
        return <Stage3ComplianceAdmin contract={detail!} onAction={handleAction} />;
      case "vceo_admin":
        return <Stage3VCEOAdmin contract={detail!} onAction={handleAction} />;
      case "ceo_admin":
        return <Stage3CEOAdmin contract={detail!} onAction={handleAction} />;
      case "signature_admin":
        return <Stage4SignatureAdmin contract={detail!} onAction={handleAction} />;
      default:
        return <InfoPanel detail={detail!} />;
    }
  }

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* ── Back button ── */}
      <button
        onClick={onBack}
        style={{
          background: "none", border: "none", color: "rgba(197,160,89,0.7)",
          fontSize: "0.78rem", fontFamily: "Tajawal, sans-serif",
          cursor: "pointer", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px",
          padding: 0,
        }}
      >
        → العودة للقائمة
      </button>

      {/* ── Contract header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "0.72rem", color: "rgba(197,160,89,0.7)", fontFamily: "Tajawal, sans-serif", marginBottom: "4px" }}>
              {c.contractNo}
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: 0 }}>
              {c.title}
            </h2>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontFamily: "Tajawal, sans-serif", marginTop: "4px" }}>
              {c.portfolio} — {c.project}
            </div>
          </div>
          <div style={{
            padding: "6px 14px", borderRadius: "10px",
            background: "rgba(197,160,89,0.12)", border: "1px solid rgba(197,160,89,0.3)",
            fontSize: "0.8rem", fontWeight: 700, color: "var(--gold)", fontFamily: "Tajawal, sans-serif",
          }}>
            {roleDef.icon} {roleDef.label}
          </div>
        </div>
      </div>

      {/* ── Stage Stepper ── */}
      <StageStepper contract={c} />

      {/* ── Main layout: stage panel + audit trail ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px", alignItems: "start" }}>
        {/* Stage Panel */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(197,160,89,0.12)",
          borderRadius: "14px", padding: "24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>
          {renderStagePanel()}
        </div>

        {/* Audit Trail */}
        <div>
          <AuditTrailPanel log={detail.log} />
        </div>
      </div>
    </div>
  );
}

/* ── Simple Info Panel for pm_admin / readonly ── */
function InfoPanel({ detail }: { detail: ContractDetailType }) {
  const c = detail.contract;
  function fmt(v: number) {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(v);
  }
  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(197,160,89,0.8)", fontFamily: "Tajawal, sans-serif", marginBottom: "12px" }}>
          بيانات طلب التعاقد
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            ["رقم العقد",    c.contractNo],
            ["العنوان",      c.title],
            ["المحفظة",     c.portfolio],
            ["المشروع",     c.project],
            ["نوع الأعمال", c.workType],
            ["القيمة",      fmt(c.contractValue)],
            ["أنشأه",       c.createdBy],
            ["المرحلة الحالية", `${c.currentStage} — ${STAGE_LABELS[c.currentStage]}`],
          ].map(([k, v]) => (
            <div key={k} style={{
              padding: "10px 14px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
            }}>
              <div style={{ fontSize: "0.62rem", color: "rgba(197,160,89,0.6)", fontFamily: "Tajawal, sans-serif", marginBottom: "4px" }}>{k}</div>
              <div style={{ fontSize: "0.8rem", color: "#fff", fontFamily: "Tajawal, sans-serif", fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {c.technicalScope && (
        <div style={{
          padding: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
        }}>
          <div style={{ fontSize: "0.62rem", color: "rgba(197,160,89,0.6)", fontFamily: "Tajawal, sans-serif", marginBottom: "6px" }}>النطاق الفني</div>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)", fontFamily: "Tajawal, sans-serif", lineHeight: 1.6 }}>{c.technicalScope}</div>
        </div>
      )}
    </div>
  );
}
