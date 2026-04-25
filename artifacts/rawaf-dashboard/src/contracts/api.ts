import type { Contract, ContractStats, StageLog, ContractComment } from "./types";

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

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  valueMin?: number;
  valueMax?: number;
  contractType?: string;
  vendorName?: string;
}

export async function listContracts(params?: { status?: string; stage?: number } & AnalyticsFilters): Promise<Contract[]> {
  const qs = new URLSearchParams();
  if (params?.status)              qs.set("status",   params.status);
  if (params?.stage !== undefined) qs.set("stage",    String(params.stage));
  if (params?.dateFrom)            qs.set("dateFrom", params.dateFrom);
  if (params?.dateTo)              qs.set("dateTo",   params.dateTo);
  if (params?.valueMin !== undefined) qs.set("valueMin", String(params.valueMin));
  if (params?.valueMax !== undefined) qs.set("valueMax", String(params.valueMax));
  if (params?.contractType)        qs.set("contractType", params.contractType);
  if (params?.vendorName)          qs.set("vendorName",   params.vendorName);
  const q = qs.toString();
  return apiFetch<Contract[]>(`/contracts${q ? `?${q}` : ""}`);
}

export async function getContract(id: number): Promise<Contract> {
  return apiFetch<Contract>(`/contracts/${id}`);
}

export async function getContractStats(params?: AnalyticsFilters): Promise<ContractStats> {
  const qs = new URLSearchParams();
  if (params?.dateFrom)            qs.set("dateFrom", params.dateFrom);
  if (params?.dateTo)              qs.set("dateTo",   params.dateTo);
  if (params?.valueMin !== undefined) qs.set("valueMin", String(params.valueMin));
  if (params?.valueMax !== undefined) qs.set("valueMax", String(params.valueMax));
  if (params?.contractType)        qs.set("contractType", params.contractType);
  if (params?.vendorName)          qs.set("vendorName",   params.vendorName);
  const q = qs.toString();
  return apiFetch<ContractStats>(`/contracts/stats${q ? `?${q}` : ""}`);
}

export async function getContractAudit(id: number): Promise<StageLog[]> {
  return apiFetch<StageLog[]>(`/contracts/${id}/audit`);
}

export interface ActivityEntry {
  logId: number;
  stage: number;
  action: string;
  actorRole: string;
  actorName: string;
  notes: string;
  logCreatedAt: string;
  contractId: number;
  contractNo: string;
  title: string;
}

export async function getRecentActivity(params?: Pick<AnalyticsFilters, "dateFrom" | "dateTo" | "contractType" | "vendorName">): Promise<ActivityEntry[]> {
  const qs = new URLSearchParams();
  if (params?.dateFrom)     qs.set("dateFrom",     params.dateFrom);
  if (params?.dateTo)       qs.set("dateTo",       params.dateTo);
  if (params?.contractType) qs.set("contractType", params.contractType);
  if (params?.vendorName)   qs.set("vendorName",   params.vendorName);
  const q = qs.toString();
  return apiFetch<ActivityEntry[]>(`/contracts/activity${q ? `?${q}` : ""}`);
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

export async function seedSampleContracts(): Promise<{ seeded?: boolean; skipped?: boolean }> {
  return apiFetch<{ seeded?: boolean; skipped?: boolean }>("/contracts/seed", { method: "POST" });
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

export async function getContractComments(id: number): Promise<ContractComment[]> {
  return apiFetch<ContractComment[]>(`/contracts/${id}/comments`);
}

export interface AddCommentPayload {
  actorName: string;
  actorRole: string;
  message: string;
}

export async function addContractComment(id: number, payload: AddCommentPayload): Promise<ContractComment> {
  return apiFetch<ContractComment>(`/contracts/${id}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getVendors(): Promise<string[]> {
  return apiFetch<string[]>("/contracts/vendors");
}

export interface MyApprovedContract {
  contractId: number;
  contractNo: string;
  title: string;
  vendorName: string;
  currentStage: number;
  status: string;
  rejectionReason: string | null;
  approvedAt: string;
  approvedStage: number;
}

export async function getMyApprovedContracts(actorName: string): Promise<MyApprovedContract[]> {
  const qs = new URLSearchParams({ actorName });
  return apiFetch<MyApprovedContract[]>(`/contracts/my-approved?${qs}`);
}
