import { useState } from "react";
import "./index.css";
import Header from "./components/Header";
import MainDashboard from "./components/MainDashboard";
import DatabasePage from "./components/DatabasePage";

export type TabType = "main" | "database";

export interface FilterState {
  contractNo: string;
  contractor: string;
  technicalScope: string;
  workType: string;
  project: string;
  portfolio: string;
}

const EMPTY_FILTERS: FilterState = {
  contractNo: "",
  contractor: "",
  technicalScope: "",
  workType: "",
  project: "",
  portfolio: "",
};

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("main");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  function updateFilter(key: keyof FilterState, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setSelectedId(null);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--body-bg)" }}>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        filters={filters}
        onFilterChange={updateFilter}
      />
      <div key={activeTab}>
        {activeTab === "main" ? (
          <MainDashboard
            filters={filters}
            selectedId={selectedId}
            onSelectId={setSelectedId}
          />
        ) : (
          <DatabasePage onSelectContractor={(id) => { setSelectedId(id); setActiveTab("main"); }} />
        )}
      </div>
    </div>
  );
}

export default App;
