import { useState } from "react";
import { ROLES, STAGES, type ContractTab } from "./types";
import NotificationBell from "./NotificationBell";
import type { StoredNotification } from "./useContractNotifications";
import logoImg from "@assets/logo_1776506524686.jpg";

const GOLD      = "#C5A059";
const GOLD2     = "#a88540";
const GOLD_BG   = "rgba(197,160,89,0.08)";
const GOLD_BOR  = "rgba(197,160,89,0.22)";
const GLASS     = "rgba(255,255,255,0.80)";
const GLASS_HDR = "rgba(251,249,244,0.92)";
const SHADOW_G  = "0 4px 20px rgba(197,160,89,0.12)";

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

const TABS: { id: ContractTab; label: string }[] = [
  { id: "dashboard",  label: "لوحة القيادة"         },
  { id: "requests",   label: "طلبات العقود"          },
  { id: "tracking",   label: "متابعة العقود"         },
  { id: "analytics",  label: "التحليلات والتقارير"   },
  { id: "archive",    label: "قاعدة البيانات"        },
];

export default function ContractSidebar({
  activeTab, onTabChange, pendingCount, onExit,
  role, actorName, onRoleChange, onNameChange, pendingByRole,
  notifications, unreadCount, onMarkAllRead, onDismissOne, onDismissAll, onOpenContract,
}: Props) {
  const [nameEditing, setNameEditing] = useState(false);
  const myRoleInfo = ROLES.find(r => r.name === role);

  /* Stage labels for current role */
  const myStageLabels = myRoleInfo?.stage.map(n => {
    const st = STAGES[n - 1];
    return st ? `م${n}: ${st.label}` : `م${n}`;
  }) ?? [];

  return (
    <div dir="rtl" style={{
      width: 232, flexShrink: 0,
      background: GLASS,
      backdropFilter: "blur(20px)",
      borderLeft: `1px solid ${GOLD_BOR}`,
      display: "flex", flexDirection: "column",
      height: "100%",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
      boxShadow: "2px 0 20px rgba(0,0,0,0.06)",
    }}>

      {/* ── Header / Logo ── */}
      <div style={{
        padding: "18px 14px 14px",
        borderBottom: `1px solid ${GOLD_BOR}`,
        background: GLASS_HDR,
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            overflow: "hidden", flexShrink: 0,
            boxShadow: `0 0 0 2px rgba(197,160,89,0.4), 0 4px 16px rgba(197,160,89,0.2)`,
            animation: "glowSideLogo 4s ease infinite",
          }}>
            <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          </div>
          <style>{`@keyframes glowSideLogo{0%,100%{box-shadow:0 0 0 2px rgba(197,160,89,0.35),0 4px 16px rgba(197,160,89,0.12)}50%{box-shadow:0 0 0 3px rgba(197,160,89,0.6),0 6px 22px rgba(197,160,89,0.24)}}`}</style>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#1A1A1A", lineHeight: 1.2 }}>
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
                background: role ? GOLD_BG : "rgba(248,248,248,0.9)",
                color: role ? "#8B6914" : "#999",
                fontSize: "0.72rem", fontWeight: 700,
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                appearance: "none", cursor: "pointer", outline: "none",
              }}
            >
              <option value="" style={{ color: "#bbb" }}>— اختر دورك الوظيفي —</option>
              {ROLES.map(r => {
                const pending = pendingByRole[r.name] ?? 0;
                return (
                  <option key={r.name} value={r.name}>
                    {r.name}{pending > 0 ? ` (${pending})` : ""}
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
                    background: "rgba(255,255,255,0.9)", color: "#1A1A1A",
                    fontSize: "0.7rem", fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              ) : (
                <div
                  onClick={() => setNameEditing(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "7px 10px", borderRadius: 8,
                    background: "rgba(248,248,248,0.9)", border: `1px solid rgba(0,0,0,0.06)`,
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GOLD_BG; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,248,248,0.9)"; }}
                >
                  <span style={{ fontSize: "0.7rem", color: "#4a3520", flex: 1 }}>{actorName}</span>
                  <span style={{ fontSize: "0.6rem", color: "#ccc" }}>تعديل</span>
                </div>
              )}

              {myRoleInfo && (
                <div style={{
                  marginTop: 6, display: "flex", flexDirection: "column", gap: 2,
                  padding: "7px 10px", borderRadius: 8,
                  background: GOLD_BG, border: `1px solid ${GOLD_BOR}`,
                }}>
                  <div style={{ fontSize: "0.62rem", color: "#8B6914", fontWeight: 700 }}>
                    {myRoleInfo.name}
                  </div>
                  {myStageLabels.map((s, i) => (
                    <div key={i} style={{ fontSize: "0.57rem", color: "#9b8060" }}>{s}</div>
                  ))}
                  {pendingCount > 0 && (
                    <div style={{
                      marginTop: 4, background: "#e74c3c", color: "#fff",
                      borderRadius: 20, padding: "2px 8px",
                      fontSize: "0.58rem", fontWeight: 900, display: "inline-block", alignSelf: "flex-start",
                    }}>{pendingCount} عقد بانتظارك</div>
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
          const isActive    = activeTab === tab.id;
          const showBadge   = tab.id === "requests" && pendingCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 10, border: "none",
                background: isActive ? GOLD_BG : "transparent",
                backdropFilter: isActive ? "blur(8px)" : "none",
                cursor: "pointer", width: "100%", textAlign: "right",
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                fontSize: "0.82rem", fontWeight: isActive ? 800 : 500,
                color: isActive ? "#8B6914" : "#4a3520",
                borderRight: isActive ? `3px solid ${GOLD}` : "3px solid transparent",
                transition: "all 0.15s",
                boxShadow: isActive ? SHADOW_G : "none",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(248,248,248,0.9)";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {/* Active indicator dot */}
              <div style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: isActive ? GOLD : "rgba(0,0,0,0.12)",
                transition: "background 0.15s",
              }}/>
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
              backdropFilter: "blur(8px)",
              cursor: "pointer", fontSize: "0.68rem", color: "#c0392b",
              fontFamily: "'Cairo', 'Tajawal', sans-serif", marginBottom: 7,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(231,76,60,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(231,76,60,0.04)"; }}
          >
            تغيير الدور
          </button>
        )}
        <button
          onClick={onExit}
          style={{
            width: "100%", padding: "9px", borderRadius: 9,
            border: `1px solid ${GOLD_BOR}`,
            background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)",
            cursor: "pointer", fontSize: "0.76rem", color: "#9b8060",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GOLD_BG; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.6)"; }}
        >
          الرجوع للصفحة الرئيسية
        </button>
      </div>
    </div>
  );
}
