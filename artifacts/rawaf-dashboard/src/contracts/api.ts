import type { Contract, ContractStats, StageLog } from "./types";

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

export async function listContracts(params?: { status?: string; stage?: number }): Promise<Contract[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.stage !== undefined) qs.set("stage", String(params.stage));
  const q = qs.toString();
  return apiFetch<Contract[]>(`/contracts${q ? `?${q}` : ""}`);
}

export async function getContract(id: number): Promise<Contract> {
  return apiFetch<Contract>(`/contracts/${id}`);
}

export async function getContractStats(): Promise<ContractStats> {
  return apiFetch<ContractStats>("/contracts/stats");
}

export async function getContractAudit(id: number): Promise<StageLog[]> {
  return apiFetch<StageLog[]>(`/contracts/${id}/audit`);
}

export interface ContractDocument {
  id: number;
  contractId: number;
  stage: number;
  filename: string;
  fileType: string;
  uploadedBy: string;
  createdAt: string;
}

export async function getContractDocuments(id: number): Promise<ContractDocument[]> {
  return apiFetch<ContractDocument[]>(`/contracts/${id}/documents`);
}

export interface ContractPdfData {
  contract: Contract;
  auditLog: StageLog[];
  documents: ContractDocument[];
}

export async function getContractPdfData(id: number): Promise<ContractPdfData> {
  return apiFetch<ContractPdfData>(`/contracts/${id}/pdf-data`);
}

export interface CreateContractPayload {
  title: string;
  vendorName: string;
  vendorContact?: string;
  value?: number;
  startDate?: string;
  endDate?: string;
  contractType?: string;
  projectName?: string;
  createdBy?: string;
}

export async function createContract(payload: CreateContractPayload): Promise<Contract> {
  return apiFetch<Contract>("/contracts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface StageActionPayload {
  action: "advance" | "reject";
  actorRole: string;
  actorName: string;
  notes?: string;
  wordFilename?: string;
  signedFilename?: string;
}

export async function advanceStage(id: number, payload: StageActionPayload): Promise<Contract> {
  return apiFetch<Contract>(`/contracts/${id}/stage`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
