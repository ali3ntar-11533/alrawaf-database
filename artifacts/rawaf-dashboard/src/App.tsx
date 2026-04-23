import { useState } from "react";
import "./index.css";
import Header from "./components/Header";
import MainDashboard from "./components/MainDashboard";
import DatabasePage from "./components/DatabasePage";
import SplashGate from "./components/SplashGate";
import { EMPTY_FILTERS, type FilterState } from "./components/filterTypes";
import { ContractorsProvider } from "./contractors/context";

export type TabType = "main" | "database";

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
      <ContractorsProvider>
      <div style={{ minHeight: "100vh", backgroundColor: "var(--body-bg)" }}>
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          search={search}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <div key={activeTab}>
          {activeTab === "main" ? (
            <MainDashboard
              search={search}
              filters={filters}
              selectedId={selectedId}
              onSelectId={setSelectedId}
            />
          ) : (
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
        </div>
      </div>
      </ContractorsProvider>
    </SplashGate>
  );
}

export default App;
