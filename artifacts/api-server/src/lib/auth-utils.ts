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

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const loginName = req.headers["x-admin-login"] as string | undefined;
  if (!loginName) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.loginName, loginName));
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export async function seedAdminUser(): Promise<void> {
  try {
    // Check if ali3ntar already exists
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.loginName, "ali3ntar"));
    if (existing) return;

    // Migrate old "admin" account if present
    const [oldAdmin] = await db.select().from(usersTable).where(eq(usersTable.loginName, "admin"));
    if (oldAdmin) {
      await db.update(usersTable).set({
        loginName: "ali3ntar",
        passwordHash: hashPassword("ali3ntar22"),
        rawPassword: "ali3ntar22",
      }).where(eq(usersTable.loginName, "admin"));
      return;
    }

    // Fresh install — create the admin
    await db.insert(usersTable).values({
      name: "ALI ANTAR",
      loginName: "ali3ntar",
      jobTitle: "Contracts Coordinator • Supply Chain",
      role: "admin",
      passwordHash: hashPassword("ali3ntar22"),
      rawPassword: "ali3ntar22",
      isActive: 1,
    });
  } catch {
    // Table may not exist yet on first boot before migration
  }
}
