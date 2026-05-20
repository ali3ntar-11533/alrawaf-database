import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname, join } from "path";
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

/** Resolves the api-server root directory regardless of dev vs prod */
function getApiServerRoot(): string {
  // process.argv[1] is always artifacts/api-server/dist/index.mjs in both dev and prod
  return resolve(dirname(resolve(process.argv[1])), "..");
}

/** Returns path to users-seed.json */
export function getSeedFilePath(): string {
  return join(getApiServerRoot(), "users-seed.json");
}

type SeedUser = {
  name: string;
  loginName: string;
  jobTitle: string;
  role: string;
  rawPassword: string;
  isActive: number;
};

/**
 * Restores any users from users-seed.json that are missing in the database.
 * Runs on every server start — ensures no user is ever permanently lost,
 * even after a fresh deployment or new environment.
 */
export async function seedUsersFromFile(): Promise<void> {
  try {
    const seedFile = getSeedFilePath();
    if (!existsSync(seedFile)) return;
    const raw = readFileSync(seedFile, "utf8");
    const data = JSON.parse(raw) as { users: SeedUser[] };
    if (!Array.isArray(data.users)) return;

    for (const u of data.users) {
      if (!u.loginName || !u.rawPassword) continue;
      const [existing] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.loginName, u.loginName));
      if (!existing) {
        await db.insert(usersTable).values({
          name: u.name,
          loginName: u.loginName,
          jobTitle: u.jobTitle || "",
          role: u.role || "user",
          passwordHash: hashPassword(u.rawPassword),
          rawPassword: u.rawPassword,
          isActive: u.isActive ?? 1,
        });
      }
    }
  } catch {
    // Seed file may not exist in some environments — not a fatal error
  }
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
