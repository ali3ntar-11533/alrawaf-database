import { useEffect, useState } from "react";
import ContractSidebar from "./ContractSidebar";
import ContractDashboard from "./ContractDashboard";
import ContractRequests from "./ContractRequests";
import ContractDetail from "./ContractDetail";
import ContractTracking from "./ContractTracking";
import ContractArchive from "./ContractArchive";
import ContractAnalytics from "./ContractAnalytics";
import RoleSelector, { computePendingByRole } from "./RoleSelector";
import { ROLES, type ContractTab } from "./types";
import type { Contract } from "./types";
import { listContracts } from "./api";

const ROLE_KEY = "rawaf_contracts_role";
const NAME_KEY = "rawaf_contracts_name";

interface Props {
  onExit: () => void;
}

export default function ContractApp({ onExit }: Props) {
  const [role, setRole] = useState(() => sessionStorage.getItem(ROLE_KEY) ?? "");
  const [actorName, setActorName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");
  const [activeTab, setActiveTab] = useState<ContractTab>("dashboard");
  const [openContractId, setOpenContractId] = useState<number | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [filterStage, setFilterStage] = useState<number | null>(null);

  useEffect(() => {
    if (!role) return;
    setLoadingContracts(true);
    listContracts().then(setContracts).finally(() => setLoadingContracts(false));
  }, [role, openContractId, activeTab]);

  function handleRoleSelect(selectedRole: string, name: string) {
    setRole(selectedRole);
    setActorName(name);
    sessionStorage.setItem(ROLE_KEY, selectedRole);
    sessionStorage.setItem(NAME_KEY, name);
  }

  function handleExit() {
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(NAME_KEY);
    onExit();
  }

  const pendingByRole = computePendingByRole(contracts);
  const myRoleInfo = ROLES.find(r => r.name === role);
  const myPending = contracts.filter(c =>
    c.status !== "completed" && myRoleInfo?.stage.includes(c.currentStage)
  );
  const pendingCount = myPending.length;

  if (!role) {
    return (
      <RoleSelector
        onSelect={handleRoleSelect}
        pendingByRole={pendingByRole}
      />
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        display: "flex", flexDirection: "row",
        background: "#f5f3ee",
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        overflowX: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <ContractSidebar
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setOpenContractId(null); if (tab !== "requests") setFilterStage(null); }}
        pendingCount={pendingCount}
        onExit={handleExit}
        roleName={role}
      />

      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        {openContractId !== null ? (
          <ContractDetail
            contractId={openContractId}
            role={role}
            actorName={actorName}
            onBack={() => setOpenContractId(null)}
          />
        ) : activeTab === "dashboard" ? (
          <ContractDashboard
            roleName={role}
            pendingContracts={myPending}
            onOpenContract={setOpenContractId}
          />
        ) : activeTab === "requests" ? (
          <ContractRequests
            role={role}
            actorName={actorName}
            onOpenContract={setOpenContractId}
            filterStage={filterStage ?? undefined}
            onClearFilter={() => setFilterStage(null)}
          />
        ) : activeTab === "tracking" ? (
          <ContractTracking
            role={role}
            onOpenContract={setOpenContractId}
          />
        ) : activeTab === "analytics" ? (
          <ContractAnalytics
            onNavigateStage={(stage) => {
              setFilterStage(stage);
              setActiveTab("requests");
              setOpenContractId(null);
            }}
          />
        ) : (
          <ContractArchive onOpenContract={setOpenContractId} />
        )}
      </div>
    </div>
  );
}
