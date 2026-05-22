import { useState, useEffect, useRef } from "react";
import type { Contractor } from "./types";

const BASE = "/api";

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

export async function listContractors(limit?: number, offset?: number): Promise<Contractor[]> {
  const params = new URLSearchParams();
  if (limit  !== undefined) params.set("limit",  String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
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

export function useContractors() {
  const [data,       setData]       = useState<Contractor[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isError,    setIsError]    = useState(false);
  const [tick,       setTick]       = useState(0);

  /* Stable ref so the async loop can read the latest cancelled flag */
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setIsLoading(true);
    setIsError(false);
    setIsFetching(false);

    const run = async () => {
      try {
        /* ── First page: show UI immediately ── */
        const first = await listContractors(PAGE_SIZE, 0);
        if (cancelledRef.current) return;
        setData(first);
        setIsLoading(false);

        /* If the first page is not full there's nothing more to load */
        if (first.length < PAGE_SIZE) return;

        /* ── Background pages: accumulate silently ── */
        setIsFetching(true);
        const acc: Contractor[] = [...first];
        let offset = PAGE_SIZE;

        while (!cancelledRef.current) {
          const page = await listContractors(PAGE_SIZE, offset);
          if (cancelledRef.current) return;
          acc.push(...page);
          /* Spread a new array so React detects the change */
          setData([...acc]);
          if (page.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }
        if (!cancelledRef.current) setIsFetching(false);
      } catch {
        if (!cancelledRef.current) {
          setIsError(true);
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    };

    run();
    return () => { cancelledRef.current = true; };
  }, [tick]);

  function refetch() {
    setData([]);
    setTick((t) => t + 1);
  }

  return { data, isLoading, isFetching, isError, refetch };
}
