import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const userLogsTable = pgTable("user_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  loginName: text("login_name").notNull(),
  loginAt: timestamp("login_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserLog = typeof userLogsTable.$inferSelect;
