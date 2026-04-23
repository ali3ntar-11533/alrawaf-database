import { useEffect, useState } from "react";
import type { AdminRole, Contract } from "./contractTypes";
import { ROLE_DEFS, STAGE_LABELS } from "./contractTypes";
import ContractsList from "./ContractsList";
import ContractDetail from "./ContractDetail";
import Stage1PMAdmin from "./stages/Stage1PMAdmin";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ContractsPage() {
  const [role, setRole] = useState<AdminRole>("pm_admin");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "detail" | "create">("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function fetchContracts() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contracts`);
      if (res.ok) setContracts(await res.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchContracts(); }, []);

  async function handleCreate(data: any) {
    const res = await fetch(`${API_BASE}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("فشل إنشاء طلب التعاقد");
    const created = await res.json();
    await fetchContracts();
    setSelectedId(created.id);
    setView("detail");
  }

  /* Pending count for badge */
  const pendingCount = contracts.filter(c => c.currentStatus === "pending").length;
  const archivedCount = contracts.filter(c => c.currentStatus === "archived").length;
  const inProgressCount = contracts.length - pendingCount - archivedCount;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a1929 0%, #0f2240 50%, #0a1929 100%)",
      fontFamily: "Tajawal, sans-serif",
      direction: "rtl",
    }}>
      {/* ── Top Bar ── */}
      <div style={{
        background: "rgba(15,34,64,0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(197,160,89,0.15)",
        padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Title */}
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
            منصة إدارة العقود الرقمية
          </div>
          <div style={{ fontSize: "0.7rem", color: "rgba(197,160,89,0.7)", marginTop: "2px" }}>
            شركة الرواف للمقاولات — نظام متعدد المراحل
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {[
            { label: "الكل",       value: contracts.length, color: "#fff" },
            { label: "قيد التنفيذ", value: inProgressCount,  color: "#c5a059" },
            { label: "مؤرشف",     value: archivedCount,     color: "#27ae60" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Role Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>الدور الوظيفي:</span>
          <select
            value={role}
            onChange={e => { setRole(e.target.value as AdminRole); setView("list"); setSelectedId(null); }}
            style={{
              background: "rgba(197,160,89,0.1)", border: "1px solid rgba(197,160,89,0.3)",
              borderRadius: "10px", padding: "7px 12px",
              color: "#fff", fontSize: "0.78rem", fontFamily: "Tajawal, sans-serif",
              cursor: "pointer", outline: "none", direction: "rtl",
            }}
          >
            {ROLE_DEFS.map(r => (
              <option key={r.key} value={r.key} style={{ background: "#0f2240" }}>
                {r.icon} {r.label} (م{r.stage})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Stage Tabs (4 stages) ── */}
      <div style={{
        display: "flex", gap: "0", padding: "0 32px",
        borderBottom: "1px solid rgba(197,160,89,0.1)",
        overflowX: "auto",
      }}>
        {[1, 2, 3, 4].map(s => {
          const stageDefs = ROLE_DEFS.filter(r => r.stage === s);
          const isActive  = stageDefs.some(r => r.key === role);
          const colors    = { 1: "#1a6b9a", 2: "#0f6648", 3: "#7b2d8b", 4: "#8b3a1f" };
          const count     = contracts.filter(c => c.currentStage === s && c.currentStatus === "pending").length;
          return (
            <div
              key={s}
              style={{
                padding: "12px 24px", cursor: "pointer",
                borderBottom: isActive ? `3px solid ${(colors as any)[s]}` : "3px solid transparent",
                background: isActive ? `rgba(${s===1?"26,107,154":s===2?"15,102,72":s===3?"123,45,139":"139,58,31"},0.08)` : "transparent",
                transition: "all 0.18s", whiteSpace: "nowrap",
              }}
              onClick={() => {
                const defaultRole = stageDefs[0].key;
                setRole(defaultRole); setView("list"); setSelectedId(null);
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: isActive ? 700 : 500, color: isActive ? "#fff" : "rgba(255,255,255,0.4)" }}>
                المرحلة {s}: {STAGE_LABELS[s]}
              </div>
              {count > 0 && (
                <div style={{
                  display: "inline-block", marginTop: "3px",
                  background: (colors as any)[s],
                  color: "#fff", borderRadius: "10px", padding: "1px 8px",
                  fontSize: "0.6rem", fontWeight: 700,
                }}>
                  {count} ينتظر
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Role sub-tabs ── */}
      <div style={{
        display: "flex", gap: "8px", padding: "12px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflowX: "auto",
      }}>
        {ROLE_DEFS.filter(r => r.stage === ROLE_DEFS.find(rd => rd.key === role)!.stage).map(r => (
          <button
            key={r.key}
            onClick={() => { setRole(r.key); setView("list"); setSelectedId(null); }}
            style={{
              padding: "6px 14px", borderRadius: "20px",
              background: r.key === role ? "rgba(197,160,89,0.18)" : "rgba(255,255,255,0.05)",
              border: r.key === role ? "1.5px solid rgba(197,160,89,0.45)" : "1px solid rgba(255,255,255,0.08)",
              color: r.key === role ? "var(--gold)" : "rgba(255,255,255,0.5)",
              fontFamily: "Tajawal, sans-serif", fontSize: "0.72rem", fontWeight: r.key === role ? 700 : 400,
              cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
            }}
          >
            {r.icon} {r.label}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        borderRadius: "16px",
        margin: "20px 32px",
        border: "1px solid rgba(197,160,89,0.1)",
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
      }}>
        {view === "list" && (
          <ContractsList
            contracts={contracts}
            role={role}
            loading={loading}
            onSelect={c => { setSelectedId(c.id); setView("detail"); }}
            onCreate={() => setView("create")}
          />
        )}
        {view === "create" && role === "pm_admin" && (
          <Stage1PMAdmin
            onSubmit={handleCreate}
            onCancel={() => setView("list")}
          />
        )}
        {view === "detail" && selectedId !== null && (
          <ContractDetail
            contractId={selectedId}
            role={role}
            onBack={() => { setView("list"); fetchContracts(); }}
          />
        )}
      </div>
    </div>
  );
}
