import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  contractNo: text("contract_no").notNull().default(""),
  title: text("title").notNull(),
  vendorName: text("vendor_name").notNull(),
  vendorContact: text("vendor_contact").notNull().default(""),
  value: integer("value").notNull().default(0),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  contractType: text("contract_type").notNull().default("خدمات"),
  projectName: text("project_name").notNull().default(""),
  currentStage: integer("current_stage").notNull().default(1),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").notNull().default(""),
  wordFilename: text("word_filename"),
  signedFilename: text("signed_filename"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contractStageLogTable = pgTable("contract_stage_log", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  stage: integer("stage").notNull(),
  action: text("action").notNull(),
  actorRole: text("actor_role").notNull(),
  actorName: text("actor_name").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContractSchema = createInsertSchema(contractsTable).omit({
  id: true,
  contractNo: true,
  currentStage: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStageLogSchema = createInsertSchema(contractStageLogTable).omit({
  id: true,
  createdAt: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
export type ContractStageLog = typeof contractStageLogTable.$inferSelect;
