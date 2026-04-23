import { useState } from "react";
import { ROLES, GOLD, GOLD_BG, GOLD_BORDER, type ContractTab } from "./types";

interface Props {
  activeTab: ContractTab;
  onTabChange: (tab: ContractTab) => void;
  pendingCount: number;
  onExit: () => void;
  role: string;
  actorName: string;
  onRoleChange: (role: string) => void;
  onNameChange: (name: string) => void;
  pendingByRole: Record<string, number>;
}

const TABS: { id: ContractTab; label: string; icon: string }[] = [
  { id: "dashboard",  label: "لوحة التحكم",             icon: "🏠" },
  { id: "requests",   label: "طلبات العقود",             icon: "📋" },
  { id: "tracking",   label: "نظام متابعة العقود",       icon: "🛡️" },
  { id: "analytics",  label: "التحليلات والتقارير",      icon: "📊" },
  { id: "archive",    label: "قاعدة البيانات",           icon: "💾" },
];

export default function ContractSidebar({
  activeTab, onTabChange, pendingCount, onExit,
  role, actorName, onRoleChange, onNameChange, pendingByRole,
}: Props) {
  const [nameEditing, setNameEditing] = useState(false);

  const myRoleInfo = ROLES.find(r => r.name === role);

  return (
    <div dir="rtl" style={{
      width: 230, flexShrink: 0,
      background: "#fff",
      borderLeft: `1px solid ${GOLD_BORDER}`,
      display: "flex", flexDirection: "column",
      height: "100%",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
      boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: "18px 14px 14px",
        borderBottom: `1px solid ${GOLD_BORDER}`,
        background: "linear-gradient(135deg, #1a1206, #2a2015)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", boxShadow: "0 3px 12px rgba(197,160,89,0.45)",
            flexShrink: 0,
          }}>🏛️</div>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
              نظام إدارة العقود
            </div>
            <div style={{ fontSize: "0.58rem", color: "rgba(197,160,89,0.7)" }}>الرواف للمقاولات</div>
          </div>
        </div>

        {/* ── Role Picker ── */}
        <div>
          <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "rgba(197,160,89,0.7)", marginBottom: 5, letterSpacing: "0.04em" }}>
            الدور الوظيفي
          </div>
          <div style={{ position: "relative" }}>
            <select
              value={role}
              onChange={e => onRoleChange(e.target.value)}
              style={{
                width: "100%", padding: "8px 10px",
                borderRadius: 8,
                border: role ? `1.5px solid rgba(197,160,89,0.5)` : "1.5px solid rgba(255,255,255,0.15)",
                background: role ? "rgba(197,160,89,0.15)" : "rgba(255,255,255,0.07)",
                color: role ? "#e8c96a" : "rgba(255,255,255,0.5)",
                fontSize: "0.72rem", fontWeight: 700,
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                appearance: "none", cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="" style={{ background: "#1a1206", color: "#9b8060" }}>
                — اختر دورك الوظيفي —
              </option>
              {ROLES.map(r => {
                const pending = pendingByRole[r.name] ?? 0;
                return (
                  <option key={r.name} value={r.name} style={{ background: "#1a1206", color: "#e8c96a" }}>
                    {r.icon} {r.name}{pending > 0 ? ` (${pending})` : ""}
                  </option>
                );
              })}
            </select>
            <span style={{
              position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
              color: "rgba(197,160,89,0.6)", fontSize: "0.6rem", pointerEvents: "none",
            }}>▾</span>
          </div>

          {role && (
            <div style={{ marginTop: 6 }}>
              {nameEditing || !actorName ? (
                <input
                  autoFocus
                  value={actorName}
                  onChange={e => onNameChange(e.target.value)}
                  onBlur={() => setNameEditing(false)}
                  placeholder="اسمك الكامل (للسجلات)"
                  style={{
                    width: "100%", padding: "7px 10px",
                    borderRadius: 7, border: "1.5px solid rgba(197,160,89,0.4)",
                    background: "rgba(255,255,255,0.07)", color: "#fff",
                    fontSize: "0.68rem", fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              ) : (
                <div
                  onClick={() => setNameEditing(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 10px", borderRadius: 7,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)" }}>👤</span>
                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.8)", flex: 1 }}>{actorName}</span>
                  <span style={{ fontSize: "0.55rem", color: "rgba(197,160,89,0.6)" }}>✏️</span>
                </div>
              )}
            </div>
          )}

          {role && myRoleInfo && (
            <div style={{
              marginTop: 6, display: "flex", alignItems: "center", gap: 6,
              padding: "4px 8px", borderRadius: 6,
              background: "rgba(197,160,89,0.12)",
            }}>
              <span style={{ fontSize: "0.7rem" }}>{myRoleInfo.icon}</span>
              <span style={{ fontSize: "0.6rem", color: "rgba(197,160,89,0.8)" }}>
                مرحلة {myRoleInfo.stage.join("، ")}
              </span>
              {pendingCount > 0 && (
                <span style={{
                  marginRight: "auto",
                  background: "#e74c3c", color: "#fff",
                  borderRadius: "50%", width: 16, height: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.55rem", fontWeight: 800,
                }}>{pendingCount}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === "requests" && pendingCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 10, border: "none",
                background: isActive ? GOLD_BG : "transparent",
                cursor: "pointer", width: "100%", textAlign: "right",
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                fontSize: "0.82rem", fontWeight: isActive ? 800 : 500,
                color: isActive ? "#8B6914" : "#4a3520",
                borderRight: isActive ? `3px solid ${GOLD}` : "3px solid transparent",
                transition: "all 0.18s",
                position: "relative",
              }}
            >
              <span style={{ fontSize: "1rem" }}>{tab.icon}</span>
              <span style={{ flex: 1 }}>{tab.label}</span>
              {showBadge && (
                <span style={{
                  background: "#e74c3c", color: "#fff", borderRadius: "50%",
                  width: 18, height: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.6rem", fontWeight: 800,
                }}>{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: "12px 10px", borderTop: `1px solid ${GOLD_BORDER}` }}>
        {role && (
          <button
            onClick={() => onRoleChange("")}
            style={{
              width: "100%", padding: "7px", borderRadius: 8,
              border: "1px solid rgba(231,76,60,0.25)", background: "rgba(231,76,60,0.05)",
              cursor: "pointer", fontSize: "0.68rem", color: "#c0392b",
              fontFamily: "'Cairo', 'Tajawal', sans-serif", marginBottom: 8,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          >
            🔄 تغيير الدور
          </button>
        )}
        <button
          onClick={onExit}
          style={{
            width: "100%", padding: "9px", borderRadius: 9,
            border: `1px solid ${GOLD_BORDER}`, background: "transparent",
            cursor: "pointer", fontSize: "0.76rem", color: "#9b8060",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.18s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GOLD_BG; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          ← الرجوع للصفحة الرئيسية
        </button>
      </div>
    </div>
  );
}
