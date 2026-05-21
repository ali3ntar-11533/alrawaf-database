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
    normalize(c.contractYear    ?? "").includes(n)           ||
    normalize(c.contractor).includes(n)                      ||
    normalize(c.project).includes(n)                         ||
    normalize(c.portfolio).includes(n)                       ||
    normalize(c.technicalScope).includes(n)                  ||
    normalize(c.workType).includes(n)                        ||
    normalize(c.workCategory    ?? "").includes(n)           ||
    normalize(c.mainActivity    ?? "").includes(n)           ||
    normalize(c.businessProgram ?? "").includes(n)           ||
    normalize(c.workFamily      ?? "").includes(n)           ||
    normalize(c.itemScope       ?? "").includes(n)           ||
    normalize(c.itemCode        ?? "").includes(n)           ||
    normalize(c.techSpecs       ?? "").includes(n)           ||
    normalize(c.measurements    ?? "").includes(n)           ||
    normalize(c.unit            ?? "").includes(n)           ||
    normalize(c.phone           ?? "").includes(n)           ||
    normalize(c.email           ?? "").includes(n)           ||
    normalize(c.localContent    ?? "").includes(n)           ||
    normalize(c.workDescription ?? "").includes(n)           ||
    normalize(c.workScopeText   ?? "").includes(n)
  );
}

function contractorMatchesFilters(c: Contractor, filters: FilterState): boolean {
  if (filters.contractor      && normalize(c.contractor)              !== normalize(filters.contractor))      return false;
  if (filters.portfolio       && normalize(c.portfolio)               !== normalize(filters.portfolio))       return false;
  if (filters.project         && normalize(c.project)                 !== normalize(filters.project))         return false;
  if (filters.businessProgram && normalize(c.businessProgram ?? "")   !== normalize(filters.businessProgram)) return false;
  if (filters.workFamily      && normalize(c.workFamily      ?? "")   !== normalize(filters.workFamily))      return false;
  if (filters.workType        && normalize(c.workType)                !== normalize(filters.workType))        return false;
  if (filters.workCategory    && normalize(c.workCategory    ?? "")   !== normalize(filters.workCategory))    return false;
  if (filters.itemScope       && normalize(c.itemScope       ?? "")   !== normalize(filters.itemScope))       return false;
  if (filters.techSpecs       && normalize(c.techSpecs       ?? "")   !== normalize(filters.techSpecs))       return false;
  if (filters.measurements    && normalize(c.measurements    ?? "")   !== normalize(filters.measurements))    return false;
  return true;
}

export default function MainDashboard({ search, filters, selectedId, onSelectId }: Props) {
  const { data: allContractors = [], isLoading } = useContractorsContext();

  const hasSearch       = search.trim().length > 0;
  // itemPrice is comparison-only — exclude it from sidebar filtering logic
  const hasFilters      = Object.entries(filters).some(([key, val]) => key !== "itemPrice" && Boolean(val));
  const hasDirectSelect = selectedId != null;

  // Identify the directly selected contractor
  const directRecord = hasDirectSelect
    ? allContractors.find((c: Contractor) => c.id === selectedId)
    : undefined;

  // Filtered list for the sidebar:
  //  - Searching / filtering → matches
  //  - Direct select (from DB) → similar items by family+type+scope hierarchy
  //  - Idle → empty (WelcomeHero)
  let filtered: Contractor[];
  if (hasSearch || hasFilters) {
    filtered = allContractors.filter((c: Contractor) => {
      const matchesSearch  = hasSearch  ? contractorMatchesSearch(c, search.trim()) : true;
      const matchesFilters = hasFilters ? contractorMatchesFilters(c, filters)     : true;
      return matchesSearch && matchesFilters;
    });
  } else if (hasDirectSelect && directRecord) {
    const n = (s: string) => (s ?? "").replace(/[\u064B-\u065F]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase().trim();
    const family = n(directRecord.workFamily ?? "");
    const type   = n(directRecord.workType);
    const scope  = n(directRecord.itemScope  ?? "");

    // L1: family + type + scope
    if (family && type && scope) {
      const pool = allContractors.filter((c: Contractor) =>
        n(c.workFamily ?? "") === family && n(c.workType) === type && n(c.itemScope ?? "") === scope
      );
      if (pool.length > 0) { filtered = pool; }
      else if (family && type) {
        // L2: family + type
        const pool2 = allContractors.filter((c: Contractor) =>
          n(c.workFamily ?? "") === family && n(c.workType) === type
        );
        filtered = pool2.length > 0 ? pool2 : allContractors.filter((c: Contractor) => n(c.workType) === type);
      } else {
        filtered = allContractors.filter((c: Contractor) => n(c.workType) === type);
      }
    } else if (family && type) {
      // L2: family + type
      const pool2 = allContractors.filter((c: Contractor) =>
        n(c.workFamily ?? "") === family && n(c.workType) === type
      );
      filtered = pool2.length > 0 ? pool2 : allContractors.filter((c: Contractor) => n(c.workType) === type);
    } else {
      // L3: type only
      filtered = allContractors.filter((c: Contractor) => n(c.workType) === type);
    }
  } else {
    filtered = [];
  }

  // Always resolve selectedId from the FULL dataset.
  const selected: Contractor | null =
    selectedId != null
      ? (allContractors.find((c: Contractor) => c.id === selectedId) ?? null)
      : filtered[0] ?? null;

  // Is the selected contractor part of the current filter result?
  // If not (e.g. navigated via work-history from outside the filter),
  // fall back to allContractors so price comparison stays meaningful.
  const selectedInFiltered = selected != null && filtered.some((c: Contractor) => c.id === selected.id);

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
        filteredContractors={filtered}
        isLoading={isLoading}
        onSelectId={onSelectId}
        customPrice={filters.itemPrice ? Number(filters.itemPrice) : null}
        emptyStateMessage={hasNoSearchResults ? "لا توجد نتائج مطابقة لهذا البحث أو الفلتر" : undefined}
      />
    </div>
  );
}
