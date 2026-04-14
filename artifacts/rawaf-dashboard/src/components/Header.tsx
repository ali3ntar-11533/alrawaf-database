import { TabType } from "../App";
import { Search } from "lucide-react";

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
    <header className="hero-banner">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              backgroundColor: "white",
              padding: "8px",
              borderRadius: "8px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              flexShrink: 0,
            }}
          >
            <img
              src="https://alrawaf.sa/assets/images/logo.png"
              alt="الرواف"
              style={{ height: "48px", display: "block" }}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<span style="font-size:1.4rem;font-weight:900;color:#c5a059;padding:0 4px">R</span>';
                }
              }}
            />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "white",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              قاعدة بيانات الموردين والمقاولين ومقدمي الخدمات
            </h1>
            <p style={{ fontSize: "0.8rem", color: "var(--rawaf-gold)", marginTop: "4px", fontWeight: 500 }}>
              إدارة المشتريات والعقود - شركة الرواف للمقاولات
            </p>
          </div>
        </div>

        <nav style={{ display: "flex", gap: "32px", fontSize: "0.875rem", fontWeight: 600, flexShrink: 0 }}>
          <span
            onClick={() => onTabChange("main")}
            style={{
              cursor: "pointer",
              color: activeTab === "main" ? "var(--rawaf-gold)" : "rgba(255,255,255,0.7)",
              borderBottom: activeTab === "main" ? "2px solid var(--rawaf-gold)" : "2px solid transparent",
              paddingBottom: "4px",
              transition: "color 0.2s",
            }}
          >
            لوحة التنسيق الفني
          </span>
          <span
            onClick={() => onTabChange("database")}
            style={{
              cursor: "pointer",
              color: activeTab === "database" ? "var(--rawaf-gold)" : "rgba(255,255,255,0.7)",
              borderBottom: activeTab === "database" ? "2px solid var(--rawaf-gold)" : "2px solid transparent",
              paddingBottom: "4px",
              transition: "color 0.2s",
            }}
          >
            قاعدة البيانات
          </span>
        </nav>
      </div>

      <div className="filter-row">
        {filterItems.map((label) => (
          <div key={label} className="filter-box">
            <span>{label}</span>
            <Search size={10} style={{ opacity: 0.4 }} />
          </div>
        ))}
      </div>
    </header>
  );
}
