import { TabType } from "../App";
import { Search } from "lucide-react";
import logoImg from "@assets/1658133304061_1776159635121.jpg";

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const filterItems = [
  "رقم العقد",
  "المقاول",
  "تصنيف الأعمال",
  "نوع الأعمال",
  "المشروع",
  "المحفظة",
];

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="hero-banner animate-fade">
      {/* Top bar: Logo + Title + Nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>

        {/* Logo + Title */}
        <div className="animate-slide-in" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              background: "#fff",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(197,160,89,0.3)",
              flexShrink: 0,
              overflow: "hidden",
              padding: "6px",
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
                fontSize: "clamp(1.1rem, 2.5vw, 1.65rem)",
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
                textShadow: "0 2px 12px rgba(0,0,0,0.4)",
              }}
            >
              قاعدة بيانات الموردين والمقاولين ومقدمي الخدمات
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--gold)",
                  flexShrink: 0,
                  boxShadow: "0 0 6px var(--gold)",
                }}
              />
              <p style={{ fontSize: "0.82rem", color: "rgba(232,213,163,0.9)", fontWeight: 500, margin: 0 }}>
                إدارة المشتريات والعقود — شركة الرواف للمقاولات
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          className="animate-fade"
          style={{
            display: "flex",
            gap: "28px",
            alignSelf: "flex-start",
            paddingTop: "6px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "10px",
            padding: "8px 20px",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
          }}
        >
          {[
            { key: "main" as TabType, label: "لوحة التنسيق الفني" },
            { key: "database" as TabType, label: "قاعدة البيانات" },
          ].map((tab) => (
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

      {/* Filter Row */}
      <div className="filter-row stagger">
        {filterItems.map((label) => (
          <div key={label} className="filter-box animate-fade-up">
            <span>{label}</span>
            <Search size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </header>
  );
}
