import { useState } from "react";
import { ROLES, STAGES, type ContractTab } from "./types";
import NotificationBell from "./NotificationBell";
import type { StoredNotification } from "./useContractNotifications";
import logoImg from "@assets/logo_1776506524686.jpg";

/* ── Design tokens ──────────────────────────────────────────── */
const GOLD       = "#C5A059";
const GOLD2      = "#E2C275";
const GOLD_DIM   = "rgba(197,160,89,0.18)";
const GOLD_BOR   = "rgba(197,160,89,0.30)";
const AMBER      = "#F5A623";
const DARK_BG    = "#0C1427";
const DARK_HDR   = "#0A1020";
const DARK_CARD  = "rgba(255,255,255,0.05)";
const TEXT_MAIN  = "#E8E8E8";
const TEXT_MUT   = "#8899BB";
const BLUE       = "#1976D2";
const BLUE_L     = "#4A90D9";
const RED        = "#ef4444";

const SIDEBAR_W  = 240;

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

/* Extra role not in shared types */
const TRACKING_ROLE = { name: "مسؤول المتابعة", icon: "📋", stage: [] as number[] };
const ALL_ROLES = [...ROLES, TRACKING_ROLE];

/* Tab icon map using clean unicode shapes */
const TAB_ICONS: Record<ContractTab, string> = {
  dashboard:  "▦",
  requests:   "◈",
  tracking:   "◎",
  analytics:  "◉",
  archive:    "▣",
};

const TABS: { id: ContractTab; label: string }[] = [
  { id: "dashboard",  label: "لوحة القيادة"         },
  { id: "requests",   label: "طلبات العقود"          },
  { id: "tracking",   label: "متابعة العقود"         },
  { id: "analytics",  label: "التقييم"                },
];

export default function ContractSidebar({
  activeTab, onTabChange, pendingCount, onExit,
  role, actorName, onRoleChange, onNameChange, pendingByRole,
  notifications, unreadCount, onMarkAllRead, onDismissOne, onDismissAll, onOpenContract,
}: Props) {
  const [nameEditing, setNameEditing] = useState(false);
  const myRoleInfo = ALL_ROLES.find(r => r.name === role);

  const myStageLabels = myRoleInfo?.stage.map(n => {
    const st = STAGES[n - 1];
    return st ? `م${n}: ${st.label}` : `م${n}`;
  }) ?? [];

  return (
    <div dir="rtl" style={{
      width: SIDEBAR_W, flexShrink: 0,
      background: DARK_BG,
      display: "flex", flexDirection: "column",
      height: "100%",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
      boxShadow: "4px 0 32px rgba(0,0,0,0.28)",
      position: "relative",
      zIndex: 10,
    }}>
      <style>{`
        @keyframes glowSideLogo {
          0%,100% { box-shadow: 0 0 0 2px rgba(25,118,210,0.35), 0 0 24px rgba(25,118,210,0.15); }
          50%      { box-shadow: 0 0 0 3px rgba(25,118,210,0.65), 0 0 36px rgba(25,118,210,0.30); }
        }
        @keyframes goldPulse {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        .rawaf-tab-btn:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      {/* ── Decorative top glow line — blue-to-amber slide gradient ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${BLUE}, ${BLUE_L}, ${AMBER})`,
        animation: "goldPulse 3s ease-in-out infinite",
      }}/>

      {/* ── Header / Logo ── */}
      <div style={{
        padding: "22px 16px 16px",
        borderBottom: `1px solid rgba(197,160,89,0.12)`,
        background: DARK_HDR,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            overflow: "hidden", flexShrink: 0,
            animation: "glowSideLogo 4s ease infinite",
          }}>
            <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.74rem", fontWeight: 900, color: "#F0F0F0", lineHeight: 1.2 }}>
              نظام إدارة العقود
            </div>
            <div style={{ fontSize: "0.58rem", color: BLUE_L, marginTop: 2, fontWeight: 700, letterSpacing: "0.02em" }}>
              الرواف للمقاولات
            </div>
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

        {/* Role selector */}
        <div>
          <div style={{ fontSize: "0.54rem", fontWeight: 700, color: TEXT_MUT, marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            الدور الوظيفي
          </div>
          <div style={{ position: "relative" }}>
            <select
              value={role}
              onChange={e => onRoleChange(e.target.value)}
              style={{
                width: "100%", padding: "9px 32px 9px 10px",
                borderRadius: 9,
                border: role ? `1.5px solid rgba(25,118,210,0.4)` : `1.5px solid rgba(255,255,255,0.1)`,
                background: role ? "rgba(25,118,210,0.12)" : "rgba(255,255,255,0.05)",
                color: role ? BLUE_L : TEXT_MUT,
                fontSize: "0.72rem", fontWeight: 700,
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                appearance: "none", cursor: "pointer", outline: "none",
              }}
            >
              <option value="" style={{ color: "#888", background: "#1a2540" }}>— اختر دورك الوظيفي —</option>
              {ALL_ROLES.map(r => {
                const pending = pendingByRole[r.name] ?? 0;
                return (
                  <option key={r.name} value={r.name} style={{ background: "#1a2540" }}>
                    {r.name}{pending > 0 ? ` (${pending})` : ""}
                  </option>
                );
              })}
            </select>
            <span style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              color: BLUE_L, fontSize: "0.6rem", pointerEvents: "none",
            }}>▾</span>
          </div>

          {role && (
            <div style={{ marginTop: 8 }}>
              {nameEditing || !actorName ? (
                <input
                  autoFocus
                  value={actorName}
                  onChange={e => onNameChange(e.target.value)}
                  onBlur={() => setNameEditing(false)}
                  placeholder="اسمك الكامل للسجلات"
                  style={{
                    width: "100%", padding: "8px 10px",
                    borderRadius: 8, border: `1.5px solid rgba(25,118,210,0.4)`,
                    background: "rgba(255,255,255,0.07)", color: TEXT_MAIN,
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
                    background: DARK_CARD, border: `1px solid rgba(255,255,255,0.07)`,
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = DARK_CARD; }}
                >
                  <span style={{ fontSize: "0.7rem", color: TEXT_MAIN, flex: 1 }}>{actorName}</span>
                  <span style={{ fontSize: "0.56rem", color: BLUE_L, fontWeight: 700 }}>تعديل</span>
                </div>
              )}

              {myRoleInfo && (
                <div style={{
                  marginTop: 7,
                  padding: "8px 10px", borderRadius: 9,
                  background: "rgba(25,118,210,0.08)",
                  border: `1px solid rgba(25,118,210,0.22)`,
                }}>
                  <div style={{ fontSize: "0.62rem", color: BLUE_L, fontWeight: 800, marginBottom: 4 }}>
                    {myRoleInfo.name}
                  </div>
                  {myStageLabels.map((s, i) => (
                    <div key={i} style={{ fontSize: "0.55rem", color: TEXT_MUT, lineHeight: 1.5 }}>{s}</div>
                  ))}
                  {pendingCount > 0 && (
                    <div style={{
                      marginTop: 6, background: RED, color: "#fff",
                      borderRadius: 20, padding: "2px 9px",
                      fontSize: "0.56rem", fontWeight: 900, display: "inline-block",
                    }}>{pendingCount} عقد بانتظارك</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        <div style={{ fontSize: "0.5rem", fontWeight: 700, color: "rgba(136,153,187,0.5)", letterSpacing: "0.1em", padding: "0 8px 8px", textTransform: "uppercase" }}>
          القائمة الرئيسية
        </div>
        {TABS.map(tab => {
          const isActive  = activeTab === tab.id;
          const showBadge = tab.id === "requests" && pendingCount > 0;
          return (
            <button
              key={tab.id}
              className="rawaf-tab-btn"
              onClick={() => onTabChange(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "11px 14px", borderRadius: 10, border: "none",
                background: isActive
                  ? `linear-gradient(135deg, rgba(25,118,210,0.22), rgba(25,118,210,0.08))`
                  : "transparent",
                cursor: "pointer", width: "100%", textAlign: "right",
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                fontSize: "0.82rem", fontWeight: isActive ? 800 : 500,
                color: isActive ? "#FFFFFF" : TEXT_MAIN,
                borderRight: isActive ? `3px solid ${BLUE_L}` : "3px solid transparent",
                transition: "all 0.18s ease",
                boxShadow: isActive ? `0 2px 14px rgba(25,118,210,0.18), inset 0 0 0 1px rgba(25,118,210,0.20)` : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Active glow */}
              {isActive && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(90deg, rgba(25,118,210,0.08) 0%, transparent 100%)",
                  pointerEvents: "none",
                }}/>
              )}
              <span style={{
                fontSize: "0.7rem",
                color: isActive ? BLUE_L : TEXT_MUT,
                transition: "color 0.15s",
                flexShrink: 0,
              }}>
                {TAB_ICONS[tab.id]}
              </span>
              <span style={{ flex: 1 }}>{tab.label}</span>
              {showBadge && (
                <span style={{
                  background: RED, color: "#fff", borderRadius: "50%",
                  width: 20, height: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.6rem", fontWeight: 900, flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(239,68,68,0.45)",
                }}>{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{
        padding: "12px 10px 16px",
        borderTop: `1px solid rgba(255,255,255,0.07)`,
        background: DARK_HDR,
      }}>
        {role && (
          <button
            onClick={() => onRoleChange("")}
            style={{
              width: "100%", padding: "8px", borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)",
              cursor: "pointer", fontSize: "0.68rem", color: "#F87171",
              fontFamily: "'Cairo', 'Tajawal', sans-serif", marginBottom: 8,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.07)"; }}
          >
            تغيير الدور
          </button>
        )}
        <button
          onClick={onExit}
          style={{
            width: "100%", padding: "10px", borderRadius: 9,
            border: `1px solid rgba(25,118,210,0.3)`,
            background: "rgba(25,118,210,0.09)",
            cursor: "pointer", fontSize: "0.76rem", color: BLUE_L,
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            fontWeight: 700,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(25,118,210,0.18)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(25,118,210,0.09)"; }}
        >
          الرجوع للصفحة الرئيسية
        </button>
      </div>
    </div>
  );
}
