import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import ContractSidebar from "./ContractSidebar";
import ContractDashboard from "./ContractDashboard";
import ContractRequests from "./ContractRequests";
import ContractDetail from "./ContractDetail";
import ContractTracking from "./ContractTracking";
import ContractArchive from "./ContractArchive";
import ContractAnalytics from "./ContractAnalytics";
import StageDetailPage from "./StageDetailPage";
import { computePendingByRole } from "./RoleSelector";
import { ROLES, type ContractTab } from "./types";
import type { Contract } from "./types";
import { listContracts, seedSampleContracts } from "./api";
import { useContractNotifications } from "./useContractNotifications";

const ROLE_KEY = "rawaf_contracts_role";
const NAME_KEY = "rawaf_contracts_name";

interface Props {
  onExit: () => void;
}

export default function ContractApp({ onExit }: Props) {
  const [role, setRole]           = useState(() => sessionStorage.getItem(ROLE_KEY) ?? "");
  const [actorName, setActorName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");
  const [activeTab, setActiveTab] = useState<ContractTab>("dashboard");
  const [openContractId, setOpenContractId] = useState<number | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filterStage, setFilterStage] = useState<number | null>(null);
  const [stageDetailNum, setStageDetailNum] = useState<number | null>(null);

  useEffect(() => {
    seedSampleContracts().catch(() => {}).finally(() => {
      listContracts().then(setContracts);
    });
  }, []);

  useEffect(() => {
    listContracts().then(setContracts);
  }, [openContractId, activeTab]);

  function handleRoleChange(newRole: string) {
    setRole(newRole);
    sessionStorage.setItem(ROLE_KEY, newRole);
  }

  function handleNameChange(name: string) {
    setActorName(name);
    sessionStorage.setItem(NAME_KEY, name);
  }

  function handleExit() {
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(NAME_KEY);
    onExit();
  }

  const refreshContracts = useCallback(() => {
    listContracts().then(setContracts).catch(() => {});
  }, []);

  const { notifications, unreadCount, markAllRead, dismissOne, dismissAll } =
    useContractNotifications({ role, actorName, enabled: !!role, onNewActivity: refreshContracts });

  function handleOpenContractFromNotification(contractId: number) {
    setOpenContractId(contractId);
  }

  const myRoleInfo  = ROLES.find(r => r.name === role);
  const myPending   = contracts.filter(c =>
    c.status !== "completed" && myRoleInfo?.stage.includes(c.currentStage)
  );
  const pendingCount    = myPending.length;
  const pendingByRole   = computePendingByRole(contracts);

  return (
    <div
      className="contract-app-wrapper"
      dir="rtl"
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        display: "flex", flexDirection: "row",
        background: "#F9F9F9",
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        overflowX: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div className="no-print">
        <ContractSidebar
          activeTab={activeTab}
          onTabChange={(tab) => { setActiveTab(tab); setOpenContractId(null); if (tab !== "requests") setFilterStage(null); }}
          pendingCount={pendingCount}
          onExit={handleExit}
          role={role}
          actorName={actorName}
          onRoleChange={handleRoleChange}
          onNameChange={handleNameChange}
          pendingByRole={pendingByRole}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllRead}
          onDismissOne={dismissOne}
          onDismissAll={dismissAll}
          onOpenContract={handleOpenContractFromNotification}
        />
      </div>

      <div className="no-print">
        <Toaster
          position="top-left"
          richColors
          dir="rtl"
          toastOptions={{
            style: {
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              direction: "rtl",
              textAlign: "right",
            },
          }}
        />
      </div>

      <div className="contract-main-content" style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        {openContractId !== null ? (
          <ContractDetail
            contractId={openContractId}
            role={role}
            actorName={actorName}
            onBack={() => setOpenContractId(null)}
          />
        ) : stageDetailNum !== null ? (
          <StageDetailPage
            stageNum={stageDetailNum}
            role={role}
            actorName={actorName}
            onBack={() => setStageDetailNum(null)}
            onOpenContract={(id) => { setStageDetailNum(null); setOpenContractId(id); }}
          />
        ) : activeTab === "dashboard" ? (
          <ContractDashboard
            role={role}
            actorName={actorName}
            contracts={contracts}
            pendingContracts={myPending}
            onOpenContract={setOpenContractId}
            onOpenStage={(n) => setStageDetailNum(n)}
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
