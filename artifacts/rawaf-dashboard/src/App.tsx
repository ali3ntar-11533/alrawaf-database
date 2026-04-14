import { useState } from "react";
import "./index.css";
import Header from "./components/Header";
import MainDashboard from "./components/MainDashboard";
import DatabasePage from "./components/DatabasePage";

export type TabType = "main" | "database";

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("main");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--body-bg)" }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <div key={activeTab}>
        {activeTab === "main" ? <MainDashboard /> : <DatabasePage />}
      </div>
    </div>
  );
}

export default App;
