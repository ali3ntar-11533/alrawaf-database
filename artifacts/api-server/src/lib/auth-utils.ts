import { createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const HASH_SALT = "rawaf_internal_salt_2026";

export function hashPassword(plain: string): string {
  return createHash("sha256").update(plain + HASH_SALT).digest("hex");
}

export function verifyPassword(plain: string, hash: string): boolean {
  return hashPassword(plain) === hash;
}

/** Only superadmin can access the user-management API */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const loginName = req.headers["x-admin-login"] as string | undefined;
  if (!loginName) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.loginName, loginName));
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export async function seedAdminUser(): Promise<void> {
  try {
    // If ali3ntar already exists as superadmin — nothing to do
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.loginName, "ali3ntar"));
    if (existing) {
      // Ensure role is superadmin (in case of old data)
      if (existing.role !== "superadmin") {
        await db.update(usersTable)
          .set({ role: "superadmin" })
          .where(eq(usersTable.loginName, "ali3ntar"));
      }
      return;
    }

    // Migrate legacy "admin" account if present
    const [oldAdmin] = await db.select().from(usersTable).where(eq(usersTable.loginName, "admin"));
    if (oldAdmin) {
      await db.update(usersTable).set({
        loginName: "ali3ntar",
        role: "superadmin",
        passwordHash: hashPassword("ali3ntar22"),
        rawPassword: "ali3ntar22",
      }).where(eq(usersTable.loginName, "admin"));
      return;
    }

    // Fresh install — create the superadmin
    await db.insert(usersTable).values({
      name: "ALI ANTAR",
      loginName: "ali3ntar",
      jobTitle: "Contracts Coordinator • Supply Chain",
      role: "superadmin",
      passwordHash: hashPassword("ali3ntar22"),
      rawPassword: "ali3ntar22",
      isActive: 1,
    });
  } catch {
    // Table may not exist yet on first boot before migration
  }
}
