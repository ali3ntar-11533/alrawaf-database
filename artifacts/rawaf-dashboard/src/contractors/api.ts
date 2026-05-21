import { useState, useEffect } from "react";
import type { Contractor } from "./types";

const BASE = "/api";

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

export async function listContractors(): Promise<Contractor[]> {
  return apiFetch<Contractor[]>("/contractors");
}

export async function createContractor(data: Omit<Contractor, "id">): Promise<Contractor> {
  return apiFetch<Contractor>("/contractors", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* Bulk import — sends the entire array in ONE round-trip. Server handles
   item-code allocation + insertion inside a single transaction. */
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
  const [data, setData] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    listContractors()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsError(true);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  function refetch() {
    setTick((t) => t + 1);
  }

  return { data, isLoading, isError, refetch };
}
