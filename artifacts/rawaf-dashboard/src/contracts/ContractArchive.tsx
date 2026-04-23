import { useEffect, useState } from "react";
import { GOLD, GOLD_BG, GOLD_BORDER } from "./types";
import type { Contract } from "./types";
import { listContracts } from "./api";

interface Props {
  onOpenContract: (id: number) => void;
}

export default function ContractArchive({ onOpenContract }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [all, setAll] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    listContracts()
      .then(cs => {
        const completed = cs.filter(c => c.status === "completed");
        setContracts(completed);
        setAll(cs);
      })
      .finally(() => setLoading(false));
  }, []);

  const types = [...new Set(all.map(c => c.contractType).filter(Boolean))];

  const filtered = contracts.filter(c => {
    const matchSearch = !search || c.title.includes(search) || c.vendorName.includes(search) || c.contractNo.includes(search);
    const matchType = !typeFilter || c.contractType === typeFilter;
    return matchSearch && matchType;
  });

  const totalValue = contracts.reduce((sum, c) => sum + c.value, 0);

  return (
    <div dir="rtl" style={{ padding: "24px 28px", fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#1a1206", marginBottom: 4 }}>
          💾 قاعدة البيانات والتقارير
        </h2>
        <p style={{ color: "#9b8060", fontSize: "0.82rem" }}>أرشيف العقود المكتملة والإحصائيات الكاملة</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "إجمالي العقود الكاملة", value: contracts.length,  icon: "📜", color: "#27ae60" },
          { label: "إجمالي جميع العقود",    value: all.length,       icon: "📋", color: GOLD     },
          { label: "إجمالي القيم (ريال)",   value: totalValue > 0 ? (totalValue / 1000).toFixed(0) + "K" : "—", icon: "💰", color: "#3498db" },
        ].map((k, i) => (
          <div key={i} style={{
            background: "#fff", borderRadius: 14, padding: "18px 16px",
            border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: "1.7rem", fontWeight: 900, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: "0.68rem", color: "#9b8060", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 بحث في الأرشيف..."
          style={{
            flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 9,
            border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
            fontFamily: "'Cairo', 'Tajawal', sans-serif", outline: "none",
          }}
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{
            padding: "9px 14px", borderRadius: 9,
            border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
            fontFamily: "'Cairo', 'Tajawal', sans-serif", background: "#fff", outline: "none",
          }}
        >
          <option value="">كل الأنواع</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#bbb" }}>جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#bbb", fontSize: "0.9rem" }}>
          لا يوجد عقود مكتملة في الأرشيف بعد
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto",
            gap: 12, padding: "12px 18px",
            background: GOLD_BG, borderBottom: `1px solid ${GOLD_BORDER}`,
            fontSize: "0.7rem", fontWeight: 800, color: "#8B6914",
          }}>
            <span>العقد</span><span>المورد</span>
            <span>النوع</span><span>القيمة</span><span>الإجراء</span>
          </div>
          {filtered.map((c, i) => (
            <div key={c.id} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto",
              gap: 12, padding: "13px 18px", alignItems: "center",
              borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
              background: i % 2 === 0 ? "#fff" : "rgba(0,0,0,0.01)",
            }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1a1206" }}>{c.title}</div>
                <div style={{ fontSize: "0.62rem", color: "#bbb" }}>{c.contractNo}</div>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#4a3520" }}>{c.vendorName}</div>
              <span style={{
                fontSize: "0.62rem", padding: "3px 8px", borderRadius: 20,
                background: GOLD_BG, color: GOLD, fontWeight: 700,
                border: `1px solid ${GOLD_BORDER}`, whiteSpace: "nowrap",
              }}>{c.contractType}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#4a3520", whiteSpace: "nowrap" }}>
                {c.value > 0 ? c.value.toLocaleString("ar-SA") : "—"}
              </span>
              <button
                onClick={() => onOpenContract(c.id)}
                style={{
                  padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${GOLD_BORDER}`,
                  background: GOLD_BG, color: "#8B6914", cursor: "pointer",
                  fontSize: "0.7rem", fontWeight: 700, fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                عرض ←
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
