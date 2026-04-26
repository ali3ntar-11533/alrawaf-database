import { useCallback, useEffect, useRef, useState } from "react";
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

/* ── Page transition wrapper ─────────────────────────────── */
function PageTransition({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div key={id} style={{ animation: "pageSlideIn 0.26s cubic-bezier(0.22,1,0.36,1) both", height: "100%" }}>
      {children}
    </div>
  );
}

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
  const navSeq = useRef(0);

  /* ── Derive a unique key for current view (drives CSS animation) */
  const viewKey = openContractId !== null
    ? `contract-${openContractId}`
    : stageDetailNum !== null
    ? `stage-${stageDetailNum}`
    : `tab-${activeTab}`;

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

  /* ── Navigate helpers — each bumps navSeq to force key change */
  function openContract(id: number) {
    navSeq.current += 1;
    setStageDetailNum(null);
    setOpenContractId(id);
  }
  function openStage(n: number) {
    navSeq.current += 1;
    setOpenContractId(null);
    setStageDetailNum(n);
  }
  function closeDetail() {
    navSeq.current += 1;
    setOpenContractId(null);
    setStageDetailNum(null);
  }
  function switchTab(tab: ContractTab) {
    navSeq.current += 1;
    setActiveTab(tab);
    setOpenContractId(null);
    if (tab !== "requests") setFilterStage(null);
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
        background: "#FFFFFF",
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes pageSlideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.995); }
          to   { opacity: 1; transform: translateY(0)   scale(1);     }
        }
        @keyframes pageFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <link
        href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div className="no-print">
        <ContractSidebar
          activeTab={activeTab}
          onTabChange={switchTab}
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

      <div
        className="contract-main-content"
        style={{ flex: 1, overflowY: "auto", minWidth: 0, position: "relative" }}
      >
        <PageTransition id={`${viewKey}-${navSeq.current}`}>
          {openContractId !== null ? (
            <ContractDetail
              contractId={openContractId}
              role={role}
              actorName={actorName}
              onBack={closeDetail}
            />
          ) : stageDetailNum !== null ? (
            <StageDetailPage
              stageNum={stageDetailNum}
              role={role}
              actorName={actorName}
              onBack={closeDetail}
              onOpenContract={(id) => { closeDetail(); openContract(id); }}
            />
          ) : activeTab === "dashboard" ? (
            <ContractDashboard
              role={role}
              actorName={actorName}
              contracts={contracts}
              pendingContracts={myPending}
              onOpenContract={openContract}
              onOpenStage={openStage}
            />
          ) : activeTab === "requests" ? (
            <ContractRequests
              role={role}
              actorName={actorName}
              onOpenContract={openContract}
              filterStage={filterStage ?? undefined}
              onClearFilter={() => setFilterStage(null)}
            />
          ) : activeTab === "tracking" ? (
            <ContractTracking
              role={role}
              onOpenContract={openContract}
            />
          ) : activeTab === "analytics" ? (
            <ContractAnalytics
              onNavigateStage={(stage) => {
                setFilterStage(stage);
                switchTab("requests");
              }}
            />
          ) : (
            <ContractArchive onOpenContract={openContract} />
          )}
        </PageTransition>
      </div>
    </div>
  );
}
