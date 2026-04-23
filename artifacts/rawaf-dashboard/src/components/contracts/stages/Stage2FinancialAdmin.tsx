import { useState } from "react";
import type { ContractDetail as ContractDetailType } from "../contractTypes";

interface Props {
  contract: ContractDetailType;
  onAction: (action: string, note?: string, extra?: any) => Promise<void>;
}

export default function Stage2FinancialAdmin({ contract: detail, onAction }: Props) {
  const c = detail.contract;
  const alreadySigned = c.s2FinanceSigned === "signed";

  const [paymentTerms, setPaymentTerms] = useState(
    c.paymentTerms ?? "20% عند توقيع العقد، 30% عند إتمام 50% من الأعمال، 40% عند الإنجاز، 10% بعد انتهاء فترة الضمان"
  );
  const [guaranteePct, setGuaranteePct] = useState(c.guaranteePct ?? 10);
  const [installments, setInstallments] = useState([
    { label: "عند توقيع العقد",      pct: 20 },
    { label: "عند إتمام 50% من الأعمال", pct: 30 },
    { label: "عند الإنجاز الكامل",   pct: 40 },
    { label: "بعد انتهاء فترة الضمان", pct: 10 },
  ]);
  const [loading, setLoading] = useState(false);

  const totalPct = installments.reduce((s, i) => s + i.pct, 0);
  const contractVal = c.contractValue;

  function fmt(v: number) {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(v);
  }

  async function handleSign() {
    setLoading(true);
    try {
      await onAction("finance_sign", "توقيع مالي — تمت مراجعة شروط الدفع والضمانات", {
        paymentTerms,
        guaranteePct,
      });
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{
        padding: "18px 22px", marginBottom: "20px",
        background: "rgba(15,102,72,0.12)", border: "1px solid rgba(15,102,72,0.3)",
        borderRadius: "12px",
      }}>
        <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff", fontFamily: "Tajawal, sans-serif", margin: "0 0 4px" }}>
          💰 أدمن المراجعة المالية — شروط الدفع والضمانات
        </h4>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: "Tajawal, sans-serif" }}>
          ضع توقيعك المالي بعد التحقق من جدول الدفعات ونسبة الضمان
        </p>
      </div>

      {/* ── Installments Table ── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(197,160,89,0.8)", fontFamily: "Tajawal, sans-serif", marginBottom: "12px" }}>
          جدول الدفعات
        </div>
        {installments.map((inst, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "10px 14px", marginBottom: "8px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "10px",
          }}>
            <div style={{ flex: 1, fontSize: "0.78rem", color: "#fff", fontFamily: "Tajawal, sans-serif" }}>
              {inst.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="number"
                value={inst.pct}
                onChange={e => setInstallments(p => p.map((x, j) => j === i ? { ...x, pct: Number(e.target.value) } : x))}
                disabled={alreadySigned}
                style={{
                  width: "60px", padding: "5px 8px",
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(197,160,89,0.2)",
                  borderRadius: "7px", fontSize: "0.78rem", color: "#fff",
                  fontFamily: "Tajawal, sans-serif", outline: "none", textAlign: "center",
                }}
              />
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", fontFamily: "Tajawal, sans-serif" }}>%</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--gold)", fontFamily: "Tajawal, sans-serif", minWidth: "110px", textAlign: "left" }}>
              {fmt(contractVal * inst.pct / 100)}
            </div>
          </div>
        ))}

        {/* Total row */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "10px 14px",
          background: totalPct === 100 ? "rgba(39,174,96,0.08)" : "rgba(231,76,60,0.08)",
          border: `1px solid ${totalPct === 100 ? "rgba(39,174,96,0.25)" : "rgba(231,76,60,0.25)"}`,
          borderRadius: "10px",
        }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: totalPct === 100 ? "#27ae60" : "#e74c3c", fontFamily: "Tajawal, sans-serif" }}>
            المجموع: {totalPct}%
          </span>
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", fontFamily: "Tajawal, sans-serif" }}>
            {totalPct === 100 ? "✓ مكتمل 100%" : "⚠️ يجب أن يكون المجموع 100%"}
          </span>
        </div>
      </div>

      {/* ── Guarantee ── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(197,160,89,0.8)", fontFamily: "Tajawal, sans-serif", marginBottom: "8px" }}>
          نسبة الضمان البنكي
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="number"
            value={guaranteePct}
            onChange={e => setGuaranteePct(Number(e.target.value))}
            disabled={alreadySigned}
            style={{
              width: "80px", padding: "9px 12px",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(197,160,89,0.2)",
              borderRadius: "10px", fontSize: "0.88rem", color: "#fff",
              fontFamily: "Tajawal, sans-serif", outline: "none", textAlign: "center",
            }}
          />
          <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", fontFamily: "Tajawal, sans-serif" }}>
            % = {fmt(contractVal * guaranteePct / 100)}
          </span>
        </div>
      </div>

      {alreadySigned ? (
        <div style={{
          padding: "14px", background: "rgba(39,174,96,0.12)",
          border: "1px solid rgba(39,174,96,0.3)", borderRadius: "10px",
          fontSize: "0.82rem", color: "#27ae60", fontFamily: "Tajawal, sans-serif", fontWeight: 700,
        }}>✓ التوقيع المالي مُطبَّق</div>
      ) : (
        <button
          onClick={handleSign}
          disabled={loading || totalPct !== 100}
          style={{
            width: "100%", padding: "13px", borderRadius: "12px",
            background: totalPct === 100 ? "linear-gradient(135deg, #0f6648, #0a4a33)" : "rgba(255,255,255,0.06)",
            color: totalPct === 100 ? "#fff" : "rgba(255,255,255,0.3)", border: "none",
            fontSize: "0.85rem", fontWeight: 700, fontFamily: "Tajawal, sans-serif",
            cursor: totalPct === 100 ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "جارٍ التوقيع..." : "✍️ وضع التوقيع المالي"}
        </button>
      )}
    </div>
  );
}
