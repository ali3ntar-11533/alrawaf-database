import { useState } from "react";
import "./index.css";
import Header from "./components/Header";
import MainDashboard from "./components/MainDashboard";
import DatabasePage from "./components/DatabasePage";
import ContractsPage from "./components/contracts/ContractsPage";
import SplashGate from "./components/SplashGate";
import { EMPTY_FILTERS, type FilterState } from "./components/filterTypes";

export type TabType = "main" | "database" | "contracts";

function App() {
  const [activeTab, setActiveTab]   = useState<TabType>("main");
  const [search, setSearch]         = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters]       = useState<FilterState>(EMPTY_FILTERS);

  function handleSearchChange(value: string) {
    setSearch(value);
    setSelectedId(null);
  }

  function handleFiltersChange(f: FilterState) {
    setFilters(f);
    setSelectedId(null);
  }

  return (
    <SplashGate>
      <div style={{ minHeight: "100vh", backgroundColor: "var(--body-bg)" }}>
        {activeTab !== "contracts" && (
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            search={search}
            onSearchChange={handleSearchChange}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        )}
        {activeTab === "contracts" && (
          <div style={{
            background: "rgba(15,34,64,0.98)",
            borderBottom: "1px solid rgba(197,160,89,0.15)",
            padding: "12px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontFamily: "Tajawal, sans-serif",
          }}>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              {(["main", "database", "contracts"] as TabType[]).map(tab => {
                const labels: Record<TabType, string> = {
                  main: "لوحة التنسيق الفني",
                  database: "قاعدة البيانات",
                  contracts: "منصة العقود الرقمية",
                };
                return (
                  <span
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      cursor: "pointer", padding: "6px 14px", borderRadius: "8px",
                      fontSize: "0.8rem", fontWeight: activeTab === tab ? 700 : 500,
                      color: activeTab === tab ? "var(--gold)" : "rgba(255,255,255,0.5)",
                      background: activeTab === tab ? "rgba(197,160,89,0.12)" : "transparent",
                      border: activeTab === tab ? "1px solid rgba(197,160,89,0.3)" : "1px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    {labels[tab]}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <div key={activeTab}>
          {activeTab === "main" && (
            <MainDashboard
              search={search}
              filters={filters}
              selectedId={selectedId}
              onSelectId={setSelectedId}
            />
          )}
          {activeTab === "database" && (
            <DatabasePage
              search={search}
              filters={filters}
              onSelectContractor={(id) => { setSelectedId(id); setActiveTab("main"); }}
              onSearchAndNavigate={(term) => {
                setSearch(term);
                setSelectedId(null);
                setFilters(EMPTY_FILTERS);
                setActiveTab("main");
              }}
            />
          )}
          {activeTab === "contracts" && <ContractsPage />}
        </div>
      </div>
    </SplashGate>
  );
}

export default App;
