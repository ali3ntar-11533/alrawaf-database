import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

/* ── Master contract record ── */
export const contractsTable = pgTable("contracts", {
  id:             serial("id").primaryKey(),
  contractNo:     text("contract_no").notNull(),
  title:          text("title").notNull(),
  portfolio:      text("portfolio").notNull(),
  project:        text("project").notNull(),
  workType:       text("work_type").notNull(),
  technicalScope: text("technical_scope").notNull(),
  contractValue:  integer("contract_value").notNull().default(0),
  createdBy:      text("created_by").notNull(),
  currentStage:   integer("current_stage").notNull().default(1),
  currentStatus:  text("current_status").notNull().default("pending"),
  /* Per-stage approval statuses: pending | approved | rejected | sealed */
  stage1Status:   text("stage1_status").notNull().default("pending"),
  stage2Status:   text("stage2_status").notNull().default("pending"),
  stage3Status:   text("stage3_status").notNull().default("pending"),
  stage4Status:   text("stage4_status").notNull().default("pending"),
  /* Stage 1 sub-approvals */
  s1SectorApproved:  text("s1_sector_approved").default("pending"),
  s1AuditorSealed:   text("s1_auditor_sealed").default("pending"),
  /* Stage 2 sub-approvals */
  s2CostApproved:    text("s2_cost_approved").default("pending"),
  s2DraftSaved:      text("s2_draft_saved").default("pending"),
  s2FinanceSigned:   text("s2_finance_signed").default("pending"),
  /* Stage 3 sub-approvals */
  s3ComplianceLight: text("s3_compliance_light").default("pending"),
  s3VceoApproved:    text("s3_vceo_approved").default("pending"),
  s3CeoApproved:     text("s3_ceo_approved").default("pending"),
  /* Stage 4 */
  s4ContractorSigned: text("s4_contractor_signed").default("pending"),
  s4ContractorName:   text("s4_contractor_name"),
  s4SignedAt:         text("s4_signed_at"),
  /* Misc */
  budgetAllocated:   integer("budget_allocated").default(0),
  budgetConsumed:    integer("budget_consumed").default(0),
  paymentTerms:      text("payment_terms"),
  guaranteePct:      integer("guarantee_pct").default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Audit trail: every stage action ── */
export const contractStageLogTable = pgTable("contract_stage_log", {
  id:         serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  stage:      integer("stage").notNull(),
  action:     text("action").notNull(),
  adminRole:  text("admin_role").notNull(),
  adminName:  text("admin_name").notNull(),
  note:       text("note"),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Document references ── */
export const contractDocumentsTable = pgTable("contract_documents", {
  id:         serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  docType:    text("doc_type").notNull(),
  fileName:   text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Editable contract clauses ── */
export const contractClausesTable = pgTable("contract_clauses", {
  id:          serial("id").primaryKey(),
  contractId:  integer("contract_id").notNull(),
  clauseOrder: integer("clause_order").notNull(),
  clauseText:  text("clause_text").notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
