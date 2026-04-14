import { TabType, FilterState } from "../App";
import { Search } from "lucide-react";
import logoImg from "@assets/1658133304061_1776159635121.jpg";

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
}

const FILTERS: { key: keyof FilterState; label: string }[] = [
  { key: "contractNo",    label: "رقم العقد" },
  { key: "contractor",    label: "المقاول" },
  { key: "technicalScope", label: "نطاق التوصيف الفني" },
  { key: "workType",      label: "نوع الأعمال" },
  { key: "project",       label: "المشروع" },
  { key: "portfolio",     label: "المحفظة" },
];

export default function Header({ activeTab, onTabChange, filters, onFilterChange }: HeaderProps) {
  return (
    <header className="hero-banner animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        {/* Logo + Title */}
        <div className="animate-slide-in" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "68px", height: "68px",
              background: "#fff",
              borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(197,160,89,0.3)",
              flexShrink: 0, overflow: "hidden", padding: "6px",
            }}
          >
            <img
              src={logoImg}
              alt="شركة الرواف للمقاولات"
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "7px" }}
            />
          </div>
          <div>
            <h1
              style={{
                fontSize: "clamp(1.05rem, 2.5vw, 1.6rem)",
                fontWeight: 800, color: "#ffffff",
                lineHeight: 1.25, letterSpacing: "-0.01em",
                textShadow: "0 2px 12px rgba(0,0,0,0.4)",
              }}
            >
              قاعدة بيانات المقاولين والموردين ومقدمي الخدمات
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
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

      {/* Filter row — each box is a live text input */}
      <div className="filter-row stagger">
        {FILTERS.map((f) => (
          <label key={f.key} className="filter-box animate-fade-up" style={{ cursor: "text" }}>
            <input
              type="text"
              placeholder={f.label}
              value={filters[f.key]}
              onChange={(e) => onFilterChange(f.key, e.target.value)}
              style={{
                background: "transparent", border: "none", outline: "none",
                color: "rgba(255,255,255,0.9)", fontFamily: "Tajawal, sans-serif",
                fontSize: "0.78rem", width: "100%", direction: "rtl",
              }}
            />
            <Search size={11} style={{ opacity: 0.45, flexShrink: 0 }} />
          </label>
        ))}
      </div>
    </header>
  );
}
