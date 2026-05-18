import { useState } from "react";
import { TabType } from "../App";
import type { CurrentUser } from "../App";
import { Search } from "lucide-react";
import logoImg from "@assets/logo_1776506524686.jpg";
import heroBg from "@assets/Image_jo77t3jo77t3jo1_1776495109728.png";
import FilterBar from "./FilterBar";
import type { FilterState } from "./filterTypes";
import UserManagementPanel from "./UserManagementPanel";
import SelfEditModal from "./SelfEditModal";

interface HeaderProps {
  activeTab:       TabType;
  onTabChange:     (tab: TabType) => void;
  search:          string;
  onSearchChange:  (value: string) => void;
  filters:         FilterState;
  onFiltersChange: (f: FilterState) => void;
  currentUser:     CurrentUser | null;
}

export default function Header({ activeTab, onTabChange, search, onSearchChange, filters, onFiltersChange, currentUser }: HeaderProps) {
  const [logoHover,    setLogoHover]    = useState(false);
  const [gearHover,    setGearHover]    = useState(false);
  const [showPanel,    setShowPanel]    = useState(false);
  const [showSelfEdit, setShowSelfEdit] = useState(false);

  const isMainAdmin    = currentUser?.loginName === "admin";
  const canSeeDatabase = currentUser?.loginName === "admin" || currentUser?.role === "admin";
  const isAdmin        = isMainAdmin;

  function handleLogoClick() {
    window.dispatchEvent(new CustomEvent("rawaf-logout"));
  }

  return (
    <>
      <header
        className="hero-banner animate-fade"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(26,22,18,0.88) 0%, rgba(58,54,50,0.75) 50%, rgba(26,22,18,0.92) 100%), url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          {/* Logo + Title */}
          <div className="animate-slide-in" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              onClick={handleLogoClick}
              onMouseEnter={() => setLogoHover(true)}
              onMouseLeave={() => setLogoHover(false)}
              title="تسجيل الخروج من النظام"
              style={{
                width: "60px", height: "60px",
                background: "#fff",
                borderRadius: "12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: logoHover
                  ? "0 8px 28px rgba(0,0,0,0.5), 0 0 0 2px rgba(197,160,89,0.75), 0 0 22px rgba(197,160,89,0.35)"
                  : "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1.5px rgba(197,160,89,0.4)",
                flexShrink: 0, overflow: "hidden", padding: "6px",
                cursor: "pointer",
                opacity: logoHover ? 0.82 : 1,
                transform: logoHover ? "scale(1.08)" : "scale(1)",
                transition: "opacity 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease",
                position: "relative",
              }}
            >
              <img
                src={logoImg}
                alt="شركة الرواف للمقاولات — اضغط للخروج"
                style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "7px" }}
              />
              {logoHover && (
                <div style={{
                  position: "absolute",
                  bottom: "-34px",
                  right: "50%",
                  transform: "translateX(50%)",
                  background: "rgba(20,14,8,0.92)",
                  border: "1px solid rgba(197,160,89,0.35)",
                  borderRadius: 7,
                  padding: "4px 10px",
                  fontSize: "0.58rem",
                  color: "rgba(197,160,89,0.9)",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 100,
                  backdropFilter: "blur(8px)",
                  fontFamily: "Tajawal, sans-serif",
                  letterSpacing: "0.04em",
                }}>
                  تسجيل الخروج
                </div>
              )}
            </div>

            <div>
              <h1
                style={{
                  fontSize: "clamp(0.95rem, 2.2vw, 1.45rem)",
                  fontWeight: 800, color: "#ffffff",
                  lineHeight: 1.25, letterSpacing: "-0.01em",
                  textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                  margin: 0,
                }}
              >
                قاعدة بيانات المقاولين والموردين ومقدمي الخدمات
              </h1>
              <p
                style={{
                  fontSize: "clamp(0.72rem, 1.4vw, 0.88rem)",
                  fontWeight: 700,
                  color: "var(--gold)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "4px 0 5px",
                  fontFamily: "'Inter', sans-serif",
                  textShadow: "0 1px 6px rgba(0,0,0,0.35)",
                }}
              >
                Database · Alrawaf Contracting Company
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold)", flexShrink: 0, boxShadow: "0 0 6px var(--gold)" }} />
                <p style={{ fontSize: "0.82rem", color: "rgba(232,213,163,0.9)", fontWeight: 500, margin: 0 }}>
                  إدارة سلاسل الإمداد — شركة الرواف للمقاولات
                </p>
              </div>
            </div>
          </div>

          {/* Nav tabs + Gear icon */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>

            {/* User info bar */}
            {currentUser && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.78rem", color: "rgba(232,213,163,0.85)", fontWeight: 600, letterSpacing: "0.02em" }}>
                  {currentUser.name}{currentUser.jobTitle ? ` — ${currentUser.jobTitle}` : ""}
                </span>
                <button
                  onClick={() => setShowSelfEdit(true)}
                  style={{
                    background: "none", border: "1px solid rgba(197,160,89,0.35)",
                    borderRadius: 6, padding: "2px 10px",
                    color: "rgba(197,160,89,0.85)", fontSize: "0.68rem", fontWeight: 700,
                    fontFamily: "Tajawal, sans-serif", cursor: "pointer", letterSpacing: "0.03em",
                    transition: "all 0.18s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(197,160,89,0.12)"; e.currentTarget.style.color = "#c5a059"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(197,160,89,0.85)"; }}
                >تعديل البيانات</button>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <nav
              className="animate-fade"
              style={{
                display: "flex", gap: "28px", alignSelf: "flex-start", paddingTop: "6px",
                background: "rgba(255,255,255,0.06)", borderRadius: "10px",
                padding: "8px 20px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
              }}
            >
              {([
                { key: "main"     as TabType, label: "لوحة التنسيق الفني", adminOnly: false },
                { key: "database" as TabType, label: "قاعدة البيانات",     adminOnly: true  },
              ]).filter(tab => !tab.adminOnly || canSeeDatabase).map((tab) => (
                <span
                  key={tab.key}
                  className={`nav-tab ${activeTab === tab.key ? "active" : "inactive"}`}
                  onClick={() => onTabChange(tab.key)}
                >
                  {tab.label}
                </span>
              ))}
            </nav>

            {/* Gear icon — admin only */}
            {isAdmin && (
              <button
                onClick={() => setShowPanel(true)}
                onMouseEnter={() => setGearHover(true)}
                onMouseLeave={() => setGearHover(false)}
                title={`إدارة المستخدمين — ${currentUser?.name ?? ""}`}
                style={{
                  width: 40, height: 40,
                  borderRadius: 10,
                  background: gearHover
                    ? "rgba(197,160,89,0.18)"
                    : "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${gearHover ? "rgba(197,160,89,0.55)" : "rgba(255,255,255,0.14)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.22s ease",
                  transform: gearHover ? "rotate(45deg)" : "rotate(0deg)",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                <svg
                  width="18" height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={gearHover ? "#c5a059" : "rgba(255,255,255,0.65)"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transition: "stroke 0.22s ease" }}
                >
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            )}
            </div>{/* end inner row (nav + gear) */}
          </div>{/* end column (user info + tabs) */}
        </div>{/* end space-between */}

        {/* ── Unified Search Bar ── */}
        <div style={{ marginTop: "12px" }}>
          <div style={{ position: "relative", maxWidth: "720px", margin: "0 auto" }}>
            <div
              style={{
                position: "absolute", top: "50%", right: "18px",
                transform: "translateY(-50%)",
                color: "rgba(197,160,89,0.7)",
                pointerEvents: "none",
              }}
            >
              <Search size={17} />
            </div>
            <input
              type="text"
              placeholder="ابحث بأي معلومة: اسم المقاول، المشروع، نوع الأعمال، المحفظة، رقم العقد..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 50px 14px 20px",
                background: "rgba(255,255,255,0.10)",
                border: "1.5px solid rgba(197,160,89,0.35)",
                borderRadius: "14px",
                fontSize: "0.9rem",
                fontFamily: "Tajawal, sans-serif",
                direction: "rtl",
                outline: "none",
                color: "#fff",
                backdropFilter: "blur(8px)",
                boxSizing: "border-box",
                transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(197,160,89,0.9)";
                e.target.style.background  = "rgba(255,255,255,0.15)";
                e.target.style.boxShadow   = "0 0 0 4px rgba(197,160,89,0.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(197,160,89,0.35)";
                e.target.style.background  = "rgba(255,255,255,0.10)";
                e.target.style.boxShadow   = "none";
              }}
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                style={{
                  position: "absolute", top: "50%", left: "14px",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.15)", border: "none",
                  borderRadius: "50%", width: "24px", height: "24px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: "14px",
                  lineHeight: 1, transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                title="مسح البحث"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── Advanced Filter Bar ── */}
        <FilterBar filters={filters} onFiltersChange={onFiltersChange} search={search} />
      </header>

      {/* ── User Management Panel ── */}
      {showPanel && currentUser && (
        <UserManagementPanel
          currentUser={currentUser}
          onClose={() => setShowPanel(false)}
        />
      )}

      {/* ── Self Edit Modal ── */}
      {showSelfEdit && currentUser && (
        <SelfEditModal
          currentUser={currentUser}
          onClose={() => setShowSelfEdit(false)}
          onSaved={(updated) => {
            setShowSelfEdit(false);
            sessionStorage.setItem("rawaf_current_user", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("rawaf-profile-updated", { detail: updated }));
          }}
        />
      )}
    </>
  );
}
