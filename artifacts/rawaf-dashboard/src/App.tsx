import { useState, useEffect } from "react";
import "./index.css";
import Header from "./components/Header";
import MainDashboard from "./components/MainDashboard";
import DatabasePage from "./components/DatabasePage";
import SplashGate from "./components/SplashGate";
import { EMPTY_FILTERS, type FilterState } from "./components/filterTypes";
import { ContractorsProvider } from "./contractors/context";

export type TabType = "main" | "database";

export interface CurrentUser {
  id: number;
  name: string;
  loginName: string;
  jobTitle: string;
  role: string;
  isActive: number;
  lastActive: string | null;
  createdAt: string;
}

function readCurrentUser(): CurrentUser | null {
  try {
    const s = sessionStorage.getItem("rawaf_current_user");
    return s ? (JSON.parse(s) as CurrentUser) : null;
  } catch { return null; }
}

function App() {
  const [activeTab, setActiveTab]     = useState<TabType>("main");
  const [search, setSearch]           = useState("");
  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [filters, setFilters]         = useState<FilterState>(EMPTY_FILTERS);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(readCurrentUser);

  useEffect(() => {
    const onLogin = (e: Event) => {
      const user = (e as CustomEvent<CurrentUser>).detail;
      setCurrentUser(user);
    };
    const onLogout = () => setCurrentUser(null);
    window.addEventListener("rawaf-login",  onLogin  as EventListener);
    window.addEventListener("rawaf-logout", onLogout as EventListener);
    return () => {
      window.removeEventListener("rawaf-login",  onLogin  as EventListener);
      window.removeEventListener("rawaf-logout", onLogout as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const ping = () =>
      fetch("/api/auth/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginName: currentUser.loginName }),
      }).catch(() => {});
    void ping();
    const t = setInterval(() => void ping(), 60_000);
    return () => clearInterval(t);
  }, [currentUser]);

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
            currentUser={currentUser}
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
