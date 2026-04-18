import { useState } from "react";
import "./index.css";
import Header from "./components/Header";
import MainDashboard from "./components/MainDashboard";
import DatabasePage from "./components/DatabasePage";
import SplashGate from "./components/SplashGate";

export type TabType = "main" | "database";

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("main");
  const [search, setSearch]       = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    setSelectedId(null);
  }

  return (
    <SplashGate>
      <div style={{ minHeight: "100vh", backgroundColor: "var(--body-bg)" }}>
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          search={search}
          onSearchChange={handleSearchChange}
        />
        <div key={activeTab}>
          {activeTab === "main" ? (
            <MainDashboard
              search={search}
              selectedId={selectedId}
              onSelectId={setSelectedId}
            />
          ) : (
            <DatabasePage
              search={search}
              onSelectContractor={(id) => { setSelectedId(id); setActiveTab("main"); }}
              onSearchAndNavigate={(term) => { setSearch(term); setSelectedId(null); setActiveTab("main"); }}
            />
          )}
        </div>
      </div>
    </SplashGate>
  );
}

export default App;
