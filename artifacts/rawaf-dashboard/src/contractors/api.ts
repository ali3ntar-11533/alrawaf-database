import { useState, useEffect, useRef } from "react";
import type { Contractor } from "./types";

const BASE = "/api";

/* ── Cache helpers (sessionStorage, 1-hour TTL) ────────────────────────────
   Stores the fully-loaded contractors array so the page loads instantly on
   revisit within the same browser session.  sessionStorage is cleared
   automatically when the tab is closed — no stale data across sessions.
   Uses try/catch so quota errors (large datasets) are silently ignored.  */
const CACHE_KEY = "rawaf_c_v2";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function readCache(): Contractor[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: Contractor[] };
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}

function writeCache(data: Contractor[]): void {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); }
  catch { /* quota exceeded for very large datasets — skip silently */ }
}

export function clearContractorsCache(): void {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

/* ── Core fetch helper ───────────────────────────────────────────────────*/
const PAGE_SIZE = 2000;

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/* limit / offset / q(search) are all optional */
export async function listContractors(
  limit?: number,
  offset?: number,
  q?: string,
): Promise<Contractor[]> {
  const params = new URLSearchParams();
  if (limit  !== undefined) params.set("limit",  String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  if (q)                    params.set("q",      q);
  const qs = params.toString();
  return apiFetch<Contractor[]>(`/contractors${qs ? `?${qs}` : ""}`);
}

export async function createContractor(data: Omit<Contractor, "id">): Promise<Contractor> {
  return apiFetch<Contractor>("/contractors", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface BulkCreateResult {
  saved:     number;
  total:     number;
  elapsedMs: number;
  errors:    { index: number; message: string }[];
}
export async function bulkCreateContractors(
  items: Omit<Contractor, "id">[],
): Promise<BulkCreateResult> {
  return apiFetch<BulkCreateResult>("/contractors/bulk", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function updateContractor(id: number, data: Partial<Omit<Contractor, "id">>): Promise<Contractor> {
  return apiFetch<Contractor>(`/contractors/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteContractor(id: number): Promise<void> {
  return apiFetch<void>(`/contractors/${id}`, { method: "DELETE" });
}

/* ── Server-side full-text search ───────────────────────────────────────
   Debounces the search term by 300 ms, then sends it to the server which
   runs ILIKE across every text column. Returns up to 500 matches from the
   COMPLETE database — independent of how much data is loaded in memory.  */
export function useServerSearch(term: string) {
  const [results,    setResults]    = useState<Contractor[] | null>(null);
  const [isSearching, setSearching] = useState(false);
  const latestTerm = useRef(term);
  latestTerm.current = term;

  useEffect(() => {
    if (!term.trim()) {
      setResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);

    const id = setTimeout(async () => {
      try {
        const data = await listContractors(500, 0, term.trim());
        if (latestTerm.current === term) setResults(data);
      } catch {
        /* network error — fall back to in-memory search silently */
        if (latestTerm.current === term) setResults(null);
      } finally {
        if (latestTerm.current === term) setSearching(false);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [term]);

  return { results, isSearching };
}

/* All DISTINCT values for each filter field — one light DB call */
export interface FilterOptionsMap {
  contractor:      string[];
  portfolio:       string[];
  mainActivity:    string[];
  businessProgram: string[];
  workFamily:      string[];
  workType:        string[];
  itemScope:       string[];
  techSpecs:       string[];
  measurements:    string[];
  workCategory:    string[];
}

export async function fetchFilterOptions(): Promise<FilterOptionsMap> {
  return apiFetch<FilterOptionsMap>("/contractors/filter-options");
}

export function useFilterOptions() {
  const [options, setOptions] = useState<FilterOptionsMap | null>(null);

  useEffect(() => {
    fetchFilterOptions()
      .then(setOptions)
      .catch(() => {/* silently ignore; FilterBar falls back to loaded data */});
  }, []);

  return options;
}

/* ── Progressive background loader with localStorage cache ──────────────
   First visit:     progressive load 2000/batch (shows data after ~1 s)
   Subsequent visits: instant load from localStorage, then silent refresh   */
export function useContractors() {
  const initialCache = useRef<Contractor[] | null | "checked">(null);
  if (initialCache.current === null) initialCache.current = readCache();

  const cached = initialCache.current !== "checked" ? initialCache.current : null;

  const [data,       setData]       = useState<Contractor[]>(cached ?? []);
  const [isLoading,  setIsLoading]  = useState(cached === null);
  const [isFetching, setIsFetching] = useState(false);
  const [isError,    setIsError]    = useState(false);
  const [tick,       setTick]       = useState(0);

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setIsError(false);

    /* Was fresh cache used on this mount? Only on tick 0. */
    const fromCache = tick === 0 && cached !== null;

    const run = async () => {
      try {
        if (!fromCache) {
          /* ── Cold start: load first page quickly, then background load ── */
          setIsLoading(true);
          setIsFetching(false);

          const first = await listContractors(PAGE_SIZE, 0);
          if (cancelledRef.current) return;
          setData(first);
          setIsLoading(false);

          if (first.length < PAGE_SIZE) { writeCache(first); return; }

          setIsFetching(true);
          const acc: Contractor[] = [...first];
          let offset = PAGE_SIZE;

          while (!cancelledRef.current) {
            const page = await listContractors(PAGE_SIZE, offset);
            if (cancelledRef.current) return;
            acc.push(...page);
            setData([...acc]);
            if (page.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
          }

          if (!cancelledRef.current) {
            writeCache(acc);
            setIsFetching(false);
          }
        } else {
          /* ── Cache hit: data already shown — silent background refresh ── */
          setIsFetching(true);
          const acc: Contractor[] = [];
          let offset = 0;

          while (!cancelledRef.current) {
            const page = await listContractors(PAGE_SIZE, offset);
            if (cancelledRef.current) return;
            acc.push(...page);
            if (page.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
          }

          if (!cancelledRef.current) {
            setData([...acc]);
            writeCache(acc);
            setIsFetching(false);
          }
        }
      } catch {
        if (!cancelledRef.current) {
          if (!fromCache) { setIsError(true); setIsLoading(false); }
          setIsFetching(false);
        }
      }
    };

    run();
    return () => { cancelledRef.current = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  function refetch() {
    clearContractorsCache();
    initialCache.current = "checked"; // prevent re-reading stale cache
    setData([]);
    setTick((t) => t + 1);
  }

  /* Optimistic local update — mutates the in-memory array and cache immediately
     without triggering a server round-trip. Use after successful API mutations. */
  function updateData(updater: (prev: Contractor[]) => Contractor[]) {
    setData((prev) => {
      const next = updater(prev);
      writeCache(next);
      return next;
    });
  }

  return { data, isLoading, isFetching, isError, refetch, updateData };
}
