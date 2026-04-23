import { useState } from "react";
import { TabType } from "../App";
import { Search } from "lucide-react";
import logoImg from "@assets/logo_1776506524686.jpg";
import heroBg from "@assets/Image_jo77t3jo77t3jo1_1776495109728.png";
import FilterBar from "./FilterBar";
import type { FilterState } from "./filterTypes";

interface HeaderProps {
  activeTab:       TabType;
  onTabChange:     (tab: TabType) => void;
  search:          string;
  onSearchChange:  (value: string) => void;
  filters:         FilterState;
  onFiltersChange: (f: FilterState) => void;
}

export default function Header({ activeTab, onTabChange, search, onSearchChange, filters, onFiltersChange }: HeaderProps) {
  const [logoHover, setLogoHover] = useState(false);

  function handleLogoClick() {
    window.dispatchEvent(new CustomEvent("rawaf-logout"));
  }

  return (
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
          {/* ── Clickable Logo — dispatches rawaf-logout event ── */}
          <div
            onClick={handleLogoClick}
            onMouseEnter={() => setLogoHover(true)}
            onMouseLeave={() => setLogoHover(false)}
            title="تسجيل الخروج من النظام"
            style={{
              width: "68px", height: "68px",
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
            {/* Logout hint tooltip that appears on hover */}
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
                fontSize: "clamp(1.05rem, 2.5vw, 1.6rem)",
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
                إدارة المشتريات والعقود — شركة الرواف للمقاولات
              </p>
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav
          className="animate-fade"
          style={{
            display: "flex", gap: "28px", alignSelf: "flex-start", paddingTop: "6px",
            background: "rgba(255,255,255,0.06)", borderRadius: "10px",
            padding: "8px 20px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
          }}
        >
          {([
            { key: "main" as TabType,     label: "لوحة التنسيق الفني" },
            { key: "database" as TabType, label: "قاعدة البيانات" },
          ]).map((tab) => (
            <span
              key={tab.key}
              className={`nav-tab ${activeTab === tab.key ? "active" : "inactive"}`}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </span>
          ))}
        </nav>
      </div>

      {/* ── Unified Search Bar ── */}
      <div style={{ marginTop: "22px" }}>
        <div
          style={{
            position: "relative",
            maxWidth: "720px",
            margin: "0 auto",
          }}
        >
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
              e.target.style.background = "rgba(255,255,255,0.15)";
              e.target.style.boxShadow = "0 0 0 4px rgba(197,160,89,0.12)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(197,160,89,0.35)";
              e.target.style.background = "rgba(255,255,255,0.10)";
              e.target.style.boxShadow = "none";
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
        <div style={{ textAlign: "center", marginTop: "8px" }}>
          <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}>
            البحث الشامل يعمل في وقت حقيقي عبر جميع حقول قاعدة البيانات
          </span>
        </div>
      </div>

      {/* ── Advanced Filter Bar ── */}
      <FilterBar filters={filters} onFiltersChange={onFiltersChange} />
    </header>
  );
}
