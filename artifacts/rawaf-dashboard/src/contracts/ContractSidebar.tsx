import { useState } from "react";
import { ROLES, type ContractTab } from "./types";
import NotificationBell from "./NotificationBell";
import type { StoredNotification } from "./useContractNotifications";

const GOLD       = "#C5A059";
const GOLD2      = "#a88540";
const GOLD_BG    = "rgba(197,160,89,0.08)";
const GOLD_BOR   = "rgba(197,160,89,0.22)";
const CREAM      = "#FBF9F4";
const SHADOW_G   = "0 4px 20px rgba(197,160,89,0.12)";

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
  notifications: StoredNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onDismissOne: (id: string) => void;
  onDismissAll: () => void;
  onOpenContract: (id: number) => void;
}

const TABS: { id: ContractTab; label: string; icon: string }[] = [
  { id: "dashboard",  label: "لوحة القيادة",               icon: "🏠" },
  { id: "requests",   label: "طلبات العقود",               icon: "📋" },
  { id: "tracking",   label: "متابعة العقود",              icon: "🛡️" },
  { id: "analytics",  label: "التحليلات والتقارير",        icon: "📊" },
  { id: "archive",    label: "قاعدة البيانات",             icon: "💾" },
];

export default function ContractSidebar({
  activeTab, onTabChange, pendingCount, onExit,
  role, actorName, onRoleChange, onNameChange, pendingByRole,
  notifications, unreadCount, onMarkAllRead, onDismissOne, onDismissAll, onOpenContract,
}: Props) {
  const [nameEditing, setNameEditing] = useState(false);
  const myRoleInfo = ROLES.find(r => r.name === role);

  return (
    <div dir="rtl" style={{
      width: 232, flexShrink: 0,
      background: "#fff",
      borderLeft: `1px solid ${GOLD_BOR}`,
      display: "flex", flexDirection: "column",
      height: "100%",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
      boxShadow: "2px 0 16px rgba(0,0,0,0.04)",
    }}>

      {/* ── Header / Logo ── */}
      <div style={{
        padding: "18px 14px 14px",
        borderBottom: `1px solid ${GOLD_BOR}`,
        background: `linear-gradient(135deg, ${CREAM} 0%, #F2EAD3 100%)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", boxShadow: `0 4px 14px rgba(197,160,89,0.4)`, flexShrink: 0,
          }}>🏛️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#1A1A1A", lineHeight: 1.2 }}>
              نظام إدارة العقود
            </div>
            <div style={{ fontSize: "0.58rem", color: "#9b8060" }}>الرواف للمقاولات</div>
          </div>
          <NotificationBell
            actorName={actorName}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={onMarkAllRead}
            onDismissOne={onDismissOne}
            onDismissAll={onDismissAll}
            onOpenContract={onOpenContract}
          />
        </div>

        {/* Role picker */}
        <div style={{ marginBottom: 2 }}>
          <div style={{ fontSize: "0.58rem", fontWeight: 800, color: "#9b8060", marginBottom: 5, letterSpacing: "0.05em" }}>
            الدور الوظيفي
          </div>

          <div style={{ position: "relative" }}>
            <select
              value={role}
              onChange={e => onRoleChange(e.target.value)}
              style={{
                width: "100%", padding: "9px 32px 9px 10px",
                borderRadius: 9,
                border: role ? `1.5px solid rgba(197,160,89,0.45)` : `1.5px solid rgba(0,0,0,0.12)`,
                background: role ? GOLD_BG : "#f8f8f8",
                color: role ? "#8B6914" : "#999",
                fontSize: "0.72rem", fontWeight: 700,
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                appearance: "none", cursor: "pointer",
                outline: "none",
                boxShadow: role ? `inset 0 0 0 1px rgba(197,160,89,0.15)` : "none",
              }}
            >
              <option value="" style={{ color: "#bbb" }}>— اختر دورك الوظيفي —</option>
              {ROLES.map(r => {
                const pending = pendingByRole[r.name] ?? 0;
                return (
                  <option key={r.name} value={r.name}>
                    {r.icon} {r.name}{pending > 0 ? ` (${pending})` : ""}
                  </option>
                );
              })}
            </select>
            <span style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              color: role ? "#8B6914" : "#bbb", fontSize: "0.65rem", pointerEvents: "none",
            }}>▾</span>
          </div>

          {role && (
            <div style={{ marginTop: 7 }}>
              {nameEditing || !actorName ? (
                <input
                  autoFocus
                  value={actorName}
                  onChange={e => onNameChange(e.target.value)}
                  onBlur={() => setNameEditing(false)}
                  placeholder="اسمك الكامل (للسجلات)"
                  style={{
                    width: "100%", padding: "8px 10px",
                    borderRadius: 8, border: `1.5px solid ${GOLD_BOR}`,
                    background: "#fff", color: "#1A1A1A",
                    fontSize: "0.7rem", fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    outline: "none", boxSizing: "border-box",
                    boxShadow: `0 0 0 3px rgba(197,160,89,0.08)`,
                  }}
                />
              ) : (
                <div
                  onClick={() => setNameEditing(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "7px 10px", borderRadius: 8,
                    background: "#f8f8f8", border: "1px solid #eee",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GOLD_BG; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#f8f8f8"; }}
                >
                  <span style={{ fontSize: "0.7rem", color: "#aaa" }}>👤</span>
                  <span style={{ fontSize: "0.7rem", color: "#4a3520", flex: 1 }}>{actorName}</span>
                  <span style={{ fontSize: "0.6rem", color: "#ccc" }}>✏️</span>
                </div>
              )}

              {myRoleInfo && (
                <div style={{
                  marginTop: 6, display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 9px", borderRadius: 7,
                  background: GOLD_BG, border: `1px solid ${GOLD_BOR}`,
                }}>
                  <span style={{ fontSize: "0.72rem" }}>{myRoleInfo.icon}</span>
                  <span style={{ fontSize: "0.6rem", color: "#8B6914", fontWeight: 700, flex: 1 }}>
                    مرحلة {myRoleInfo.stage.join("، ")}
                  </span>
                  {pendingCount > 0 && (
                    <span style={{
                      background: "#e74c3c", color: "#fff",
                      borderRadius: "50%", width: 18, height: 18,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.55rem", fontWeight: 900,
                    }}>{pendingCount}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
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
                transition: "all 0.15s",
                position: "relative",
                boxShadow: isActive ? SHADOW_G : "none",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "#f8f8f8";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span style={{ fontSize: "1rem" }}>{tab.icon}</span>
              <span style={{ flex: 1 }}>{tab.label}</span>
              {showBadge && (
                <span style={{
                  background: "#e74c3c", color: "#fff", borderRadius: "50%",
                  width: 19, height: 19,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.6rem", fontWeight: 900,
                }}>{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: "12px 10px", borderTop: `1px solid ${GOLD_BOR}` }}>
        {role && (
          <button
            onClick={() => onRoleChange("")}
            style={{
              width: "100%", padding: "7px", borderRadius: 8,
              border: "1px solid rgba(231,76,60,0.2)", background: "rgba(231,76,60,0.04)",
              cursor: "pointer", fontSize: "0.68rem", color: "#c0392b",
              fontFamily: "'Cairo', 'Tajawal', sans-serif", marginBottom: 7,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(231,76,60,0.09)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(231,76,60,0.04)"; }}
          >
            🔄 تغيير الدور
          </button>
        )}
        <button
          onClick={onExit}
          style={{
            width: "100%", padding: "9px", borderRadius: 9,
            border: `1px solid ${GOLD_BOR}`, background: "transparent",
            cursor: "pointer", fontSize: "0.76rem", color: "#9b8060",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s",
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
