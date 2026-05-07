export * from "./generated/api";

/* Re-export only the TypeScript interfaces that are NOT already exported
   as Zod schemas from ./generated/api (avoids duplicate-export TS errors).
   CreateContractorBody and CreateContractBody are excluded here because
   api.ts already exports Zod schemas with those same names. */
export type {
  AddDocumentBody,
  Contract,
  ContractDocument,
  Contractor,
  ContractPdfData,
  ContractStageLog,
  ContractStats,
  HealthStatus,
  ListContractorsParams,
  ListContractsParams,
  StageActionBody,
  StageActionBodyAction,
} from "./generated/types";
