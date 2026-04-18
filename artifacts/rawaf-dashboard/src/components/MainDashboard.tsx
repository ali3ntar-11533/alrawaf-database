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
  return (s ?? "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

/** Levenshtein distance (edit distance) between two strings */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Fuzzy score for a single field vs a query token.
 * Returns a value 0–1: 1 = exact include, 0.7 = close edit-distance, 0 = no match.
 */
function fieldTokenScore(fieldNorm: string, queryToken: string): number {
  if (!fieldNorm || !queryToken) return 0;
  if (fieldNorm.includes(queryToken)) return 1;
  // Split field into words and check each word
  const words = fieldNorm.split(/\s+/).filter((w) => w.length > 0);
  for (const word of words) {
    const maxDist = Math.max(1, Math.floor(queryToken.length * 0.35));
    if (levenshtein(word, queryToken) <= maxDist) return 0.7;
    // Prefix match: field word starts with query token (3+ chars)
    if (queryToken.length >= 3 && word.startsWith(queryToken.slice(0, queryToken.length - 1))) return 0.6;
  }
  return 0;
}

/**
 * Overall fuzzy match score for a contractor against a multi-token query.
 * Checks all relevant fields and returns a score > 0 if there is any match.
 */
function contractorFuzzyScore(c: Contractor, search: string): number {
  if (!search) return 0;
  const queryTokens = normalize(search)
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (queryTokens.length === 0) return 0;

  const fields = [
    normalize(c.contractor),
    normalize(c.technicalScope),
    normalize(c.workType),
    normalize(c.project),
    normalize(c.portfolio),
    normalize(c.contractNo),
    normalize((c as any).workCategory ?? ""),
    normalize((c as any).mainActivity ?? ""),
    normalize((c as any).unit ?? ""),
    normalize(c.phone ?? ""),
    normalize(c.email ?? ""),
    normalize((c as any).localContent ?? ""),
  ];

  let totalScore = 0;
  for (const token of queryTokens) {
    let bestForToken = 0;
    for (const field of fields) {
      const s = fieldTokenScore(field, token);
      if (s > bestForToken) bestForToken = s;
    }
    totalScore += bestForToken;
  }

  // Normalize: average score per token; require at least half the tokens to match
  const avgScore = totalScore / queryTokens.length;
  const minMatchRatio = queryTokens.length > 1 ? 0.4 : 0.5;
  return avgScore >= minMatchRatio ? avgScore : 0;
}

function contractorMatchesSearch(c: Contractor, search: string): boolean {
  return contractorFuzzyScore(c, search) > 0;
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
