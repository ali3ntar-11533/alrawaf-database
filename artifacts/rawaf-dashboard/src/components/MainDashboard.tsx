import { useListContractors } from "@workspace/api-client-react";
import Sidebar from "./Sidebar";
import MainContent from "./MainContent";
import WelcomeHero from "./WelcomeHero";
import type { Contractor } from "@workspace/api-client-react";

interface Props {
  search: string;
  selectedId: number | null;
  onSelectId: (id: number) => void;
}

function normalize(s: string) {
  return s
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
    normalize(c.contractNo).includes(n)       ||
    normalize(c.contractor).includes(n)       ||
    normalize(c.project).includes(n)          ||
    normalize(c.portfolio).includes(n)        ||
    normalize(c.technicalScope).includes(n)   ||
    normalize(c.workType).includes(n)         ||
    normalize((c as any).workCategory ?? "").includes(n) ||
    normalize((c as any).mainActivity ?? "").includes(n) ||
    normalize((c as any).unit ?? "").includes(n) ||
    normalize(c.phone).includes(n)            ||
    normalize(c.email).includes(n)            ||
    normalize((c as any).localContent ?? "").includes(n)
  );
}

export default function MainDashboard({ search, selectedId, onSelectId }: Props) {
  const { data: allContractors = [], isLoading } = useListContractors();

  const hasSearch       = search.trim().length > 0;
  const hasDirectSelect = selectedId != null;

  // Identify the directly selected contractor (for same-name sidebar grouping)
  const directRecord = hasDirectSelect
    ? allContractors.find((c: Contractor) => c.id === selectedId)
    : undefined;

  // Filtered list for the sidebar:
  //  - Searching → only search matches
  //  - Direct select (from DB) → all records sharing the same contractor name
  //  - Idle → empty (WelcomeHero)
  const filtered: Contractor[] = hasSearch
    ? allContractors.filter((c: Contractor) => contractorMatchesSearch(c, search.trim()))
    : hasDirectSelect && directRecord
    ? allContractors.filter(
        (c: Contractor) =>
          c.contractor.trim().toLowerCase() === directRecord.contractor.trim().toLowerCase()
      )
    : [];

  // Always resolve selectedId from the FULL dataset, never from the filtered subset.
  // This ensures clicking min/avg/max stat tabs always navigates to the correct
  // contractor even when a search filter is active and that contractor is not in
  // the visible sidebar list.
  const selected: Contractor | null =
    selectedId != null
      ? (allContractors.find((c: Contractor) => c.id === selectedId) ?? null)
      : filtered[0] ?? null;

  const hasNoSearchResults = hasSearch && filtered.length === 0;

  // Show welcome only when truly idle — no search, no direct selection
  if (!hasSearch && !hasDirectSelect && !isLoading) {
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
        hasFilter={hasSearch || hasDirectSelect}
      />
      <MainContent
        contractor={selected}
        allContractors={allContractors}
        filteredContractors={filtered.length > 0 ? filtered : allContractors}
        isLoading={isLoading}
        onSelectId={onSelectId}
        emptyStateMessage={hasNoSearchResults ? "لا توجد نتائج مطابقة لهذا البحث" : undefined}
      />
    </div>
  );
}
