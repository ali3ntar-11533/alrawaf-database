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

function fuzzyMatch(haystack: string, needle: string) {
  if (!needle) return true;
  const h = normalize(haystack);
  const n = normalize(needle);
  if (h.includes(n)) return true;
  if (n.length >= 3) {
    for (let i = 0; i <= n.length - 3; i++) {
      if (h.includes(n.slice(i, i + 3))) return true;
    }
  }
  return false;
}

function contractorMatchesSearch(c: Contractor, search: string): boolean {
  if (!search) return false;
  return (
    fuzzyMatch(c.contractNo, search) ||
    fuzzyMatch(c.contractor, search) ||
    fuzzyMatch(c.project, search) ||
    fuzzyMatch(c.portfolio, search) ||
    fuzzyMatch(c.technicalScope, search) ||
    fuzzyMatch(c.workType, search) ||
    fuzzyMatch((c as any).workCategory ?? "", search) ||
    fuzzyMatch((c as any).unit ?? "", search) ||
    fuzzyMatch(c.phone, search) ||
    fuzzyMatch(c.email, search)
  );
}

export default function MainDashboard({ search, selectedId, onSelectId }: Props) {
  const { data: allContractors = [], isLoading } = useListContractors();

  const hasSearch = search.trim().length > 0;

  const filtered = hasSearch
    ? allContractors.filter((c: Contractor) => contractorMatchesSearch(c, search.trim()))
    : [];

  const selected: Contractor | null = !hasSearch
    ? null
    : (selectedId != null ? filtered.find((c: Contractor) => c.id === selectedId) : null) ??
      filtered[0] ??
      null;

  if (!hasSearch && !isLoading) {
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
        hasFilter={hasSearch}
        workTypeFilter=""
      />
      <MainContent
        contractor={selected}
        allContractors={allContractors}
        filteredContractors={filtered}
        isLoading={isLoading}
        onSelectId={onSelectId}
      />
    </div>
  );
}
