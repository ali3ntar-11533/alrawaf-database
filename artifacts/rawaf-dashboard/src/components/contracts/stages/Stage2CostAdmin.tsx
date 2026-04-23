import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ContractDetail as ContractDetailType } from "../contractTypes";

interface Props {
  contract: ContractDetailType;
  onAction: (action: string, note?: string, extra?: any) => Promise<void>;
}

export default function Stage2CostAdmin({ contract: detail, onAction }: Props) {
  const c = detail.contract;
  const alreadyApproved = c.s2CostApproved === "approved";

  const [budgetAllocated, setBudgetAllocated] = useState(c.budgetAllocated || 5_000_000);
  const [budgetConsumed,  setBudgetConsumed]  = useState(c.budgetConsumed  || 2_000_000);
  const [loading, setLoading] = useState(false);

  const contractVal = c.contractValue;
  const remaining   = budgetAllocated - budgetConsumed - contractVal;

  const chartData = [
    { name: "مصروف سابقاً",   value: budgetConsumed,  color: "#2980b9" },
    { name: "هذا العقد",       value: contractVal,     color: "#c5a059" },
    { name: "المتبقي بعد العقد", value: Math.max(0, remaining), color: "rgba(39,174,96,0.8)" },
  ];

  function fmt(n: number) {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n);
  }

  async function handleApprove() {
    setLoading(true);
    try {
      await onAction("cost_approve", "اعتماد ربط العقد بالميزانية", {
        budgetAllocated, budgetConsumed,
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
          📊 أدمن التكاليف والـ PMO — ربط العقد بالميزانية
        </h4>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: "Tajawal, sans-serif" }}>
          راجع تأثير هذا العقد على الميزانية الكلية للمشروع قبل الموافقة
        </p>
      </div>

      {/* ── Input fields ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "24px" }}>
        {[
          ["الميزانية الكلية للمشروع", budgetAllocated, setBudgetAllocated],
          ["المبلغ المصروف حتى الآن",  budgetConsumed,  setBudgetConsumed],
          ["قيمة هذا العقد (ثابت)",   contractVal,     null],
        ].map(([label, val, setter]: any) => (
          <div key={label as string}>
            <div style={{ fontSize: "0.68rem", color: "rgba(197,160,89,0.7)", fontFamily: "Tajawal, sans-serif", marginBottom: "6px" }}>{label}</div>
            <input
              type="number"
              value={val}
              onChange={setter ? (e: any) => setter(Number(e.target.value)) : undefined}
              readOnly={!setter}
              style={{
                width: "100%", padding: "10px 12px",
                background: setter ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                border: "1px solid rgba(197,160,89,0.2)",
                borderRadius: "10px", fontSize: "0.82rem",
                fontFamily: "Tajawal, sans-serif", color: setter ? "#fff" : "rgba(197,160,89,0.8)",
                outline: "none", boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", marginTop: "4px", fontFamily: "Tajawal, sans-serif" }}>
              {fmt(val as number)}
            </div>
          </div>
        ))}
      </div>

      {/* ── Pie Chart ── */}
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px", padding: "20px", marginBottom: "20px",
      }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(197,160,89,0.8)", marginBottom: "16px", fontFamily: "Tajawal, sans-serif" }}>
          توزيع الميزانية بعد إضافة العقد
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip
              formatter={(v: any) => fmt(v)}
              contentStyle={{ background: "rgba(15,34,64,0.95)", border: "1px solid rgba(197,160,89,0.2)", borderRadius: "8px", fontFamily: "Tajawal, sans-serif" }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend
              formatter={(value) => <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.8)", fontFamily: "Tajawal, sans-serif" }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Alert if over budget */}
        {remaining < 0 && (
          <div style={{
            padding: "10px 14px",
            background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.3)",
            borderRadius: "8px", fontSize: "0.78rem", color: "#e74c3c",
            fontFamily: "Tajawal, sans-serif", marginTop: "12px",
          }}>
            ⚠️ تحذير: قيمة العقد تتجاوز الميزانية المتبقية بـ {fmt(Math.abs(remaining))}
          </div>
        )}
      </div>

      {alreadyApproved ? (
        <div style={{
          padding: "14px", background: "rgba(39,174,96,0.12)",
          border: "1px solid rgba(39,174,96,0.3)", borderRadius: "10px",
          fontSize: "0.82rem", color: "#27ae60", fontFamily: "Tajawal, sans-serif", fontWeight: 700,
        }}>✓ تم اعتماد الميزانية من أدمن التكاليف</div>
      ) : (
        <button onClick={handleApprove} disabled={loading} style={{
          width: "100%", padding: "13px", borderRadius: "12px",
          background: loading ? "rgba(15,102,72,0.3)" : "linear-gradient(135deg, #0f6648, #0a4a33)",
          color: "#fff", border: "none",
          fontSize: "0.85rem", fontWeight: 700, fontFamily: "Tajawal, sans-serif",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 14px rgba(15,102,72,0.3)",
        }}>
          {loading ? "جارٍ الاعتماد..." : "✓ اعتماد ربط العقد بالميزانية"}
        </button>
      )}
    </div>
  );
}
