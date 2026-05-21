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
      if (user.role === "user") setActiveTab("main");
    };
    const onLogout = () => setCurrentUser(null);
    const onProfileUpdated = (e: Event) => {
      const user = (e as CustomEvent<CurrentUser>).detail;
      setCurrentUser(user);
      sessionStorage.setItem("rawaf_current_user", JSON.stringify(user));
    };
    window.addEventListener("rawaf-login",           onLogin          as EventListener);
    window.addEventListener("rawaf-logout",          onLogout         as EventListener);
    window.addEventListener("rawaf-profile-updated", onProfileUpdated as EventListener);
    return () => {
      window.removeEventListener("rawaf-login",           onLogin          as EventListener);
      window.removeEventListener("rawaf-logout",          onLogout         as EventListener);
      window.removeEventListener("rawaf-profile-updated", onProfileUpdated as EventListener);
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

  // Hide page scrollbar on welcome state (no search / filter / selection)
  useEffect(() => {
    const hasAnyFilter = Object.values(filters).some(v => v !== "");
    const isWelcome = activeTab === "main" && !search.trim() && !selectedId && !hasAnyFilter;
    document.body.classList.toggle("welcome-state", isWelcome);
    return () => { document.body.classList.remove("welcome-state"); };
  }, [activeTab, search, selectedId, filters]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setSelectedId(null);
  }

  function handleFiltersChange(f: FilterState) {
    // itemPrice is comparison-only — don't reset the selected contractor when only it changes
    const onlyPriceChanged =
      f.itemPrice !== filters.itemPrice &&
      f.contractor      === filters.contractor      &&
      f.portfolio       === filters.portfolio       &&
      f.project         === filters.project         &&
      f.businessProgram === filters.businessProgram &&
      f.workFamily      === filters.workFamily      &&
      f.workType        === filters.workType        &&
      f.workCategory    === filters.workCategory    &&
      f.itemScope       === filters.itemScope       &&
      f.techSpecs       === filters.techSpecs       &&
      f.measurements    === filters.measurements;
    setFilters(f);
    if (!onlyPriceChanged) setSelectedId(null);
  }

  const isWelcome = activeTab === "main" && !search.trim() && !selectedId && !Object.values(filters).some(v => v !== "");

  return (
    <SplashGate>
      <ContractorsProvider>
        <div style={{
          ...(isWelcome ? { height: "100vh", overflow: "hidden" } : { minHeight: "100vh" }),
          display: "flex", flexDirection: "column",
          backgroundColor: "var(--body-bg)",
        }}>
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            search={search}
            onSearchChange={handleSearchChange}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            currentUser={currentUser}
          />
          <div key={activeTab} style={{ flex: 1, minHeight: 0 }}>
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
                currentUser={currentUser}
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
