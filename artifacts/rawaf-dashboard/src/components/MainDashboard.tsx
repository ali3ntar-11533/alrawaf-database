import { FilterState } from "../App";
import { useListContractors } from "@workspace/api-client-react";
import Sidebar from "./Sidebar";
import MainContent from "./MainContent";
import type { Contractor } from "@workspace/api-client-react";

interface Props {
  filters: FilterState;
  selectedId: number | null;
  onSelectId: (id: number) => void;
}

export default function MainDashboard({ filters, selectedId, onSelectId }: Props) {
  const { data: allContractors = [], isLoading } = useListContractors();

  // Apply client-side filtering from header search inputs
  const filtered = allContractors.filter((c: Contractor) => {
    if (filters.contractNo    && !c.contractNo.toLowerCase().includes(filters.contractNo.toLowerCase()))       return false;
    if (filters.contractor    && !c.contractor.toLowerCase().includes(filters.contractor.toLowerCase()))       return false;
    if (filters.technicalScope && !c.technicalScope.toLowerCase().includes(filters.technicalScope.toLowerCase())) return false;
    if (filters.workType      && !c.workType.toLowerCase().includes(filters.workType.toLowerCase()))           return false;
    if (filters.project       && !c.project.toLowerCase().includes(filters.project.toLowerCase()))             return false;
    if (filters.portfolio     && !c.portfolio.toLowerCase().includes(filters.portfolio.toLowerCase()))         return false;
    return true;
  });

  // Selected contractor: prefer explicit selectedId, else first filtered result
  const selected: Contractor | null =
    (selectedId != null ? filtered.find((c: Contractor) => c.id === selectedId) : null) ??
    filtered[0] ??
    null;

  return (
    <div className="main-grid">
      <Sidebar
        filtered={filtered}
        allContractors={allContractors}
        selectedId={selected?.id ?? null}
        onSelect={onSelectId}
        isLoading={isLoading}
        technicalScopeFilter={filters.technicalScope}
      />
      <MainContent
        contractor={selected}
        allContractors={allContractors}
        filteredContractors={filtered}
        isLoading={isLoading}
      />
    </div>
  );
}
