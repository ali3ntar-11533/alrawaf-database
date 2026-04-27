import { useContractorsContext } from "../contractors/context";
import Sidebar from "./Sidebar";
import MainContent from "./MainContent";
import WelcomeHero from "./WelcomeHero";
import type { Contractor } from "../contractors/types";
import type { FilterState } from "./filterTypes";

interface Props {
  search:      string;
  filters:     FilterState;
  selectedId:  number | null;
  onSelectId:  (id: number) => void;
}

function normalize(s: string) {
  return (s ?? "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

function contractorMatchesSearch(c: Contractor, search: string): boolean {
  if (!search) return false;
  const n = normalize(search);
  return (
    normalize(c.contractNo).includes(n)                      ||
    normalize(c.contractor).includes(n)                      ||
    normalize(c.project).includes(n)                         ||
    normalize(c.portfolio).includes(n)                       ||
    normalize(c.technicalScope).includes(n)                  ||
    normalize(c.workType).includes(n)                        ||
    normalize((c as any).workCategory ?? "").includes(n)     ||
    normalize((c as any).mainActivity ?? "").includes(n)     ||
    normalize((c as any).businessProgram ?? "").includes(n)  ||
    normalize((c as any).unit ?? "").includes(n)             ||
    normalize(c.phone ?? "").includes(n)                     ||
    normalize(c.email ?? "").includes(n)                     ||
    normalize((c as any).localContent ?? "").includes(n)
  );
}

function contractorMatchesFilters(c: Contractor, filters: FilterState): boolean {
  if (filters.contractor && normalize(c.contractor) !== normalize(filters.contractor)) return false;
  if (filters.portfolio  && normalize(c.portfolio)  !== normalize(filters.portfolio))  return false;
  if (filters.project    && normalize(c.project)    !== normalize(filters.project))    return false;
  if (filters.businessProgram && normalize((c as any).businessProgram ?? "") !== normalize(filters.businessProgram)) return false;
  if (filters.workType   && normalize(c.workType)   !== normalize(filters.workType))   return false;
  if (filters.workCategory && normalize((c as any).workCategory ?? "") !== normalize(filters.workCategory)) return false;
  return true;
}

export default function MainDashboard({ search, filters, selectedId, onSelectId }: Props) {
  const { data: allContractors = [], isLoading } = useContractorsContext();

  const hasSearch       = search.trim().length > 0;
  const hasFilters      = Object.values(filters).some(Boolean);
  const hasDirectSelect = selectedId != null;

  // Identify the directly selected contractor (for same-name sidebar grouping)
  const directRecord = hasDirectSelect
    ? allContractors.find((c: Contractor) => c.id === selectedId)
    : undefined;

  // Filtered list for the sidebar:
  //  - Searching / filtering → matches
  //  - Direct select (from DB) → all records sharing the same contractor name
  //  - Idle → empty (WelcomeHero)
  let filtered: Contractor[];
  if (hasSearch || hasFilters) {
    filtered = allContractors.filter((c: Contractor) => {
      const matchesSearch  = hasSearch  ? contractorMatchesSearch(c, search.trim()) : true;
      const matchesFilters = hasFilters ? contractorMatchesFilters(c, filters)     : true;
      return matchesSearch && matchesFilters;
    });
  } else if (hasDirectSelect && directRecord) {
    filtered = allContractors.filter(
      (c: Contractor) =>
        c.contractor.trim().toLowerCase() === directRecord.contractor.trim().toLowerCase()
    );
  } else {
    filtered = [];
  }

  // Always resolve selectedId from the FULL dataset.
  const selected: Contractor | null =
    selectedId != null
      ? (allContractors.find((c: Contractor) => c.id === selectedId) ?? null)
      : filtered[0] ?? null;

  const hasNoSearchResults = (hasSearch || hasFilters) && filtered.length === 0;

  // Show welcome only when truly idle — no search, no filters, no direct selection
  if (!hasSearch && !hasFilters && !hasDirectSelect && !isLoading) {
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
        hasFilter={hasSearch || hasFilters || hasDirectSelect}
      />
      <MainContent
        contractor={selected}
        allContractors={allContractors}
        filteredContractors={filtered.length > 0 ? filtered : allContractors}
        isLoading={isLoading}
        onSelectId={onSelectId}
        customPrice={filters.itemPrice ? Number(filters.itemPrice) : null}
        emptyStateMessage={hasNoSearchResults ? "لا توجد نتائج مطابقة لهذا البحث أو الفلتر" : undefined}
      />
    </div>
  );
}
