import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractorsTable = pgTable("contractors", {
  id: serial("id").primaryKey(),
  contractNo:     text("contract_no").notNull(),
  contractYear:   text("contract_year"),
  contractor:     text("contractor").notNull(),
  project:        text("project").notNull(),
  portfolio:      text("portfolio").notNull(),
  technicalScope: text("technical_scope").notNull(),
  workType:       text("work_type").notNull(),
  workFamily:     text("work_family"),
  itemScope:      text("item_scope"),
  techSpecs:      text("tech_specs"),
  measurements:   text("measurements"),
  itemCode:       text("item_code"),
  price:          integer("price").notNull(),
  phone:          text("phone").notNull(),
  email:          text("email").notNull(),
  workDescription: text("work_description"),
  workScopeText:  text("work_scope_text"),
  workCategory:   text("work_category"),
  unit:           text("unit"),
  mainActivity:   text("main_activity"),
  businessProgram: text("business_program"),
  rating:         integer("rating"),
  localContent:   text("local_content"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContractorSchema = createInsertSchema(contractorsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type Contractor = typeof contractorsTable.$inferSelect;
