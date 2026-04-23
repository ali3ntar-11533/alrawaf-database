import { GOLD, GOLD_BG, GOLD_BORDER, type ContractTab } from "./types";

interface Props {
  activeTab: ContractTab;
  onTabChange: (tab: ContractTab) => void;
  pendingCount: number;
  onExit: () => void;
  roleName: string;
}

const TABS: { id: ContractTab; label: string; icon: string }[] = [
  { id: "dashboard", label: "الرئيسية",                icon: "🏠" },
  { id: "requests",  label: "طلبات العقود",             icon: "📋" },
  { id: "tracking",  label: "نظام متابعة العقود",       icon: "🛡️" },
  { id: "archive",   label: "قاعدة البيانات والتقارير", icon: "💾" },
];

export default function ContractSidebar({ activeTab, onTabChange, pendingCount, onExit, roleName }: Props) {
  return (
    <div dir="rtl" style={{
      width: 220, flexShrink: 0,
      background: "#fff",
      borderLeft: `1px solid ${GOLD_BORDER}`,
      display: "flex", flexDirection: "column",
      height: "100%",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
      boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        padding: "20px 16px 16px",
        borderBottom: `1px solid ${GOLD_BORDER}`,
        background: "linear-gradient(135deg, #faf9f5, #f5f0e8)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem", boxShadow: "0 3px 10px rgba(197,160,89,0.4)",
          }}>🏛️</div>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#1a1206", lineHeight: 1.2 }}>
              نظام إدارة العقود
            </div>
            <div style={{ fontSize: "0.58rem", color: "#9b8060" }}>الرواف للمقاولات</div>
          </div>
        </div>
        <div style={{
          background: GOLD_BG, border: `1px solid ${GOLD_BORDER}`,
          borderRadius: 8, padding: "6px 10px",
          fontSize: "0.68rem", color: "#8B6914", fontWeight: 700,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>👤</span>
          <span>{roleName}</span>
          {pendingCount > 0 && (
            <span style={{
              marginRight: "auto", background: "#e74c3c", color: "#fff",
              borderRadius: "50%", width: 18, height: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.6rem", fontWeight: 800,
            }}>{pendingCount}</span>
          )}
        </div>
      </div>

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

      <div style={{ padding: "12px 10px", borderTop: `1px solid ${GOLD_BORDER}` }}>
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
