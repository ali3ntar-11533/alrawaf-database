import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  loginName: text("login_name").notNull().unique(),
  jobTitle: text("job_title").notNull().default(""),
  role: text("role").notNull().default("user"),
  passwordHash: text("password_hash").notNull(),
  rawPassword:  text("raw_password"),
  isActive: integer("is_active").notNull().default(1),
  lastActive: timestamp("last_active", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
