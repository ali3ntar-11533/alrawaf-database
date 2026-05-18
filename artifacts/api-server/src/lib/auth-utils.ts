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
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.loginName, "admin"));
    if (!existing) {
      await db.insert(usersTable).values({
        name: "علي عنتر",
        loginName: "admin",
        jobTitle: "المسؤول الرئيسي",
        role: "admin",
        passwordHash: hashPassword("maged@2026"),
        rawPassword: "maged@2026",
        isActive: 1,
      });
    }
  } catch {
    // Table may not exist yet on first boot before migration
  }
}
