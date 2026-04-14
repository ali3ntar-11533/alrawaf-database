import { FilterState } from "../App";
import { useListContractors } from "@workspace/api-client-react";
import Sidebar from "./Sidebar";
import MainContent from "./MainContent";
import WelcomeHero from "./WelcomeHero";
import type { Contractor } from "@workspace/api-client-react";

interface Props {
  filters: FilterState;
  selectedId: number | null;
  onSelectId: (id: number) => void;
}

function hasAnyFilter(f: FilterState) {
  return Object.values(f).some((v) => v.trim().length > 0);
}

export default function MainDashboard({ filters, selectedId, onSelectId }: Props) {
  const { data: allContractors = [], isLoading } = useListContractors();

  const anyFilter = hasAnyFilter(filters);

  const filtered = anyFilter
    ? allContractors.filter((c: Contractor) => {
        if (filters.contractNo    && !c.contractNo.toLowerCase().includes(filters.contractNo.toLowerCase()))         return false;
        if (filters.contractor    && !c.contractor.toLowerCase().includes(filters.contractor.toLowerCase()))         return false;
        if (filters.technicalScope && !c.technicalScope.toLowerCase().includes(filters.technicalScope.toLowerCase())) return false;
        if (filters.workType      && !c.workType.toLowerCase().includes(filters.workType.toLowerCase()))             return false;
        if (filters.project       && !c.project.toLowerCase().includes(filters.project.toLowerCase()))               return false;
        if (filters.portfolio     && !c.portfolio.toLowerCase().includes(filters.portfolio.toLowerCase()))           return false;
        return true;
      })
    : [];

  const selected: Contractor | null =
    !anyFilter
      ? null
      : (selectedId != null ? filtered.find((c: Contractor) => c.id === selectedId) : null) ??
        filtered[0] ??
        null;

  if (!anyFilter && !isLoading) {
    return <WelcomeHero />;
  }

  return (
    <div className="main-grid">
      <Sidebar
        filtered={filtered}
        allContractors={allContractors}
        selectedId={selected?.id ?? null}
        onSelect={onSelectId}
        isLoading={isLoading}
        hasFilter={anyFilter}
        workTypeFilter={filters.workType}
      />
      <MainContent
        contractor={selected}
        allContractors={allContractors}
        filteredContractors={filtered}
        isLoading={isLoading}
        onSelectId={onSelectId}
        workTypeFilter={filters.workType}
      />
    </div>
  );
}
